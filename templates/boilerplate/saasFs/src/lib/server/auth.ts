import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from "$env/static/private";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sveltekitCookies } from "better-auth/svelte-kit";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { PUBLIC_BASE_URL } from "$env/static/public";
import { getRequestEvent } from "$app/server";
import { stripe } from "@better-auth/stripe";
import { betterAuth } from "better-auth";
import * as schema from "./db/schema";
import Stripe from "stripe";

let _auth: Auth | null = null;

const stripeClient = new Stripe(STRIPE_SECRET_KEY);

export const getOrCreateAuth = (db: DrizzleD1Database): Auth => {
	if (!_auth) {
		_auth = betterAuth({
			baseURL: PUBLIC_BASE_URL,
			database: drizzleAdapter(db, {
				provider: "sqlite",
				schema: schema,
				usePlural: true
			}),
			plugins: [
				stripe({
					createCustomerOnSignUp: true,
					stripeClient,
					stripeWebhookSecret: STRIPE_WEBHOOK_SECRET,
					subscription: {
						enabled: true,
						plans: [

						]
					}
				}),
				sveltekitCookies(getRequestEvent)
			]
		});
	}

	return _auth;
};

export type Auth = ReturnType<typeof betterAuth>;
export type User = Auth["$Infer"]["Session"]["user"];
