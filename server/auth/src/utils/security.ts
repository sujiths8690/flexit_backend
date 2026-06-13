import { Request, Response, NextFunction } from "express";
import { CorsOptions } from "cors";

const defaultOrigins = [
  "https://flexit.online",
  "https://www.flexit.online",
  "https://api.flexit.online",
];

const allowedOrigins = (process.env.CORS_ORIGINS || defaultOrigins.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isProduction = process.env.NODE_ENV === "production";

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (!isProduction) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS origin denied"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

export const securityHeaders = (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
};

const buckets = new Map<string, { count: number; resetAt: number }>();

export const createRateLimiter = ({
  windowMs,
  max,
  keyPrefix = "global",
}: {
  windowMs: number;
  max: number;
  keyPrefix?: string;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${keyPrefix}:${req.ip}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;
    if (current.count > max) {
      res.status(429).json({ success: false, error: "Too many requests" });
      return;
    }

    next();
  };
};
