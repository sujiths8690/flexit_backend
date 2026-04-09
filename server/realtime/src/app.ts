import http from "http";
import express from "express";
import { WebSocketServer } from "ws";
import { initialize } from "./services/websocketService";
import realtimeRoutes from "./routes/realtime.routes";
import dotenv from "dotenv";

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use("/realtime", realtimeRoutes);

const wss = new WebSocketServer({ server });

initialize(wss);

const PORT = Number(process.env.PORT) || 3003;

server.listen(PORT, () => {
  console.log(`Realtime server running on port ${PORT}`);
});