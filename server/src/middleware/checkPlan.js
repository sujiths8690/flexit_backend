export const requireStandard = async (req, res, next) => {
  try {
    const dbName = req.tenantDb;
    const db = getPoolForDB(dbName);

    const [rows] = await db.query(
      "SELECT value FROM settings WHERE key_name = 'plan' LIMIT 1"
    );

    const plan = rows?.[0]?.value;

    if (plan !== 'standard') {
      return res.status(403).json({ error: "standard/Premium plan required" });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: "Plan check failed", details: err.message });
  }
};

export const requirePremium = async (req, res, next) => {
  try {
    const dbName = req.tenantDb;
    const db = getPoolForDB(dbName);

    const [rows] = await db.query(
      "SELECT value FROM settings WHERE key_name = 'plan' LIMIT 1"
    );

    const plan = rows?.[0]?.value;

    if (plan !== 'premium') {
      return res.status(403).json({ error: "Premium plan required" });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: "Plan check failed", details: err.message });
  }
};