import { Redis } from "@upstash/redis";

const TTL_SECONDS = 30 * 60;
const LOCK_SECONDS = 120; // longer than any single request; guards against a crashed holder
const MAX_MEMORY_SESSIONS = 1000;

// In-process store for local dev. Map insertion order doubles as LRU order.
function createMemoryStore() {
  const sessions = new Map();
  const locks = new Set();

  return {
    async get(id) {
      const entry = sessions.get(id);
      if (!entry || entry.expiresAt < Date.now()) {
        sessions.delete(id);
        return [];
      }
      return structuredClone(entry.messages);
    },
    async save(id, messages) {
      sessions.delete(id);
      sessions.set(id, { messages: structuredClone(messages), expiresAt: Date.now() + TTL_SECONDS * 1000 });
      if (sessions.size > MAX_MEMORY_SESSIONS) {
        sessions.delete(sessions.keys().next().value);
      }
    },
    async acquire(id) {
      if (locks.has(id)) return false;
      locks.add(id);
      return true;
    },
    async release(id) {
      locks.delete(id);
    },
  };
}

// Shared store for serverless deploys, where instances don't share memory.
function createRedisStore() {
  const redis = Redis.fromEnv();
  const key = (id) => `catchup:session:${id}`;
  const lockKey = (id) => `catchup:lock:${id}`;

  return {
    async get(id) {
      return (await redis.get(key(id))) || [];
    },
    async save(id, messages) {
      await redis.set(key(id), messages, { ex: TTL_SECONDS });
    },
    async acquire(id) {
      return (await redis.set(lockKey(id), 1, { nx: true, ex: LOCK_SECONDS })) === "OK";
    },
    async release(id) {
      await redis.del(lockKey(id));
    },
  };
}

export const sessions = process.env.UPSTASH_REDIS_REST_URL ? createRedisStore() : createMemoryStore();
