import { createClient, RedisClientType } from "redis";

const DEFAULT_TTL_SECONDS = 60;

let client: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType | null> | null = null;

const redisUrl = () => process.env.REDIS_URL?.trim();

const getClient = async () => {
  const url = redisUrl();
  if (!url) return null;
  if (client?.isOpen) return client;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    try {
      client = createClient({ url });
      client.on("error", (error) => {
        console.error("Redis cache error:", error);
      });
      await client.connect();
      return client;
    } catch (error) {
      console.error("Redis cache connect failed:", error);
      client = null;
      return null;
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
};

export const getCachedJson = async <T>(key: string): Promise<T | null> => {
  try {
    const redis = await getClient();
    if (!redis) return null;
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (error) {
    console.error("Redis cache read failed:", error);
    return null;
  }
};

export const setCachedJson = async (
  key: string,
  value: unknown,
  ttlSeconds = DEFAULT_TTL_SECONDS
) => {
  try {
    const redis = await getClient();
    if (!redis) return;
    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (error) {
    console.error("Redis cache write failed:", error);
  }
};

export const deleteCachedKey = async (key: string) => {
  try {
    const redis = await getClient();
    if (!redis) return;
    await redis.del(key);
  } catch (error) {
    console.error("Redis cache delete failed:", error);
  }
};
