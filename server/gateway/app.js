const express= require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app=express();

app.use(cors());

app.use((req, res, next) => {
  console.log("🔥 Incoming:", req.method, req.url);
  next();
});

app.use(
  "/api/auth",
  createProxyMiddleware({
    target: "http://auth:3001",
    changeOrigin: true,

    pathRewrite: {
      "^/": "/api/auth/",   // 🔥 ADD BACK PREFIX
    },

    logLevel: "debug",
  })
);

app.use(
  "/api/content",
  createProxyMiddleware({
    target: "http://content:3002/api",  // 🔥 move /api here
    changeOrigin: true,
    logLevel: "debug",
  })
);

// 📊 User Activity
app.use(
  "/api/user-activity",
  createProxyMiddleware({
    target: "http://user-activity:3004",
    changeOrigin: true,

    pathRewrite: {
      "^/": "/api/user-activity/",
    },

    logLevel: "debug",
  })
);

app.get("/", (req, res) => {
  res.send("API Gateway running");
});

app.listen(3000, () => {
  console.log("Gateway running on port 3000");
});