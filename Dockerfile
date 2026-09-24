FROM python:3.11-slim
# NOTE: pinned dependency versions in requirements.txt (crewai, torch) were
# verified installable as of 2026-08; if a pin 404s in the future, bump it to
# the nearest available release of the same major/minor line.

WORKDIR /app

COPY requirements.txt .

# --with-deps also installs the OS libraries Chromium needs on this slim
# base image; only chromium is pulled (not firefox/webkit) to keep the image
# smaller -- it's still a sizeable addition, needed only for the JS-rendered
# careers-page fallback in tools/web_scraper_tool.py.
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt \
    && playwright install --with-deps chromium

COPY . .

EXPOSE 8000

# uvicorn main:app --host 0.0.0.0 --port 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
