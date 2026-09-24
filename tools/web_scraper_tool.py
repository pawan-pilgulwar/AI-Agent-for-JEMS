"""Static-first, Playwright-fallback scraper for public company/job pages.

Used only by the Company Intelligence ingestion flow (`main.py`'s
`/ingest-company`, orchestrating `crews/company_ingestion_crew.py`). Respects
robots.txt, sets a descriptive User-Agent, and rate-limits requests to the
same domain -- never scrapes a page requiring login or behind a paywall (that
is simply out of reach of an unauthenticated `requests`/Playwright session
using only public site navigation).
"""

import logging
import time
import urllib.robotparser
from dataclasses import dataclass, field
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from config import get_settings

logger = logging.getLogger(__name__)

CAREERS_LINK_PATTERNS = ("career", "job", "join-us", "join us", "work-with-us", "opening")
MIN_STATIC_CHARS = 200  # below this, static HTML looks JS-rendered/empty -- try Playwright

_last_request_at: dict[str, float] = {}


@dataclass
class ScrapedPage:
    url: str
    text: str
    links: list[str] = field(default_factory=list)


def _domain(url: str) -> str:
    return urlparse(url).netloc.lower()


# Two-label public suffixes common enough to need the extra label when computing
# a "registrable domain" (e.g. acme.co.uk, not co.uk). Not a full public-suffix-list
# implementation -- good enough to stop careers.acme.com vs acme.com from being
# treated as different companies without over-engineering this.
_TWO_LABEL_SUFFIXES = {"co.uk", "co.in", "co.jp", "com.au", "com.br", "co.nz", "com.sg"}


def registrable_domain(url_or_domain: str) -> str:
    domain = _domain(url_or_domain) if "://" in url_or_domain else url_or_domain.lower()
    labels = domain.split(".")
    if len(labels) <= 2:
        return domain
    if ".".join(labels[-2:]) in _TWO_LABEL_SUFFIXES and len(labels) >= 3:
        return ".".join(labels[-3:])
    return ".".join(labels[-2:])


def same_domain(url: str, reference_url: str) -> bool:
    """True if url is the same site as reference_url, ignoring subdomains
    (careers.acme.com and acme.com are the same company's site)."""
    return registrable_domain(url) == registrable_domain(reference_url)


def _rate_limit(url: str) -> None:
    settings = get_settings()
    domain = _domain(url)
    last = _last_request_at.get(domain)
    now = time.monotonic()
    if last is not None:
        wait = settings.scrape_rate_limit_seconds - (now - last)
        if wait > 0:
            time.sleep(wait)
    _last_request_at[domain] = time.monotonic()


def _robots_allowed(url: str, user_agent: str) -> bool:
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    parser = urllib.robotparser.RobotFileParser()
    parser.set_url(robots_url)
    try:
        parser.read()
    except Exception:
        # robots.txt unreachable/absent -- default to allow; the page fetch
        # itself will fail on its own if the host is actually down.
        return True
    return parser.can_fetch(user_agent, url)


def _clean_text(soup: BeautifulSoup) -> str:
    for tag in soup(["script", "style", "nav", "footer", "header", "noscript", "svg"]):
        tag.decompose()
    lines = (line.strip() for line in soup.get_text(separator="\n").splitlines())
    return "\n".join(line for line in lines if line)


def _extract_links(soup: BeautifulSoup, base_url: str) -> list[str]:
    return [urljoin(base_url, a["href"]) for a in soup.find_all("a", href=True)]


def fetch_static(url: str) -> ScrapedPage | None:
    settings = get_settings()
    if not _robots_allowed(url, settings.scrape_user_agent):
        logger.warning("robots.txt disallows fetching %s", url)
        return None

    _rate_limit(url)
    try:
        response = requests.get(url, headers={"User-Agent": settings.scrape_user_agent}, timeout=15)
        response.raise_for_status()
    except requests.RequestException:
        logger.warning("Static fetch failed for %s", url, exc_info=True)
        return None

    soup = BeautifulSoup(response.text, "html.parser")
    return ScrapedPage(url=url, text=_clean_text(soup), links=_extract_links(soup, url))


def fetch_rendered(url: str) -> ScrapedPage | None:
    """Headless-Chromium fallback for JS-rendered pages -- only invoked when
    fetch_static() returns near-empty content."""
    settings = get_settings()
    if not _robots_allowed(url, settings.scrape_user_agent):
        logger.warning("robots.txt disallows fetching %s", url)
        return None

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        logger.warning("Playwright not installed; cannot render %s", url)
        return None

    _rate_limit(url)
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            try:
                page = browser.new_page(user_agent=settings.scrape_user_agent)
                page.goto(url, timeout=20000, wait_until="networkidle")
                html = page.content()
            finally:
                browser.close()
    except Exception:
        logger.warning("Playwright render failed for %s", url, exc_info=True)
        return None

    soup = BeautifulSoup(html, "html.parser")
    return ScrapedPage(url=url, text=_clean_text(soup), links=_extract_links(soup, url))


def fetch_page(url: str) -> ScrapedPage | None:
    """Static fetch first; falls back to Playwright only if the static
    content looks empty (i.e. the page is JS-rendered)."""
    page = fetch_static(url)
    if page is not None and len(page.text) >= MIN_STATIC_CHARS:
        return page
    return fetch_rendered(url) or page


def discover_careers_link(scraped_home_page: ScrapedPage) -> str | None:
    for link in scraped_home_page.links:
        lowered = link.lower()
        if any(pattern in lowered for pattern in CAREERS_LINK_PATTERNS):
            return link
    return None
