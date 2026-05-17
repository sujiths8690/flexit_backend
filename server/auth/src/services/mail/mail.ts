import nodemailer from "nodemailer";

export const sendResetEmail = async (
  to: string,
  resetLink: string
): Promise<void> => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log(`Password reset link for ${to}: ${resetLink}`);
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
  } catch (error: any) {
    console.error("Password reset email failed:", error?.message ?? error);
    throw new Error("EMAIL_SERVICE_SEND_FAILED");
  }
};
