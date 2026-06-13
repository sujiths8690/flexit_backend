import nodemailer from "nodemailer";

export const sendResetEmail = async (
  to: string,
  otp: string,
  resetLink: string
): Promise<void> => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error("EMAIL_SERVICE_NOT_CONFIGURED");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: `"flexit" <${process.env.GMAIL_USER}>`,
      to,
      subject: "Your Flexit password reset code",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1f2937">
          <h2>Reset your Flexit password</h2>
          <p>Enter this one-time code on the secure Flexit password reset page:</p>
          <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:24px 0">${otp}</p>
          <p><a href="${resetLink}">Open secure password reset</a></p>
          <p>This code expires in 10 minutes and can only be verified five times.</p>
          <p>If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (error: any) {
    console.error("Password reset email failed:", error?.message ?? error);
    throw new Error("EMAIL_SERVICE_SEND_FAILED");
  }
};
