/** Signup email-verification OTP content. */
export function signupOtpEmail(code: string): { subject: string; html: string; text: string } {
  return {
    subject: `${code} is your Jems verification code`,
    text: `Your Jems verification code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #0f172a;">
        <h1 style="font-size: 20px; margin: 0 0 16px;">Verify your email</h1>
        <p style="font-size: 14px; line-height: 22px; color: #475569; margin: 0 0 24px;">
          Use the code below to verify your email and finish creating your Jems account. It expires in 10 minutes.
        </p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; background: #f1f5f9; border-radius: 12px; padding: 16px; margin: 0 0 24px;">
          ${code}
        </div>
        <p style="font-size: 12px; line-height: 20px; color: #94a3b8; margin: 0;">
          If you didn't try to sign up for Jems, you can safely ignore this email.
        </p>
      </div>
    `,
  };
}

/** Password-reset OTP email content. */
export function otpEmail(code: string): { subject: string; html: string; text: string } {
  return {
    subject: `${code} is your Jems password reset code`,
    text: `Your Jems password reset code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #0f172a;">
        <h1 style="font-size: 20px; margin: 0 0 16px;">Reset your password</h1>
        <p style="font-size: 14px; line-height: 22px; color: #475569; margin: 0 0 24px;">
          Use the code below to reset your Jems password. It expires in 10 minutes.
        </p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; background: #f1f5f9; border-radius: 12px; padding: 16px; margin: 0 0 24px;">
          ${code}
        </div>
        <p style="font-size: 12px; line-height: 20px; color: #94a3b8; margin: 0;">
          If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  };
}
