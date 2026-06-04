import admin from "firebase-admin";

type PushPayload = {
  title: string;
  message: string;
  category?: string;
  notificationId?: number | string;
  data?: Record<string, any>;
};

const firebaseConfigFromEnv = () => {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawJson) {
    const parsed = JSON.parse(rawJson);
    if (parsed.private_key) {
      parsed.private_key = String(parsed.private_key).replace(/\\n/g, "\n");
    }
    return admin.credential.cert(parsed);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    return admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return admin.credential.applicationDefault();
  }

  return null;
};

const firebaseApp = () => {
  if (admin.apps.length > 0) return admin.app();

  const credential = firebaseConfigFromEnv();
  if (!credential) return null;

  return admin.initializeApp({ credential });
};

const stringData = (payload: PushPayload) => {
  const data: Record<string, string> = {
    type: "MOBILE_NOTIFICATION",
    title: payload.title,
    message: payload.message,
    category: payload.category ?? "GENERAL",
  };
  if (payload.notificationId != null) {
    data.notificationId = String(payload.notificationId);
  }
  for (const [key, value] of Object.entries(payload.data ?? {})) {
    if (value == null) continue;
    data[key] = typeof value === "string" ? value : JSON.stringify(value);
  }
  return data;
};

export const sendMobilePush = async (
  tokens: string[],
  payload: PushPayload
) => {
  const uniqueTokens = Array.from(new Set(tokens.filter(Boolean)));
  if (uniqueTokens.length === 0) return { sent: 0, failedTokens: [] as string[] };

  const app = firebaseApp();
  if (!app) {
    console.warn(
      "FCM push skipped: Firebase credentials are not configured for content service."
    );
    return { sent: 0, failedTokens: [] as string[] };
  }

  let sent = 0;
  const failedTokens: string[] = [];
  const messaging = admin.messaging(app);

  for (let i = 0; i < uniqueTokens.length; i += 500) {
    const batch = uniqueTokens.slice(i, i + 500);
    const response = await messaging.sendEachForMulticast({
      tokens: batch,
      notification: {
        title: payload.title,
        body: payload.message,
      },
      data: stringData(payload),
      android: {
        priority: "high",
        notification: {
          channelId: "tex_customer_notifications",
          sound: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
    });

    sent += response.successCount;
    response.responses.forEach((result, index) => {
      if (!result.success) failedTokens.push(batch[index]);
    });
  }

  return { sent, failedTokens };
};
