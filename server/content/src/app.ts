import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import cors from "cors";
import helmet from "helmet";
import path from "path";

import businessRoutes from "./routes/business/business.routes";
import productRoutes from "./routes/product/product.routes";
import categoryRoutes from "./routes/category/category.routes";
import deviceRoutes from "./routes/device/deviceRegistration.routes";
import mediaRoutes from "./routes/media/media.routes";
import contentFeatureRoutes from "./routes/contentFeature/contentFeature.routes";
import { corsOptions, createRateLimiter, securityHeaders } from "./utils/security";

dotenv.config();

if (process.env.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required in production");
  }
  if (!process.env.PAYMENT_JWT_SECRET) {
    throw new Error("PAYMENT_JWT_SECRET is required in production");
  }
}

const app= express();
const server = http.createServer(app);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(createRateLimiter({ windowMs: 60 * 1000, max: 600, keyPrefix: "content" }));

//Middleware
app.use(express.json({ limit: "1mb" }));

app.use("/uploads", express.static("/app/uploads"));

app.use((req, res, next) => {
  console.log("METHOD:", req.method, "URL:", req.originalUrl);
  next();
});

//Routes
app.use("/api/business", businessRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/device", deviceRoutes);
app.use("/api/content/device", deviceRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/menu-content", contentFeatureRoutes);

//root Route
app.get('/', (req,res)=>{
    res.send('Welcome to the flexit API');
})

//creating port
const port= Number(process.env.PORT) || 3002;
server.listen(port, "0.0.0.0", ()=>{
    console.log(`Content Server is running on port ${port} and accessible in LAN`);
});

app.set('trust proxy', true);
