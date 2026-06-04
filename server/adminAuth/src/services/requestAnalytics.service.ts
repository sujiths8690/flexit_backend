const REQUEST_ANALYTICS_URL =
  process.env.REQUEST_ANALYTICS_URL ||
  "http://gateway:3000/internal/request-analytics";
const REQUEST_ANALYTICS_FALLBACK_URL =
  process.env.REQUEST_ANALYTICS_FALLBACK_URL ||
  "http://localhost:4000/internal/request-analytics";

const REQUEST_ANALYTICS_SECRET =
  process.env.REQUEST_ANALYTICS_INTERNAL_SECRET ||
  "flexit-request-analytics-secret";

export const getRequestAnalytics = async () => {
  const urls = [REQUEST_ANALYTICS_URL, REQUEST_ANALYTICS_FALLBACK_URL].filter(
    (url, index, values) => values.indexOf(url) === index
  );

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          "x-request-analytics-secret": REQUEST_ANALYTICS_SECRET,
        },
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || "REQUEST_ANALYTICS_UNAVAILABLE");
      }

      return body?.data || {};
    } catch {
      // Try the next configured URL. This supports Docker service DNS and local dev.
    }
  }

  throw new Error("REQUEST_ANALYTICS_UNAVAILABLE");
};
