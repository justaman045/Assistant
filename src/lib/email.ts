const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM ?? "noreply@yourdomain.com";

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  await sendEmail(
    to,
    "Welcome to Dashboard — you're all set!",
    `<p>Hi ${name},</p>
<p>Welcome! You've got <strong>50 free credits</strong> to start generating content.</p>
<p>Head to your <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">dashboard</a> to get started.</p>
<p>— The Dashboard Team</p>`
  );
}

export async function sendLowCreditEmail(to: string, name: string, credits: number): Promise<void> {
  await sendEmail(
    to,
    "You're running low on credits",
    `<p>Hi ${name},</p>
<p>You have <strong>${credits} credits</strong> left — enough for about ${Math.floor(credits / 10)} more generations.</p>
<p><a href="${process.env.NEXT_PUBLIC_APP_URL}/billing">Top up your credits</a> to keep generating.</p>
<p>— The Dashboard Team</p>`
  );
}
