import nodemailer from 'nodemailer';

// How codes reach people. Set in server/.env:
//   SMS_PROVIDER    console (default) prints phone codes in this terminal — free, for building and testing
//                   msg91   real SMS through MSG91 (needs MSG91_AUTH_KEY and MSG91_OTP_TEMPLATE_ID)
//   EMAIL_PROVIDER  console (default) prints email codes in this terminal
//                   smtp    real email through any SMTP server (Gmail app password, Brevo free plan…)
export const smsMode = (process.env.SMS_PROVIDER || 'console').toLowerCase();
export const emailMode = (process.env.EMAIL_PROVIDER || 'console').toLowerCase();

if (process.env.NODE_ENV === 'production' && (smsMode === 'console' || emailMode === 'console')) {
  throw new Error('In production SMS_PROVIDER and EMAIL_PROVIDER must send real messages, not print to the console.');
}
if (smsMode === 'msg91' && !(process.env.MSG91_AUTH_KEY && process.env.MSG91_OTP_TEMPLATE_ID)) {
  throw new Error('SMS_PROVIDER=msg91 needs MSG91_AUTH_KEY and MSG91_OTP_TEMPLATE_ID in server/.env');
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

const smsSenders = {
  console: async (phone, code) => {
    console.log(`[OTP] phone +91${phone} -> ${code}`);
  },

  // https://docs.msg91.com/otp/sendotp — we generate the code ourselves and MSG91
  // only delivers it, so the OTP rules in otpService.js stay in one place.
  msg91: async (phone, code) => {
    const url = new URL('https://control.msg91.com/api/v5/otp');
    url.search = new URLSearchParams({
      template_id: process.env.MSG91_OTP_TEMPLATE_ID,
      mobile: `91${phone}`,
      authkey: process.env.MSG91_AUTH_KEY,
      otp: code,
      otp_expiry: '5',
    }).toString();
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(10000) });
    const data = await res.json().catch(() => ({}));
    // MSG91 can answer HTTP 200 with type "error", so check both.
    if (!res.ok || data.type !== 'success') {
      throw new Error(`MSG91 rejected the request (HTTP ${res.status}): ${data.message ?? 'no message'}`);
    }
  },
};

const emailSenders = {
  console: async (email, code) => {
    console.log(`[OTP] email ${email} -> ${code}`);
  },
  smtp: async (email, code) => {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: `${code} is your Kya Khaun? code`,
      text: `Your Kya Khaun? sign-in code is ${code}. It expires in 5 minutes. If you didn't ask for it, you can ignore this email.`,
    });
  },
};

export async function deliverCode(channel, destination, code) {
  const send = channel === 'phone' ? smsSenders[smsMode] : emailSenders[emailMode];
  if (!send) throw new Error(`Unknown ${channel === 'phone' ? 'SMS' : 'EMAIL'}_PROVIDER`);
  await send(destination, code);
}
