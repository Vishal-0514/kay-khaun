import nodemailer from 'nodemailer';

// How password-reset codes reach people. Set in server/.env:
//   EMAIL_PROVIDER  console (default) prints codes in this terminal — free, for building and testing
//                   smtp    real email through any SMTP server (Gmail app password, Brevo free plan…)
export const emailMode = (process.env.EMAIL_PROVIDER || 'console').toLowerCase();

if (process.env.NODE_ENV === 'production' && emailMode === 'console') {
  throw new Error('In production EMAIL_PROVIDER must send real email, not print to the console.');
}
if (emailMode === 'smtp' && !(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)) {
  throw new Error('EMAIL_PROVIDER=smtp needs SMTP_HOST, SMTP_USER and SMTP_PASS in server/.env');
}

const mailer =
  emailMode === 'smtp'
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
    : null;

const emailSenders = {
  console: async (email, code) => {
    console.log(`[Password reset] ${email} -> ${code}`);
  },
  smtp: async (email, code) => {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: `${code} is your Kya Khaun? reset code`,
      text: `Your Kya Khaun? password reset code is ${code}. It expires in 5 minutes. If you didn't ask for it, you can ignore this email — your password stays the same.`,
    });
  },
};

export async function deliverCode(channel, destination, code) {
  const send = channel === 'email' ? emailSenders[emailMode] : null;
  if (!send) throw new Error(`Unknown EMAIL_PROVIDER or channel ${channel}`);
  await send(destination, code);
}
