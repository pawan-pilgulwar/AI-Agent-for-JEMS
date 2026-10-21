# Auth & Signup

## Session / login

Login and session management run through **NextAuth v5** (beta), wired at
`app/api/auth/[...nextauth]/route.ts`.

## Signup flow (student & company)

Multi-step UI in `components/signup/`:

- `SignupShell.tsx` — shared shell/layout for both roles
- `RoleChoice.tsx` — student vs. company selection
- `StepCarousel.tsx` — step progression
- `StudentSignup.tsx` / `CompanySignup.tsx` — role-specific fields
- `VerifiableField.tsx` — inline field verification (e.g. email)
- `OtpModal.tsx` — 6-digit OTP entry UI

### Email verification (OTP)

1. `POST /api/auth/send-signup-otp` — generates a 6-digit OTP
   (`lib/db/signup-otp.ts: createSignupOtp`), stores an HMAC-SHA256 digest
   (keyed by `AUTH_SECRET`) in `signupOtps` with a 10-minute expiry, and
   emails the plaintext code via `lib/email/mailer.ts` +
   `lib/email/templates.ts`.
2. `POST /api/auth/verify-signup-otp` — checks the submitted code against
   the stored digest (`verifySignupOtp`), using a constant-time comparison.
   Max 5 attempts before the code is rejected outright. Marks the record
   `verified` on success.
3. `POST /api/register` — creates the account (`lib/db/users.ts:
   createStudent`). Rate-limited to 5 attempts per IP per 10 minutes
   (`lib/rate-limit.ts`). All body fields are coerced to strings before use
   to prevent NoSQL operator injection.

Only one active OTP exists per email at a time — requesting a new one
overwrites the previous record (`upsert`).

## Password reset

Mirrors the signup-OTP pattern, in `lib/db/password-reset.ts`:

- `POST /api/auth/forgot-password` — issues an OTP to the account email.
- `POST /api/auth/verify-reset-otp` — verifies the OTP.
- `POST /api/auth/reset-password` — sets a new password after verification.

`passwordResets` documents also TTL-expire automatically via the
`expiresAt` index.

## Password hashing

`lib/auth/password.ts` hashes passwords before they're persisted;
`app/api/register/route.ts` also runs password strength validation
(`components/signup/password.ts: evaluatePassword`) using the user's name/
email/phone as disallowed substrings.
