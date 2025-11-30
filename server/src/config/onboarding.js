// onboarding.js
import fs from 'fs';
import path from 'path';
import { adminPool, getPoolForDB } from './databaseManager.js';

const schemaSql = fs.readFileSync(path.join(process.cwd(), 'schema.sql'), 'utf8');

export const createRestaurant = async (req, res) => {
  try {
    // Payload example:
    // { dbName: "restaurant_72_db", displayName: "Cafe ABC", plan: "premium" }
    const { dbName, displayName, plan } = req.body;

    if (!dbName) return res.status(400).json({ error: 'dbName required' });
    if (!plan) return res.status(400).json({ error: 'plan required (basic/mod/premium)' });

    // Create database
    await adminPool.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );

    const pool = getPoolForDB(dbName);

    // Run schema for new DB
    const stmts = schemaSql.split(/;\s*(?=\n|$)/).map(s => s.trim()).filter(Boolean);
    for (const stmt of stmts) {
      await pool.query(stmt);
    }

    // Insert default settings
    await pool.query(
      `INSERT INTO settings (key_name, value)
       VALUES ('display_name', ?), ('plan', ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [displayName || dbName, plan]
    );

    return res.json({ ok: true, dbName, plan });
  } catch (err) {
    console.error('Onboarding error', err);
    return res.status(500).json({ error: 'Onboarding failed', details: err.message });
  }
};
