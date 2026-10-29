/** Reapply a migration file. A repeated ADD COLUMN is the ledger's baseline, not a second change. */
export function execIdempotent(db, sql) {
  try {
    db.exec(sql);
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    if (!/duplicate column name/i.test(text)) throw error;
  }
}
