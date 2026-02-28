import nodemailer from "nodemailer";

export const sendResetEmail = async (
  to: string,
  resetLink: string
): Promise<void> => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: "YourApp <no-reply@yourapp.com>",
    to,
    subject: "Reset your password",
    html: `
      <p>You requested a password reset.</p>
      <p>
        <a href="${resetLink}">
          Reset password
        </a>
      </p>
      <p>This link expires in 15 minutes.</p>
    `,
  });
};
