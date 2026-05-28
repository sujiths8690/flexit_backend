const express= require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app=express();
const authTarget = process.env.AUTH_SERVICE_URL || "http://auth:3001";
const adminAuthTarget =
  process.env.ADMIN_AUTH_SERVICE_URL || "http://admin-auth:3005";
const contentTarget = process.env.CONTENT_SERVICE_URL || "http://content:3002/api";
const realtimeTarget = process.env.REALTIME_SERVICE_URL || "http://realtime:3003";
const userActivityTarget =
  process.env.USER_ACTIVITY_SERVICE_URL || "http://user-activity:3004";

app.use(cors());

app.get(/^\/api\/content\/device\/[^/]+\/config$/, (req, res) => {
  res.status(409).json({
    success: false,
    message: "Device config is delivered through the device websocket only",
  });
});

app.use((req, res, next) => {
  console.log("🔥 Incoming:", req.method, req.url);
  next();
});

app.use(
  "/api/admin-auth",
  createProxyMiddleware({
    target: adminAuthTarget,
    changeOrigin: true,
    pathRewrite: {
      "^/": "/api/admin-auth/",
    },
    logLevel: "debug",
  })
);

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
  "/api/users",
  createProxyMiddleware({
    target: authTarget,
    changeOrigin: true,
    pathRewrite: {
      "^/": "/api/users/",
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
const realtimeWsProxy = createProxyMiddleware({
  target: realtimeTarget,
  changeOrigin: true,
  ws: true,
  pathRewrite: {
    "^/realtime-ws": "",
  },
  logLevel: "debug",
});

app.use("/realtime-ws", realtimeWsProxy);

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

const server = app.listen(3000, () => {
  console.log("Gateway running on port 3000");
});

server.on("upgrade", (req, socket, head) => {
  console.log("WS Upgrade:", req.url);

  if (!req.url || !req.url.startsWith("/realtime-ws")) {
    socket.destroy();
    return;
  }

  realtimeWsProxy.upgrade(req, socket, head);
});
