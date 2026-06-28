require("dotenv").config();
const express= require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { getRequestAnalytics, recordRequest } = require("./requestAnalytics");

const app=express();
const authTarget = process.env.AUTH_SERVICE_URL || "http://auth:3001";
const adminAuthTarget =
  process.env.ADMIN_AUTH_SERVICE_URL || "http://admin-auth:3005";
const contentTarget = process.env.CONTENT_SERVICE_URL || "http://content:3002/api";
const contentUploadsTarget =
  process.env.CONTENT_UPLOADS_SERVICE_URL ||
  contentTarget.replace(/\/api\/?$/, "");
const realtimeTarget = process.env.REALTIME_SERVICE_URL || "http://realtime:3003";
const userActivityTarget =
  process.env.USER_ACTIVITY_SERVICE_URL || "http://user-activity:3004";
const requestAnalyticsSecret =
  process.env.REQUEST_ANALYTICS_INTERNAL_SECRET || "flexit-request-analytics-secret";
const appUpdatesDir = process.env.APP_UPDATES_DIR || path.join(__dirname, "app-updates");

if (
  process.env.NODE_ENV === "production" &&
  !process.env.REQUEST_ANALYTICS_INTERNAL_SECRET
) {
  throw new Error("REQUEST_ANALYTICS_INTERNAL_SECRET is required in production");
}

const defaultOrigins = [
  "https://flexit.online",
  "https://www.flexit.online",
  "https://api.flexit.online",
];
const allowedOrigins = (process.env.CORS_ORIGINS || defaultOrigins.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== "production") return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS origin denied"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use((req, res, next) => {
  res.on("finish", () => recordRequest(req, res.statusCode));
  next();
});

app.get("/internal/request-analytics", (req, res) => {
  if (req.header("x-request-analytics-secret") !== requestAnalyticsSecret) {
    return res.status(401).json({ success: false, error: "unauthorized" });
  }

  return res.json({ success: true, data: getRequestAnalytics() });
});

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
  "/app-updates",
  express.static(appUpdatesDir, {
    fallthrough: false,
    setHeaders(res, filePath) {
      res.setHeader("X-Content-Type-Options", "nosniff");
      if (filePath.endsWith(".json")) {
        res.setHeader("Cache-Control", "no-store");
      } else if (filePath.endsWith(".apk")) {
        res.setHeader("Cache-Control", "private, max-age=300");
        res.setHeader("Content-Type", "application/vnd.android.package-archive");
      }
    },
  })
);

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
    xfwd: true,
    pathRewrite: {
      "^/api/content": "",
    },
    logLevel: "debug",
  })
);

app.use(
  "/uploads",
  createProxyMiddleware({
    target: contentUploadsTarget,
    changeOrigin: true,
    xfwd: true,
    pathRewrite: (path) => `/uploads${path}`,
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
