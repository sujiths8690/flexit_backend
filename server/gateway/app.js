const express= require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app=express();
const authTarget = process.env.AUTH_SERVICE_URL || "http://auth:3001";
const contentTarget = process.env.CONTENT_SERVICE_URL || "http://content:3002/api";
const userActivityTarget =
  process.env.USER_ACTIVITY_SERVICE_URL || "http://user-activity:3004";

app.use(cors());

app.use((req, res, next) => {
  console.log("🔥 Incoming:", req.method, req.url);
  next();
});

app.use(
  "/api/auth",
  createProxyMiddleware({
    target: authTarget,
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
    target: contentTarget,
    changeOrigin: true,
    pathRewrite: {
      "^/api/content": "",
    },
    logLevel: "debug",
  })
);

// 📊 User Activity
app.use(
  "/api/user-activity",
  createProxyMiddleware({
    target: userActivityTarget,
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
