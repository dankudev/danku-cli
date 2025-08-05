import { Args } from "@oclif/core";
import { type } from "arktype";
import { parse } from "jsonc-parser";
import Crypto from "node:crypto";
import * as fs from "node:fs/promises";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import { stringify } from "yaml";

import BaseCommand from "../base-command.js";
import { Config, configSchema } from "../types.js";

export default class New extends BaseCommand {
	static override args = {
		name: Args.string({
			description: "Name of a new SvelteKit project to create",
			required: true
		})
	};
	static override description =
		"Creates a new SvelteKit project with git provider setup and integrated deployment, automatically configuring your chosen platform and creating a repository";

	// eslint-disable-next-line complexity
	public async run(): Promise<void> {
		const { args } = await this.parse(New);

		let config: Config = {
			boilerplate: {},
			deploymentTarget: {
				cloudFlare: {
					accountId: "",
					token: "",
					url: new URL("https://my-cute-website.com")
				}
			},
			gitProvider: {
				gitHub: {
					token: ""
				}
			}
		};

		try {
			const configPath = join(homedir(), ".danku", "cli", "node", "config.jsonc");
			const rawConfig = await fs.readFile(configPath, "utf8");
			const parsedConfig = parse(rawConfig);
			const result = configSchema(parsedConfig);
			if (result instanceof type.errors) {
				const errorMessages = result.map((error) => `${error.path}: ${error.message}`).join(", ");
				this.error(`Configuration validation failed: ${errorMessages}`);
			}

			config = result;

			const repositoryExists = await this.gitRepositoryExists(config, args.name);
			if (typeof repositoryExists === "string") {
				this.error(repositoryExists);
			}

			if (repositoryExists) {
				this.error(`Repository ${args.name} already exists`);
			}

			const resourceExists = await this.targetResourceExists(config, args.name);
			if (typeof resourceExists === "string") {
				this.error(resourceExists);
			}

			if (resourceExists) {
				this.error(`Resource ${args.name} already exists`);
			}
		} catch (error) {
			if (error instanceof Error) {
				this.error(`Configuration parsing failed: ${error.message}`);
			}
		}

		let directoryExists = true;
		try {
			await fs.access(join(process.cwd(), args.name));
		} catch {
			directoryExists = false;
		}

		if (directoryExists) {
			this.error(`Directory ${args.name} already exists`);
		}

		this.log(`DANKU🧊 Creating a new SvelteKit project "${args.name}"`);

		// 1. Create a new git repo
		const createRepository = await this.gitCreateRepository(config, args.name);
		if (!createRepository.startsWith("https://")) {
			this.error(createRepository);
		}

		// 2. Create SvelteKit project
		await this.executeCommand("pnpm dlx", [
			"sv",
			"create",
			"--template",
			"minimal",
			"--types",
			"ts",
			"--no-add-ons",
			"--install pnpm",
			args.name
		]);

		// 3. Add vite-plugin-devtools-json, ESLint, Playwright, Prettier, TailwindCSS, and Vitest
		await this.executeCommand("pnpm dlx", ["sv", "add", "devtools-json", "--install pnpm", "--cwd", args.name]);
		await this.executeCommand("pnpm dlx", ["sv", "add", "eslint", "--install pnpm", "--cwd", args.name]);
		await this.executeCommand("pnpm dlx", ["sv", "add", "playwright", "--install pnpm", "--cwd", args.name]);
		await this.executeCommand("pnpm dlx", ["sv", "add", "prettier", "--install pnpm", "--cwd", args.name]);
		await this.executeCommand("pnpm dlx", [
			"sv",
			"add",
			'tailwindcss="plugins:typography,forms"',
			"--install pnpm",
			"--cwd",
			args.name
		]);
		await this.executeCommand("pnpm dlx", [
			"sv",
			"add",
			'vitest="usages:unit,component"',
			"--install pnpm",
			"--cwd",
			args.name
		]);

		// 4. Add default boilerplate
		await this.copyTemplateFiles("boilerplate/default", args.name);

		const sharedBetweenMarketingAndSaasFs = async () => {
			const addOrUpdateEnvVariableBaseUrl = await this.gitAddOrUpdateEnvVariable(
				config,
				args.name,
				"BASE_URL",
				"http://localhost:5173",
				config.deploymentTarget.cloudFlare!.url.origin // todo update this
			);
			if (typeof addOrUpdateEnvVariableBaseUrl === "string") {
				this.error(addOrUpdateEnvVariableBaseUrl);
			}

			const addOrUpdateEnvVariablePostHogApiKey = await this.gitAddOrUpdateEnvVariable(
				config,
				args.name,
				"POSTHOG_API_KEY",
				"",
				config.boilerplate.marketing?.postHogApiKey || config.boilerplate.saasFs?.postHogApiKey || ""
			);
			if (typeof addOrUpdateEnvVariablePostHogApiKey === "string") {
				this.error(addOrUpdateEnvVariablePostHogApiKey);
			}

			const createPostHogReverseProxy = await this.targetCreatePostHogReverseProxy(config);
			if (typeof createPostHogReverseProxy === "string") {
				this.error(createPostHogReverseProxy);
			}

			await this.copyTemplateFiles("boilerplate/marketing", args.name);
			await fs.unlink(join(process.cwd(), args.name, "static", "robots.txt"));

			const layoutFilePath = join(process.cwd(), args.name, "src", "routes", "+layout.ts");
			let layoutData = await fs.readFile(layoutFilePath, "utf8");
			layoutData = layoutData.replace('apiHost = "DANKU";', `apiHost = "${createPostHogReverseProxy}";`);
			await fs.writeFile(layoutFilePath, layoutData, "utf8");

			const svelteConfigFilePath = join(process.cwd(), args.name, "svelte.config.js");
			let svelteConfigData = await fs.readFile(svelteConfigFilePath, "utf8");
			svelteConfigData = svelteConfigData.replace(
				"adapter: adapter()",
				`adapter: adapter(),
   paths: {
     relative: false
   }`
			);
			await fs.writeFile(svelteConfigFilePath, svelteConfigData, "utf8");

			await this.executeCommand("pnpm", ["add", "posthog-js"], { cwd: args.name });
		};

		// 5. Add marketing boilerplate if needed
		if (config.boilerplate.marketing) {
			await sharedBetweenMarketingAndSaasFs();
		}

		// 6. Add SaaS (Full Stack) boilerplate if needed
		if (config.boilerplate.saasFs) {
			await sharedBetweenMarketingAndSaasFs();

			const devAuthSecret = Crypto.randomBytes(32).toString("hex");
			const prodAuthSecret = Crypto.randomBytes(32).toString("hex");
			const addOrUpdateEnvSecretAuthToken = await this.gitAddOrUpdateEnvSecret(
				config,
				args.name,
				"AUTH_SECRET",
				devAuthSecret,
				prodAuthSecret
			);
			if (typeof addOrUpdateEnvSecretAuthToken === "string") {
				this.error(addOrUpdateEnvSecretAuthToken);
			}

			const gitAddOrUpdateEnvVariableStripePublishableKey = await this.gitAddOrUpdateEnvVariable(
				config,
				args.name,
				"STRIPE_PUBLISHABLE_KEY",
				config.boilerplate.saasFs.stripePublishableKeyDev,
				config.boilerplate.saasFs.stripePublishableKey
			);
			if (typeof gitAddOrUpdateEnvVariableStripePublishableKey === "string") {
				this.error(gitAddOrUpdateEnvVariableStripePublishableKey);
			}

			const addOrUpdateEnvSecretStripeSecretKey = await this.gitAddOrUpdateEnvSecret(
				config,
				args.name,
				"STRIPE_SECRET_KEY",
				config.boilerplate.saasFs.stripeSecretKeyDev,
				config.boilerplate.saasFs.stripeSecretKey
			);
			if (typeof addOrUpdateEnvSecretStripeSecretKey === "string") {
				this.error(addOrUpdateEnvSecretStripeSecretKey);
			}

			const addOrUpdateEnvSecretStripeWebhookSecret = await this.gitAddOrUpdateEnvSecret(
				config,
				args.name,
				"STRIPE_WEBHOOK_SECRET",
				"",
				config.boilerplate.saasFs.stripeWebhookSecret
			);
			if (typeof addOrUpdateEnvSecretStripeWebhookSecret === "string") {
				this.error(addOrUpdateEnvSecretStripeWebhookSecret);
			}

			await this.copyTemplateFiles("boilerplate/saasFs", args.name);

			const filePath = join(process.cwd(), args.name, "src", "app.d.ts");
			let data = await fs.readFile(filePath, "utf8");
			data = data.replace(
				"// interface Locals {}",
				`interface Locals {
      user?: User;
    }`
			);
			data = data.replace(
				"// interface Platform {}",
				`interface Platform {
      env: Env;
    }`
			);
			data = data.replace(
				"// for information about these interfaces",
				`// for information about these interfaces
import type { User } from '$lib/server/auth';
`
			);
			await fs.writeFile(filePath, data, "utf8");

			await this.modifyJsonFile(
				"package.json",
				[
					{
						path: ["scripts", "db:generate"],
						value: "drizzle-kit generate"
					},
					{
						path: ["scripts", "db:migrate"],
						value: `${platform() === "win32" ? "echo y" : "yes |"} wrangler d1 migrations apply ${args.name} --local`
					}
				],
				4,
				args.name
			);

			await this.executeCommand("pnpm", ["add", "-D", "drizzle-kit"], { cwd: args.name });
			await this.executeCommand("pnpm", ["add", "drizzle-orm"], { cwd: args.name });
			await this.executeCommand("pnpm", ["add", "better-auth"], { cwd: args.name });
			await this.executeCommand("pnpm", ["add", "@better-auth/stripe"], { cwd: args.name });
			await this.executeCommand("pnpm", ["add", "stripe"], { cwd: args.name });
			await this.executeCommand("pnpm", ["add", "posthog-node"], { cwd: args.name });
			await this.executeCommand("pnpm", ["run", "db:generate"], { cwd: args.name });
		}

		// 7. Add a correct Adapter and a template based on where this project is deployed to
		if (config.deploymentTarget.cloudFlare) {
			const addOrUpdateVariable = await this.gitAddOrUpdateVariable(
				config,
				args.name,
				"CLOUDFLARE_ACCOUNT_ID",
				config.deploymentTarget.cloudFlare.accountId
			);
			if (typeof addOrUpdateVariable === "string") {
				this.error(addOrUpdateVariable);
			}

			const addOrUpdateSecret = await this.gitAddOrUpdateSecret(
				config,
				args.name,
				"CLOUDFLARE_API_TOKEN",
				config.deploymentTarget.cloudFlare.token
			);
			if (typeof addOrUpdateSecret === "string") {
				this.error(addOrUpdateSecret);
			}

			await this.copyTemplateFiles("boilerplate/cloudflare", args.name);

			if (config.gitProvider.gitHub) {
				type Step = {
					env?: Record<string, string>;
					name: string;
					run?: string;
					uses?: string;
					with?: Record<string, number | string>;
				};

				const steps: Step[] = [
					{
						name: "Checkout",
						uses: "actions/checkout@v4"
					},
					{
						name: "Setup pnpm",
						uses: "pnpm/action-setup@v4",
						with: {
							version: 10
						}
					},
					{
						name: "Setup Node.js environment",
						uses: "actions/setup-node@v4",
						with: {
							cache: "pnpm",
							"node-version": 22
						}
					},
					{
						name: "Install dependencies",
						run: "pnpm install"
					},
					{
						name: "Build project",
						run: "pnpm run build"
					},
					{
						name: "Deploy to Cloudflare Workers with Wrangler",
						uses: "cloudflare/wrangler-action@v3",
						with: {
							// eslint-disable-next-line no-template-curly-in-string
							accountId: "${{ vars.CLOUDFLARE_ACCOUNT_ID }}",
							// eslint-disable-next-line no-template-curly-in-string
							apiToken: "${{ secrets.CLOUDFLARE_API_TOKEN }}",
							packageManager: "pnpm"
						}
					}
				];
				if (config.boilerplate.marketing) {
					steps.splice(4, 1, {
						env: {
							// eslint-disable-next-line no-template-curly-in-string
							PUBLIC_BASE_URL: "${{ vars.BASE_URL }}",
							// eslint-disable-next-line no-template-curly-in-string
							PUBLIC_POSTHOG_API_KEY: "${{ vars.POSTHOG_API_KEY }}"
						},
						name: "Build project",
						run: "pnpm run build"
					});
				}

				if (config.boilerplate.saasFs) {
					steps.splice(4, 1, {
						name: "Build project",
						run: "pnpm run build",
						// eslint-disable-next-line perfectionist/sort-objects
						env: {
							// eslint-disable-next-line no-template-curly-in-string
							AUTH_SECRET: "${{ secrets.AUTH_SECRET }}",
							// eslint-disable-next-line no-template-curly-in-string
							PUBLIC_BASE_URL: "${{ vars.BASE_URL }}",
							// eslint-disable-next-line no-template-curly-in-string
							PUBLIC_POSTHOG_API_KEY: "${{ vars.POSTHOG_API_KEY }}",
							// eslint-disable-next-line no-template-curly-in-string
							PUBLIC_STRIPE_PUBLISHABLE_KEY: "${{ vars.STRIPE_PUBLISHABLE_KEY }}",
							// eslint-disable-next-line no-template-curly-in-string
							STRIPE_SECRET_KEY: "${{ secrets.STRIPE_SECRET_KEY }}",
							// eslint-disable-next-line no-template-curly-in-string
							STRIPE_WEBHOOK_SECRET: "${{ secrets.STRIPE_WEBHOOK_SECRET }}"
						}
					});
					steps.splice(6, 0, {
						name: "Run D1 Migrations with Wrangler",
						uses: "cloudflare/wrangler-action@v3",
						with: {
							// eslint-disable-next-line no-template-curly-in-string
							accountId: "${{ vars.CLOUDFLARE_ACCOUNT_ID }}",
							// eslint-disable-next-line no-template-curly-in-string
							apiToken: "${{ secrets.CLOUDFLARE_API_TOKEN }}",
							command: `d1 migrations apply ${args.name} --remote`
						}
					});
				}

				const yamlString = stringify(
					{
						name: "Deploy to Cloudflare Workers",
						on: {
							push: {
								branches: ["main"]
							}
						},
						// eslint-disable-next-line perfectionist/sort-objects
						jobs: {
							"build-and-deploy": {
								environment: "Production",
								name: "Build and Deploy to Production",
								"runs-on": "ubuntu-latest",
								steps
							}
						}
					},
					{
						lineWidth: -1
					}
				);
				const gitHubWorkflowsPath = join(process.cwd(), args.name, ".github", "workflows");
				await fs.mkdir(gitHubWorkflowsPath, {
					recursive: true
				});
				await fs.writeFile(join(gitHubWorkflowsPath, "deploy-to-cloudflare.yml"), yamlString, "utf8");
			}

			await this.executeCommand("pnpm dlx", [
				"sv",
				"add",
				"sveltekit-adapter=adapter:cloudflare",
				"--install pnpm",
				"--cwd",
				args.name
			]);

			await this.modifyJsonFile(
				"package.json",
				[
					{
						path: ["scripts", "preview"],
						value: "vite preview && wrangler dev"
					},
					{
						path: ["scripts", "cf-typegen"],
						value: "wrangler types ./src/worker-configuration.d.ts"
					}
				],
				4,
				args.name
			);
			await this.modifyJsonFile(
				"tsconfig.json",
				[
					{
						path: ["compilerOptions", "types"],
						value: ["./src/worker-configuration.d.ts"]
					}
				],
				4,
				args.name
			);
			await this.modifyJsonFile(
				".prettierrc",
				[
					{
						path: ["singleQuote"],
						value: false
					}
				],
				4,
				args.name
			);
			await this.modifyJsonFile(
				"wrangler.jsonc",
				[
					{
						path: ["name"],
						value: args.name
					},
					{
						path: ["compatibility_date"],
						value: new Date().toISOString().slice(0, 10)
					},
					{
						path: ["routes", 0, "pattern"],
						value: config.deploymentTarget.cloudFlare.url.hostname
					}
				],
				2,
				args.name
			);
			if (config.boilerplate.saasFs) {
				const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
				const createResources = await this.targetCreateResources(config, args.name);
				if (!UUID_REGEX.test(createResources)) {
					this.error(createResources);
				}

				await this.modifyJsonFile(
					"wrangler.jsonc",
					[
						{
							path: ["d1_databases", 0, "binding"],
							value: "DB"
						},
						{
							path: ["d1_databases", 0, "database_name"],
							value: args.name
						},
						{
							path: ["d1_databases", 0, "database_id"],
							value: createResources
						},
						{
							path: ["d1_databases", 0, "migrations_dir"],
							value: "./src/lib/server/db/migrations"
						}
					],
					2,
					args.name
				);
			}

			await this.executeCommand("pnpm", ["add", "-D", "wrangler"], { cwd: args.name });
			await this.executeCommand("pnpm", ["run", "cf-typegen"], { cwd: args.name });
			await this.executeCommand("pnpm", ["run", "db:migrate"], { cwd: args.name });
			await this.executeCommand("pnpm", ["run", "format"], { cwd: args.name });
		}

		// 8. Initialize a new git repo and push local to remote
		await this.executeCommand("git", ["init"], { cwd: args.name });
		await this.executeCommand("git", ["add", "."], { cwd: args.name });
		await this.executeCommand("git", ["commit", "-m", '"Initial commit"'], { cwd: args.name });
		await this.executeCommand("git", ["remote", "add", "origin", createRepository], { cwd: args.name });
		await this.executeCommand("git", ["push", "-u", "origin", "main"], { cwd: args.name });

		this.log(`DANKU✅ Successfully created SvelteKit project "${args.name}"`);
	}
}
