/**
 * Strong-password evaluation for the signup forms.
 *
 * Beyond the usual length/composition checks, this rejects predictable
 * patterns outright — keyboard walks ("qwerty"), alphabetical or numeric
 * runs ("abcd", "1234", "4321"), repeated characters ("aaaa") and common
 * words ("password"). A password that trips any of these can never be
 * "acceptable", no matter how long, and the UI explains why.
 */

export interface PasswordCheck {
  id: string;
  label: string;
  ok: boolean;
}

export interface PasswordResult {
  checks: PasswordCheck[];
  /** Human-readable reason a forbidden pattern was found, or null. */
  patternWarning: string | null;
  /** 0 (empty) – 4 (very strong). Drives the strength meter. */
  score: number;
  label: string;
  /** True only when every requirement passes — gates the form. */
  acceptable: boolean;
}

const COMMON_WORDS = [
  "password",
  "passw0rd",
  "letmein",
  "welcome",
  "admin",
  "iloveyou",
  "monkey",
  "dragon",
  "sunshine",
  "princess",
  "football",
  "superman",
  "trustno1",
  "qwerty",
  "login",
  "master",
  "hello",
  "jems",
];

const KEYBOARD_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890"];

/**
 * Generic word fragments we ignore when scanning a password for the user's
 * personal info — TLDs, email providers and company suffixes that would
 * otherwise cause noisy false positives ("com", "inc", "gmail"…).
 */
const PERSONAL_STOP = new Set([
  "com", "org", "net", "edu", "gov", "io", "co", "www", "http", "https",
  "inc", "llc", "ltd", "the", "and", "for",
  "gmail", "yahoo", "outlook", "hotmail", "icloud", "proton", "mail", "email",
]);

const lc = (s: string) => s.toLowerCase();

/** Ascending or descending run by char code (abcd, 1234, dcba, 9876). */
function hasSequentialRun(value: string, minLen = 4): boolean {
  const s = lc(value);
  let asc = 1;
  let desc = 1;
  for (let i = 1; i < s.length; i++) {
    const delta = s.charCodeAt(i) - s.charCodeAt(i - 1);
    if (delta === 1) {
      asc += 1;
      desc = 1;
    } else if (delta === -1) {
      desc += 1;
      asc = 1;
    } else {
      asc = 1;
      desc = 1;
    }
    if (asc >= minLen || desc >= minLen) return true;
  }
  return false;
}

/** Adjacent keys on a QWERTY row, forwards or backwards (qwer, rewq, asdf). */
function hasKeyboardRun(value: string, minLen = 4): boolean {
  const s = lc(value).replace(/[^a-z0-9]/g, "");
  if (!s) return false;
  for (const row of KEYBOARD_ROWS) {
    const reversed = [...row].reverse().join("");
    for (let i = 0; i + minLen <= row.length; i++) {
      if (s.includes(row.slice(i, i + minLen))) return true;
      if (s.includes(reversed.slice(i, i + minLen))) return true;
    }
  }
  return false;
}

/** Same character three or more times in a row (aaaa, 1111). */
function hasRepeat(value: string, run = 3): boolean {
  return new RegExp(`(.)\\1{${run - 1},}`).test(value);
}

function hasCommonWord(value: string): boolean {
  const s = lc(value);
  return COMMON_WORDS.some((w) => s.includes(w));
}

/** First forbidden pattern found, as a user-facing sentence — or null. */
function patternWarningFor(value: string): string | null {
  if (!value) return null;
  if (hasSequentialRun(value)) {
    return 'Avoid sequences like "abcd", "1234" or "4321".';
  }
  if (hasKeyboardRun(value)) {
    return 'Avoid keyboard patterns like "qwerty" or "asdf".';
  }
  if (hasRepeat(value)) {
    return 'Avoid repeating one character, like "aaaa".';
  }
  if (hasCommonWord(value)) {
    return 'Avoid common words like "password" or "welcome".';
  }
  return null;
}

/** Break personal info (name, email, company, phone…) into matchable tokens. */
function tokenize(raw: string): string[] {
  return lc(raw)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !PERSONAL_STOP.has(t));
}

/**
 * Reject passwords that embed the user's own info — their name, email,
 * company, phone — or any 4+ character chunk of it. So if the name is
 * "Alexander", "alex" is also off-limits.
 */
function personalInfoWarning(value: string, terms: string[]): string | null {
  if (!value) return null;
  const pw = lc(value);
  for (const raw of terms) {
    if (!raw) continue;
    for (const tok of tokenize(raw)) {
      if (pw.includes(tok)) {
        return `Don't include personal info like "${tok}" in your password.`;
      }
      // Partial chunks of a longer token (e.g. "alex" from "alexander").
      for (let i = 0; i + 4 <= tok.length; i++) {
        const frag = tok.slice(i, i + 4);
        if (pw.includes(frag)) {
          return `Avoid parts of your personal info, like "${frag}".`;
        }
      }
    }
  }
  return null;
}

const STRENGTH_LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"];

/**
 * @param value     the password
 * @param forbidden the user's own entered info (name, email, company, phone…),
 *                  none of which may appear — whole or in part — in the password
 */
export function evaluatePassword(
  value: string,
  forbidden: string[] = [],
): PasswordResult {
  const personalWarning = personalInfoWarning(value, forbidden);
  const patternWarning = patternWarningFor(value);
  // Personal-info matches are the more specific, more useful message first.
  const warning = personalWarning ?? patternWarning;
  const noPattern = patternWarning === null;
  const noPersonal = personalWarning === null;

  const core: PasswordCheck[] = [
    { id: "len", label: "8+ characters", ok: value.length >= 8 },
    {
      id: "case",
      label: "Upper & lowercase",
      ok: /[a-z]/.test(value) && /[A-Z]/.test(value),
    },
    { id: "num", label: "Number", ok: /\d/.test(value) },
    {
      id: "sym",
      label: "Symbol",
      ok: /[^A-Za-z0-9]/.test(value),
    },
  ];

  const checks: PasswordCheck[] = [
    ...core,
    {
      id: "pattern",
      label: "No common patterns",
      ok: value.length > 0 && noPattern,
    },
    {
      id: "personal",
      label: "No personal info",
      ok: value.length > 0 && noPersonal,
    },
  ];

  let score = 0;
  if (value.length > 0) {
    const passedCore = core.filter((c) => c.ok).length; // 0–4
    score = passedCore;
    // A forbidden pattern or embedded personal info caps strength low.
    if (!noPattern || !noPersonal) score = Math.min(score, 1);
    if (passedCore === 4 && noPattern && noPersonal && value.length >= 12) {
      score = 4;
    }
  }

  return {
    checks,
    patternWarning: warning,
    score,
    label: STRENGTH_LABELS[score],
    acceptable: checks.every((c) => c.ok),
  };
}

/** Loose email shape check used to gate the "Verify" button. */
export function isEmailLike(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** A phone is verifiable once it has at least 10 digits. */
export function isPhoneLike(value: string): boolean {
  return value.replace(/\D/g, "").length >= 10;
}
