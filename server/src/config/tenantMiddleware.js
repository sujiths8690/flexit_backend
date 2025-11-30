//read db name from header we will crate custom header named 'x-restaurant-db' along with request 
export const tenantFromHeader =(req,res,next) =>{
    const db = req.headers['x-restaurant-db'];

    if(!db) return res.status(400).json({error: 'Missing x-restaurant-db header'});

    req.tenantDb= db; //creating a new key in request object
    next(); //meaning my job is done go to next middleware 
};

//optional reading db name from subdomain(risky exploitation) use only if needed
export const tenantFromSubdomain = (req,res,next) =>{
    const host = req.hostname; //getting hostname from url
    const parts = host.split(".");
    const subdomain = parts.length > 2? parts[0] : null; //extracting the subdomain name
    if(!subdomain) return res.status(400).json({error : "No tenant subdomain found"});
    req.tenantDb = `${subdomain}_db`;
    next();
};

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