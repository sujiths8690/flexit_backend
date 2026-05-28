import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import http from "http";
import adminAuthRoutes from "./routes/adminAuth.routes";
import { seedSuperAdmin } from "./services/seed";

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ success: true, service: "admin-auth" });
});

app.use("/api/admin-auth", adminAuthRoutes);

app.get("/", (_req, res) => {
  res.send("Flexit admin auth service running");
});

const port = Number(process.env.PORT) || 3005;

seedSuperAdmin()
  .then(() => {
    server.listen(port, "0.0.0.0", () => {
      console.log(`Admin auth service running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to seed superadmin", error);
    process.exit(1);
  });
