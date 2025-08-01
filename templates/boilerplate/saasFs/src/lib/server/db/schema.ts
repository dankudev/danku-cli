import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: integer("email_verified", { mode: "boolean" })
		.$defaultFn(() => false)
		.notNull(),
	image: text("image"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	stripeCustomerId: text("stripe_customer_id"),
});

export const sessions = sqliteTable("sessions", {
	id: text("id").primaryKey(),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
	token: text("token").notNull().unique(),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = sqliteTable("accounts", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: integer("access_token_expires_at", {
		mode: "timestamp",
	}),
	refreshTokenExpiresAt: integer("refresh_token_expires_at", {
		mode: "timestamp",
	}),
	scope: text("scope"),
	password: text("password"),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verifications = sqliteTable("verifications", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
	createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
		() => /* @__PURE__ */ new Date(),
	),
	updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
		() => /* @__PURE__ */ new Date(),
	),
});

export const subscriptions = sqliteTable("subscriptions", {
	id: text("id").primaryKey(),
	plan: text("plan").notNull(),
	referenceId: text("reference_id").notNull(),
	stripeCustomerId: text("stripe_customer_id"),
	stripeSubscriptionId: text("stripe_subscription_id"),
	status: text("status").default("incomplete"),
	periodStart: integer("period_start", { mode: "timestamp" }),
	periodEnd: integer("period_end", { mode: "timestamp" }),
	cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" }),
	seats: integer("seats"),
});
