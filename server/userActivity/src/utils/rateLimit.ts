import { Request, Response, NextFunction } from "express";

const buckets = new Map<string, { count: number; resetAt: number }>();

export const createRateLimiter = ({
  windowMs,
  max,
  keyPrefix,
}: {
  windowMs: number;
  max: number;
  keyPrefix: string;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${keyPrefix}:${req.ip || req.socket.remoteAddress || "unknown"}`;
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
