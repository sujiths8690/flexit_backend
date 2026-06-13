// src/app.ts
import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import userActivityRoutes from "./routes/userActivity.routes";

dotenv.config();

if (process.env.NODE_ENV === "production" && !process.env.ADMIN_JWT_SECRET) {
  throw new Error("ADMIN_JWT_SECRET is required in production");
}

const app = express();
app.use(helmet());
app.use(express.json({ limit: "256kb" }));

app.use("/api/user-activity", userActivityRoutes);

const PORT = Number(process.env.PORT) || 3004;

app.listen(PORT, () => {
  console.log(`UserActivity server running on port ${PORT}`);
});
