import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import cors from "cors";
import path from "path";

import businessRoutes from "./routes/business/business.routes";
import productRoutes from "./routes/product/product.routes";
import categoryRoutes from "./routes/category/category.routes";
import deviceRoutes from "./routes/device/deviceRegistration.routes";
import mediaRoutes from "./routes/media/media.routes";
import contentFeatureRoutes from "./routes/contentFeature/contentFeature.routes";

dotenv.config();

const app= express();
const server = http.createServer(app);

//Enable CORS for all origins
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials:true
}));

//Middleware
app.use(express.json());

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
    res.send('Welcome to the TeXBoard API');
})

//creating port
const port= Number(process.env.PORT) || 3002;
server.listen(port, "0.0.0.0", ()=>{
    console.log(`Content Server is running on port ${port} and accessible in LAN`);
});

app.set('trust proxy', true);
