import WebSocket, { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";

interface ExtendedWebSocket extends WebSocket {
  businessId?: number;
  userId?: number;
  adminId?: number;
  deviceCode?: string;
  isAlive?: boolean;
}

const businessConnections = new Map<number, Set<ExtendedWebSocket>>();
const deviceConnections = new Map<string, Set<ExtendedWebSocket>>();
const adminConnections = new Set<ExtendedWebSocket>();
const latestDeviceMessages = new Map<string, any>();
const deviceHeartbeats = new Map<string, number>();
const DEVICE_ONLINE_TTL_MS = 15000;

let wss: WebSocketServer;

const sendLatestDeviceMessage = (
  ws: ExtendedWebSocket,
  deviceCode: string
) => {
  const latestMessage = latestDeviceMessages.get(deviceCode);
  if (latestMessage && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(latestMessage));
  }
};

const removeConnection = (ws: ExtendedWebSocket) => {
  if (ws.deviceCode !== undefined) {
    const deviceCode = ws.deviceCode;
    const clients = deviceConnections.get(ws.deviceCode);
    clients?.delete(ws);
    if (clients?.size === 0) {
      deviceConnections.delete(ws.deviceCode);
      deviceHeartbeats.delete(ws.deviceCode);
    }
    ws.deviceCode = undefined;
    console.log("Device WS Disconnected:", deviceCode);
  }

  if (ws.businessId !== undefined) {
    const businessId = ws.businessId;
    const clients = businessConnections.get(ws.businessId);
    clients?.delete(ws);
    if (clients?.size === 0) {
      businessConnections.delete(ws.businessId);
    }
    ws.businessId = undefined;
    console.log("WS Disconnected:", businessId);
  }

  if (ws.adminId !== undefined) {
    const adminId = ws.adminId;
    adminConnections.delete(ws);
    ws.adminId = undefined;
    console.log("Admin WS Disconnected:", adminId);
  }
};

export const initialize = (webSocketServer: WebSocketServer) => {
  wss = webSocketServer;

  wss.on("connection", (ws: ExtendedWebSocket, req) => {
    ws.isAlive = true;

    try {
      console.log("WS Connection Attempt:", req.url, req.headers.host);

      const url = new URL(req.url!, `http://${req.headers.host}`);
      const deviceCode = url.searchParams
        .get("deviceCode")
        ?.trim()
        .toUpperCase();

      if (deviceCode) {
        ws.deviceCode = deviceCode;
        deviceHeartbeats.set(deviceCode, Date.now());

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

        sendLatestDeviceMessage(ws, deviceCode);
      } else {
        const authorization = req.headers.authorization;
        const headerToken = authorization?.startsWith("Bearer ")
          ? authorization.slice("Bearer ".length)
          : undefined;
        const token =
          headerToken ||
          url.searchParams.get("adminToken") ||
          url.searchParams.get("token");

        if (!token) {
          console.log("WS Rejected: missing token or deviceCode");
          ws.close();
          return;
        }

        let decoded: any;
        try {
          decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        } catch {
          decoded = jwt.verify(
            token,
            process.env.ADMIN_JWT_SECRET as string
          );
        }

        if (decoded.adminId && decoded.role) {
          ws.adminId = decoded.adminId as number;
          adminConnections.add(ws);
          console.log("Admin WS Connected:", ws.adminId);
          ws.send(JSON.stringify({ type: "ADMIN_WS_CONNECTED" }));
          return;
        }

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

    ws.on("pong", () => {
      ws.isAlive = true;
      if (ws.deviceCode) {
        deviceHeartbeats.set(ws.deviceCode, Date.now());
      }
    });

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === "PING") {
          ws.isAlive = true;
          if (ws.deviceCode) {
            deviceHeartbeats.set(ws.deviceCode, Date.now());
          }
          ws.send(JSON.stringify({ type: "PONG" }));
          return;
        }

        if (message.type === "DEVICE_CONFIG_REQUEST") {
          if (ws.deviceCode) {
            deviceHeartbeats.set(ws.deviceCode, Date.now());
            sendLatestDeviceMessage(ws, ws.deviceCode);
          }
          return;
        }

        if (message.type === "DEVICE_DISCONNECT") {
          removeConnection(ws);
          ws.close();
        }
      } catch {}
    });

    ws.on("close", () => {
      removeConnection(ws);
    });

    ws.on("error", () => {
      removeConnection(ws);
    });
  });

  setInterval(() => {
    wss.clients.forEach((client) => {
      const ws = client as ExtendedWebSocket;

      if (ws.isAlive === false) {
        removeConnection(ws);
        ws.terminate();
        return;
      }

      ws.isAlive = false;
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    });
  }, 10000);
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

export const broadcastToAdmins = (message: any) => {
  const messageStr = JSON.stringify(message);

  adminConnections.forEach((ws) => {
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

export const isDeviceConnected = (deviceCode: string) => {
  const normalizedDeviceCode = deviceCode.trim().toUpperCase();
  const clients = deviceConnections.get(normalizedDeviceCode);
  const lastHeartbeat = deviceHeartbeats.get(normalizedDeviceCode) ?? 0;
  const hasRecentHeartbeat = Date.now() - lastHeartbeat <= DEVICE_ONLINE_TTL_MS;

  if (!clients || !hasRecentHeartbeat) {
    deviceConnections.delete(normalizedDeviceCode);
    deviceHeartbeats.delete(normalizedDeviceCode);
    return false;
  }

  const openClients = [...clients].filter(
    (ws) => ws.readyState === WebSocket.OPEN
  );

  if (openClients.length === 0) {
    deviceConnections.delete(normalizedDeviceCode);
    deviceHeartbeats.delete(normalizedDeviceCode);
    return false;
  }

  return true;
};

export const getDeviceConnectionStatuses = (deviceCodes: string[]) => {
  return deviceCodes.reduce<Record<string, boolean>>((statuses, deviceCode) => {
    const normalizedDeviceCode = deviceCode.trim().toUpperCase();
    statuses[normalizedDeviceCode] = isDeviceConnected(normalizedDeviceCode);
    return statuses;
  }, {});
};
