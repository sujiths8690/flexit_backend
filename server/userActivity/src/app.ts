// src/app.ts
import express from "express";
import dotenv from "dotenv";
import userActivityRoutes from "./routes/userActivity.routes";

dotenv.config();

const app = express();
app.use(express.json());

app.use("/api/user-activity", userActivityRoutes);

const PORT = Number(process.env.PORT) || 3004;

app.listen(PORT, () => {
  console.log(`UserActivity server running on port ${PORT}`);
});