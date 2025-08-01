import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";

let _db: DrizzleD1Database | null = null;

export const getOrCreateDb = (d1Database: D1Database): DrizzleD1Database => {
	if (!_db) {
		_db = drizzle(d1Database);
	}

	return _db;
};
