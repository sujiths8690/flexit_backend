import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import cors from "cors";

import businessRoutes from "./routes/business/business.routes";
import productRoutes from "./routes/product/product.routes";
import categoryRoutes from "./routes/category/category.routes";
import deviceRoutes from "./routes/device/deviceRegistration.routes";

dotenv.config();

const app= express();
const server = http.createServer(app);

//Enable CORS for all origins
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials:true
}));

//Middleware
app.use(express.json());


app.use((req, res, next) => {
  console.log("👉 Incoming URL:", req.url);
  next();
});

//Routes
app.use("/api/business", businessRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/device", deviceRoutes);

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