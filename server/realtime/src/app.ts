import http from "http";
import express from "express";
import helmet from "helmet";
import { WebSocketServer } from "ws";
import { initialize } from "./services/websocketService";
import realtimeRoutes from "./routes/realtime.routes";
import dotenv from "dotenv";

dotenv.config();

if (process.env.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required in production");
  }
  if (!process.env.ADMIN_JWT_SECRET) {
    throw new Error("ADMIN_JWT_SECRET is required in production");
  }
  if (!process.env.REALTIME_INTERNAL_SECRET) {
    throw new Error("REALTIME_INTERNAL_SECRET is required in production");
  }
}

import { requestRateLimiter } from "./utils/rateLimit";

const app = express();
const server = http.createServer(app);

app.use(helmet());
app.use(requestRateLimiter);
app.use(express.json({ limit: "256kb" }));
app.use("/realtime", realtimeRoutes);

const wss = new WebSocketServer({ server });

initialize(wss);

const PORT = Number(process.env.PORT) || 3003;

server.listen(PORT, () => {
  console.log(`Realtime server running on port ${PORT}`);
});
