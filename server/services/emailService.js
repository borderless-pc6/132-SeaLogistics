const nodemailer = require("nodemailer");

let sendGridMail = null;
try {
  sendGridMail = require("@sendgrid/mail");
} catch {
  // SendGrid opcional
}

const hasSendGrid = !!(
  process.env.SENDGRID_API_KEY &&
  sendGridMail
);

const hasNodemailer = !!(
  process.env.VITE_EMAIL_USER && process.env.VITE_EMAIL_APP_PASSWORD
);

let transporter = null;
if (hasNodemailer) {
  transporter = nodemailer.createTransport({
    pool: true,
    maxConnections: 1,
    maxMessages: 3,
    rateDelta: 1000,
    rateLimit: 3,
    service: "gmail",
    auth: {
      user: process.env.VITE_EMAIL_USER,
      pass: process.env.VITE_EMAIL_APP_PASSWORD,
    },
  });
}

if (hasSendGrid) {
  sendGridMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log("SendGrid configurado como provedor de email");
} else if (hasNodemailer) {
  console.log("Nodemailer (Gmail) configurado como provedor de email");
} else {
  console.warn("Nenhum provedor de email configurado (SendGrid ou Nodemailer)");
}

async function sendEmail({ to, subject, html, text }) {
  if (hasSendGrid) {
    const fromEmail =
      process.env.SENDGRID_FROM_EMAIL || process.env.VITE_EMAIL_USER;
    const msg = {
      to,
      from: {
        email: fromEmail,
        name: process.env.SENDGRID_FROM_NAME || "Sea Logistics",
      },
      subject,
      html,
      text: text || undefined,
    };
    const [response] = await sendGridMail.send(msg);
    return {
      success: true,
      messageId: response.headers["x-message-id"] || "sendgrid",
      provider: "sendgrid",
    };
  }

  if (hasNodemailer && transporter) {
    const info = await transporter.sendMail({
      from: {
        name: "Sea Logistics",
        address: process.env.VITE_EMAIL_USER,
      },
      to,
      subject,
      html,
      headers: {
        Precedence: "bulk",
        "X-Auto-Response-Suppress": "All",
        "Auto-Submitted": "auto-generated",
      },
    });
    return { success: true, messageId: info.messageId, provider: "nodemailer" };
  }

  throw new Error(
    "Nenhum provedor de email configurado. Configure SENDGRID_API_KEY ou VITE_EMAIL_USER."
  );
}

async function verifyEmailConnection() {
  if (hasSendGrid) {
    return { success: true, provider: "sendgrid" };
  }
  if (hasNodemailer && transporter) {
    await transporter.verify();
    return { success: true, provider: "nodemailer" };
  }
  throw new Error("Nenhum provedor de email configurado");
}

function getEmailProviderInfo() {
  return {
    sendgrid: hasSendGrid,
    nodemailer: hasNodemailer,
    provider: hasSendGrid ? "sendgrid" : hasNodemailer ? "nodemailer" : null,
  };
}

module.exports = {
  sendEmail,
  verifyEmailConnection,
  getEmailProviderInfo,
};
