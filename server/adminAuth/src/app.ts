import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import http from "http";
import adminAuthRoutes from "./routes/adminAuth.routes";
import { seedSuperAdmin } from "./services/seed";
import { corsOptions, createRateLimiter, securityHeaders } from "./utils/security";

dotenv.config();

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required in production");
}

const app = express();
const server = http.createServer(app);

app.use(helmet());
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(createRateLimiter({ windowMs: 60 * 1000, max: 180, keyPrefix: "admin-auth" }));
app.use(express.json({ limit: "1mb" }));

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
