import nodemailer from "nodemailer";

export type DemoRequest = {
  businessName: string;
  name: string;
  email: string;
  phone: string;
  tvScreens: string;
  message?: string;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const createTransporter = () => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error("EMAIL_SERVICE_NOT_CONFIGURED");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

export const sendResetEmail = async (
  to: string,
  otp: string,
  resetLink: string
): Promise<void> => {
  const transporter = createTransporter();

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

export const sendDemoRequestEmail = async (
  request: DemoRequest
): Promise<void> => {
  const transporter = createTransporter();
  const destination =
    process.env.DEMO_REQUEST_EMAIL || "flexitontv@gmail.com";
  const message = request.message?.trim() || "No additional message";

  try {
    await transporter.sendMail({
      from: `"Flexit Website" <${process.env.GMAIL_USER}>`,
      to: destination,
      replyTo: request.email,
      subject: `Demo request from ${request.businessName}`,
      text: [
        `Business: ${request.businessName}`,
        `Name: ${request.name}`,
        `Email: ${request.email}`,
        `Phone: ${request.phone}`,
        `TV screens: ${request.tvScreens}`,
        `Message: ${message}`,
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#1f2937">
          <h2>New Flexit demo request</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px;font-weight:700">Business</td><td style="padding:8px">${escapeHtml(request.businessName)}</td></tr>
            <tr><td style="padding:8px;font-weight:700">Name</td><td style="padding:8px">${escapeHtml(request.name)}</td></tr>
            <tr><td style="padding:8px;font-weight:700">Email</td><td style="padding:8px">${escapeHtml(request.email)}</td></tr>
            <tr><td style="padding:8px;font-weight:700">Phone</td><td style="padding:8px">${escapeHtml(request.phone)}</td></tr>
            <tr><td style="padding:8px;font-weight:700">TV screens</td><td style="padding:8px">${escapeHtml(request.tvScreens)}</td></tr>
          </table>
          <h3>Message</h3>
          <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
        </div>
      `,
    });
  } catch (error: any) {
    console.error("Demo request email failed:", error?.message ?? error);
    throw new Error("EMAIL_SERVICE_SEND_FAILED");
  }
};
