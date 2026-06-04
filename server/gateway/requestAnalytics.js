const MAX_USER_BUCKETS = 500;
const MAX_ENDPOINT_BUCKETS = 300;

const endpointCounts = new Map();
const userCounts = new Map();

const pad = (value) => String(value).padStart(2, "0");

const bucketsFor = (date = new Date()) => ({
  day: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
  month: `${date.getFullYear()}-${pad(date.getMonth() + 1)}`,
  year: `${date.getFullYear()}`,
});

const decodeJwtPayload = (token) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
  } catch {
    return null;
  }
};

const userFromRequest = (req) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  const payload = token ? decodeJwtPayload(token) : null;
  if (payload?.adminId) {
    return {
      id: `admin:${payload.adminId}`,
      label: `Admin ${payload.adminId}`,
      role: payload.role || "ADMIN",
    };
  }
  if (payload?.userId) {
    const businessPart = payload.businessId ? ` / Business ${payload.businessId}` : "";
    return {
      id: `user:${payload.userId}`,
      label: `User ${payload.userId}${businessPart}`,
      role: payload.role || "USER",
    };
  }
  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : String(forwarded || req.socket.remoteAddress || "unknown").split(",")[0].trim();
  return { id: `ip:${ip}`, label: ip, role: "UNKNOWN" };
};

const normalizedEndpoint = (req) => {
  const path = req.originalUrl.split("?")[0];
  const parts = path.split("/").filter(Boolean);
  if (parts[0] !== "api") return `${req.method} /${parts[0] || ""}`;

  const normalizedParts = parts.map((part, index) => {
    if (index <= 1) return part;
    if (/^\d+$/.test(part)) return ":id";
    if (/^[0-9a-f]{8,}$/i.test(part)) return ":id";
    if (/^[A-Z0-9]{6,}$/i.test(part) && index > 2) return ":code";
    return part;
  });
  return `${req.method} /${normalizedParts.join("/")}`;
};

const trimMap = (map, maxSize) => {
  if (map.size <= maxSize) return;
  const removable = map.size - maxSize;
  let removed = 0;
  for (const key of map.keys()) {
    map.delete(key);
    removed += 1;
    if (removed >= removable) break;
  }
};

const incrementMetric = (map, key, seed, bucket) => {
  const metric = map.get(key) || {
    ...seed,
    day: {},
    month: {},
    year: {},
    total: 0,
  };
  metric.day[bucket.day] = (metric.day[bucket.day] || 0) + 1;
  metric.month[bucket.month] = (metric.month[bucket.month] || 0) + 1;
  metric.year[bucket.year] = (metric.year[bucket.year] || 0) + 1;
  metric.total += 1;
  metric.lastSeenAt = new Date().toISOString();
  map.set(key, metric);
};

const incrementUserEndpointMetric = (userMetric, endpoint, bucket) => {
  userMetric.endpoints = userMetric.endpoints || {};
  const metric = userMetric.endpoints[endpoint] || {
    endpoint,
    day: {},
    month: {},
    year: {},
    total: 0,
  };
  metric.day[bucket.day] = (metric.day[bucket.day] || 0) + 1;
  metric.month[bucket.month] = (metric.month[bucket.month] || 0) + 1;
  metric.year[bucket.year] = (metric.year[bucket.year] || 0) + 1;
  metric.total += 1;
  userMetric.endpoints[endpoint] = metric;
};

const recordRequest = (req, statusCode) => {
  if (!req.originalUrl.startsWith("/api/")) return;

  const bucket = bucketsFor();
  const endpoint = normalizedEndpoint(req);
  const user = userFromRequest(req);

  incrementMetric(
    endpointCounts,
    endpoint,
    { endpoint, method: req.method, statusCode },
    bucket
  );
  incrementMetric(userCounts, user.id, user, bucket);
  const userMetric = userCounts.get(user.id);
  if (userMetric) incrementUserEndpointMetric(userMetric, endpoint, bucket);

  trimMap(endpointCounts, MAX_ENDPOINT_BUCKETS);
  trimMap(userCounts, MAX_USER_BUCKETS);
};

const seriesFor = (period, bucketKey) =>
  [...endpointCounts.values()]
    .map((metric) => ({
      endpoint: metric.endpoint,
      count: metric[period][bucketKey] || 0,
    }))
    .filter((metric) => metric.count > 0)
    .sort((a, b) => b.count - a.count || a.endpoint.localeCompare(b.endpoint));

const userEndpointSeriesFor = (metric, period, bucketKey) =>
  Object.values(metric.endpoints || {})
    .map((endpointMetric) => ({
      endpoint: endpointMetric.endpoint,
      count: endpointMetric[period][bucketKey] || 0,
    }))
    .filter((endpointMetric) => endpointMetric.count > 0)
    .sort((a, b) => b.count - a.count || a.endpoint.localeCompare(b.endpoint));

const getRequestAnalytics = () => {
  const bucket = bucketsFor();
  const dangerousUsers = [...userCounts.values()]
    .map((metric) => ({
      id: metric.id,
      label: metric.label,
      role: metric.role,
      today: metric.day[bucket.day] || 0,
      month: metric.month[bucket.month] || 0,
      year: metric.year[bucket.year] || 0,
      total: metric.total,
      lastSeenAt: metric.lastSeenAt,
    }))
    .filter((metric) => metric.today > 0 || metric.month > 0 || metric.year > 0)
    .sort((a, b) => b.today - a.today || b.month - a.month || b.year - a.year)
    .slice(0, 5)
    .sort((a, b) => a.today - b.today || a.month - b.month || a.year - b.year);

  return {
    generatedAt: new Date().toISOString(),
    totalRequests: [...endpointCounts.values()].reduce(
      (sum, metric) => sum + metric.total,
      0
    ),
    currentDay: {
      bucket: bucket.day,
      endpoints: seriesFor("day", bucket.day),
    },
    currentMonth: {
      bucket: bucket.month,
      endpoints: seriesFor("month", bucket.month),
    },
    currentYear: {
      bucket: bucket.year,
      endpoints: seriesFor("year", bucket.year),
    },
    dangerousUsers,
    users: [...userCounts.values()].map((metric) => ({
      id: metric.id,
      label: metric.label,
      role: metric.role,
      today: metric.day[bucket.day] || 0,
      month: metric.month[bucket.month] || 0,
      year: metric.year[bucket.year] || 0,
      total: metric.total,
      lastSeenAt: metric.lastSeenAt,
      currentDay: {
        bucket: bucket.day,
        endpoints: userEndpointSeriesFor(metric, "day", bucket.day),
      },
      currentMonth: {
        bucket: bucket.month,
        endpoints: userEndpointSeriesFor(metric, "month", bucket.month),
      },
      currentYear: {
        bucket: bucket.year,
        endpoints: userEndpointSeriesFor(metric, "year", bucket.year),
      },
    })),
  };
};

module.exports = {
  getRequestAnalytics,
  recordRequest,
};
