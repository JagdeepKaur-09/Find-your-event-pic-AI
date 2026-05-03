function createRateLimiter({ windowMs, max, message }) {
  const buckets = new Map();

  return (req, res, next) => {
    const forwardedFor = req.headers["x-forwarded-for"];
    const key = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : (forwardedFor || req.ip || "unknown");
    const now = Date.now();
    const recentHits = (buckets.get(key) || []).filter((timestamp) => now - timestamp < windowMs);

    recentHits.push(now);
    buckets.set(key, recentHits);

    if (recentHits.length > max) {
      return res.status(429).json(message);
    }

    next();
  };
}

module.exports = { createRateLimiter };
