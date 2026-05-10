import WebSocket, { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";

interface ExtendedWebSocket extends WebSocket {
  businessId?: number;
  userId?: number;
  deviceCode?: string;
}

const businessConnections = new Map<number, Set<ExtendedWebSocket>>();
const deviceConnections = new Map<string, Set<ExtendedWebSocket>>();
const latestDeviceMessages = new Map<string, any>();

let wss: WebSocketServer;

export const initialize = (webSocketServer: WebSocketServer) => {
  wss = webSocketServer;

  wss.on("connection", (ws: ExtendedWebSocket, req) => {
    try {
      console.log("WS Connection Attempt:", req.url, req.headers.host);

      const url = new URL(req.url!, `http://${req.headers.host}`);
      const deviceCode = url.searchParams
        .get("deviceCode")
        ?.trim()
        .toUpperCase();

      if (deviceCode) {
        ws.deviceCode = deviceCode;

        if (!deviceConnections.has(deviceCode)) {
          deviceConnections.set(deviceCode, new Set());
        }

        deviceConnections.get(deviceCode)!.add(ws);
        console.log("Device WS Connected:", deviceCode);
        ws.send(
          JSON.stringify({
            type: "DEVICE_WS_CONNECTED",
            data: { deviceCode },
          })
        );

        const latestMessage = latestDeviceMessages.get(deviceCode);
        if (latestMessage) {
          ws.send(JSON.stringify(latestMessage));
        }
      } else {
        const token = url.searchParams.get("token");

        if (!token) {
          console.log("WS Rejected: missing token or deviceCode");
          ws.close();
          return;
        }

        const decoded: any = jwt.verify(
          token,
          process.env.JWT_SECRET as string
        );

        if (!decoded.businessId || !decoded.userId) {
          console.log("WS Rejected: token missing businessId or userId");
          ws.close();
          return;
        }

        const businessId = decoded.businessId as number;
        const userId = decoded.userId as number;

        ws.businessId = businessId;
        ws.userId = userId;

        console.log("WS Connected:", businessId);

        if (!businessConnections.has(businessId)) {
          businessConnections.set(businessId, new Set());
        }

        businessConnections.get(businessId)!.add(ws);
      }
    } catch (error) {
      console.log("WS Rejected:", error instanceof Error ? error.message : error);
      ws.close();
      return;
    }

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === "PING") {
          ws.send(JSON.stringify({ type: "PONG" }));
        }
      } catch {}
    });

    ws.on("close", () => {
      if (ws.deviceCode !== undefined) {
        deviceConnections.get(ws.deviceCode)?.delete(ws);
        console.log("Device WS Disconnected:", ws.deviceCode);
      }

      if (ws.businessId !== undefined) {
        businessConnections.get(ws.businessId)?.delete(ws);
        console.log("WS Disconnected:", ws.businessId);
      }
    });
  });

  setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
      }
    });
  }, 30000);
};

export const broadcastToBusiness = (businessId: number, message: any) => {
  const clients = businessConnections.get(businessId);

  if (!clients) return;

  const messageStr = JSON.stringify(message);

  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
};

export const broadcastToDevice = (deviceCode: string, message: any) => {
  const normalizedDeviceCode = deviceCode.trim().toUpperCase();
  latestDeviceMessages.set(normalizedDeviceCode, message);

  const clients = deviceConnections.get(normalizedDeviceCode);
  const clientCount = [...(clients ?? [])].filter(
    (ws) => ws.readyState === WebSocket.OPEN
  ).length;

  console.log(
    "Device WS Broadcast:",
    normalizedDeviceCode,
    message?.type,
    `clients=${clientCount}`
  );

  if (!clients) return;

  const messageStr = JSON.stringify(message);

  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
};
