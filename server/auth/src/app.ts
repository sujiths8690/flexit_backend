import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./routes/auth/auth.routes";
import userRoutes from "./routes/user/user.routes";
import { corsOptions, createRateLimiter, securityHeaders } from "./utils/security";

dotenv.config();

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required in production");
}

const app= express();
const server = http.createServer(app);

app.use(helmet());
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(createRateLimiter({ windowMs: 60 * 1000, max: 300, keyPrefix: "auth" }));

//Middleware
app.use(express.json({ limit: "1mb" }));

//Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);


//root Route
app.get('/', (req,res)=>{
    res.send('Welcome to the flexit API');
})

//creating port
const port= Number(process.env.PORT) || 3001;
server.listen(port, "0.0.0.0", ()=>{
    console.log(`Auth server is running on port ${port} and accessible in LAN`);
});

app.set('trust proxy', true);
