import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import cors from "cors";

import authRoutes from "./routes/auth/auth.routes";
import userRoutes from "./routes/user/user.routes";

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

//Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);


//root Route
app.get('/', (req,res)=>{
    res.send('Welcome to the TeXBoard API');
})

//creating port
const port= Number(process.env.PORT) || 3001;
server.listen(port, "0.0.0.0", ()=>{
    console.log(`Auth server is running on port ${port} and accessible in LAN`);
});

app.set('trust proxy', true);