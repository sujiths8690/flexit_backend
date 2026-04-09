import WebSocket, { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";

interface ExtendedWebSocket extends WebSocket {
  businessId?: number;
  userId?: number;
}

const businessConnections = new Map<number, Set<ExtendedWebSocket>>();

let wss: WebSocketServer;

export const initialize = (webSocketServer: WebSocketServer) => {
  wss = webSocketServer;

  wss.on("connection", (ws: ExtendedWebSocket, req) => {
    try {
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const token = url.searchParams.get("token");

      if (!token) {
        ws.close();
        return;
      }

      const decoded: any = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      );

      // 🔐 Validate token
      if (!decoded.businessId || !decoded.userId) {
        ws.close();
        return;
      }

      // ✅ Extract safe values
      const businessId = decoded.businessId as number;
      const userId = decoded.userId as number;

      // ✅ Assign ONCE
      ws.businessId = businessId;
      ws.userId = userId;

      console.log("✅ WS Connected:", businessId);

      // 🔥 Add to business group
      if (!businessConnections.has(businessId)) {
        businessConnections.set(businessId, new Set());
      }

      businessConnections.get(businessId)!.add(ws);

    } catch {
      ws.close();
      return;
    }

    // 📩 Handle messages
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === "PING") {
          ws.send(JSON.stringify({ type: "PONG" }));
        }
      } catch {}
    });

    // ❌ Cleanup
    ws.on("close", () => {
      if (ws.businessId !== undefined) {
        businessConnections.get(ws.businessId)?.delete(ws);
        console.log("❌ WS Disconnected:", ws.businessId);
      }
    });
  });

  // ❤️ Heartbeat
  setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
      }
    });
  }, 30000);
};


// 🚀 Broadcast
export const broadcastToBusiness = (
  businessId: number,
  message: any
) => {
  const clients = businessConnections.get(businessId);

  if (!clients) return;

  const messageStr = JSON.stringify(message);

  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
};