import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "sqlite",
	out: "./src/lib/server/db/migrations",
	schema: "./src/lib/server/db/schema.ts"
});
