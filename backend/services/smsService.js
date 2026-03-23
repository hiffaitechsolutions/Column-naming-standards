import twilio from 'twilio';

// Configure via environment variables:
//   TWILIO_ACCOUNT_SID   your Twilio account SID
//   TWILIO_AUTH_TOKEN    your Twilio auth token
//   TWILIO_PHONE_NUMBER  your Twilio phone number e.g. +15551234567

let client;

function getClient() {
  if (!client) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
    }
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
}

export async function sendSmsOtp(phoneNumber, otp) {
  const c = getClient();
  await c.messages.create({
    body: `Your DataValidation verification code is: ${otp}. Expires in 10 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to:   phoneNumber,
  });
}

export default { sendSmsOtp };