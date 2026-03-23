import { Resend } from 'resend';

// Get your API key from https://resend.com/api-keys
// Add to .env: RESEND_API_KEY=re_xxxxxxxxxxxx
// Add to .env: EMAIL_FROM=DataValidation <no-reply@yourdomain.com>
//
// IMPORTANT: In Resend you must verify your domain to send from a custom address.
// Until your domain is verified, use: onboarding@resend.dev (only sends to your own email)

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = process.env.EMAIL_FROM || 'DataValidation <onboarding@resend.dev>';

// ── Email templates ───────────────────────────────────────────────────────────

function otpTemplate(name, otp) {
  return {
    subject: 'Verify your DataValidation account',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">DataValidation</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 32px;">
            <p style="margin:0 0 8px;color:#1a1a1a;font-size:22px;font-weight:600;">Verify your email</p>
            <p style="margin:0 0 32px;color:#6b7280;font-size:15px;line-height:1.6;">
              Hi ${name}, use the code below to verify your email address. It expires in <strong>10 minutes</strong>.
            </p>

            <!-- OTP Box -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding:24px;background:#f0f4ff;border-radius:10px;">
                <span style="font-size:42px;font-weight:700;letter-spacing:16px;color:#4f46e5;font-family:'Courier New',monospace;">${otp}</span>
              </td></tr>
            </table>

            <p style="margin:32px 0 0;color:#9ca3af;font-size:13px;line-height:1.6;">
              If you didn't create a DataValidation account, you can safely ignore this email. This code will expire automatically.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center;">
            <p style="margin:0;color:#d1d5db;font-size:12px;">© ${new Date().getFullYear()} DataValidation. All rights reserved.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

function welcomeTemplate(name) {
  return {
    subject: 'Welcome to DataValidation! 🎉',
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">DataValidation</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 32px;">
            <p style="margin:0 0 8px;color:#1a1a1a;font-size:22px;font-weight:600;">Welcome aboard, ${name}! 🎉</p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
              Your email has been verified and your account is now active. You're ready to start validating your data.
            </p>
            <table cellpadding="0" cellspacing="0">
              <tr><td style="background:#4f46e5;border-radius:8px;padding:12px 28px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Go to Dashboard →</a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center;">
            <p style="margin:0;color:#d1d5db;font-size:12px;">© ${new Date().getFullYear()} DataValidation. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

function passwordChangedTemplate(name) {
  return {
    subject: 'Your DataValidation password was changed',
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">DataValidation</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 32px;">
            <p style="margin:0 0 8px;color:#1a1a1a;font-size:22px;font-weight:600;">Password changed</p>
            <p style="margin:0;color:#6b7280;font-size:15px;line-height:1.6;">
              Hi ${name}, your password was recently changed. If this wasn't you, please contact support immediately at
              <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@yourdomain.com'}" style="color:#4f46e5;">${process.env.SUPPORT_EMAIL || 'support@yourdomain.com'}</a>.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center;">
            <p style="margin:0;color:#d1d5db;font-size:12px;">© ${new Date().getFullYear()} DataValidation. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

// ── Send functions ────────────────────────────────────────────────────────────

export async function sendEmailOtp(to, name, otp) {
  const { subject, html } = otpTemplate(name, otp);
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) throw new Error(`Failed to send OTP email: ${error.message}`);
}

export async function sendWelcomeEmail(to, name) {
  const { subject, html } = welcomeTemplate(name);
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) console.error('Failed to send welcome email:', error.message); // non-critical
}

export async function sendPasswordChangedEmail(to, name) {
  const { subject, html } = passwordChangedTemplate(name);
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) console.error('Failed to send password changed email:', error.message); // non-critical
}

export default { sendEmailOtp, sendWelcomeEmail, sendPasswordChangedEmail };