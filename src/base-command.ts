import { Command } from "@oclif/core";
import { Cloudflare, CloudflareError } from "cloudflare";
import { applyEdits, modify } from "jsonc-parser";
import sodium from "libsodium-wrappers";
import { spawn, type SpawnOptions } from "node:child_process";
import * as fs from "node:fs/promises";
import { EOL } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Octokit, RequestError } from "octokit";
import { parse } from "tldts";

import { Config } from "./types.js";

export default abstract class BaseCommand extends Command {
	private cloudflare = new Cloudflare();
	private octokit = new Octokit();
	private owner = "";

	protected async copyTemplateFiles(templatePath: string, projectName?: string): Promise<void> {
		const templateSrcDir = join(
			join(dirname(fileURLToPath(import.meta.url)), ".."),
			"templates",
			...templatePath.split("/")
		);
		const targetSrcDir = projectName ? join(process.cwd(), projectName) : process.cwd();
		await fs.cp(templateSrcDir, targetSrcDir, { force: true, recursive: true });
	}

	protected executeCommand(command: string, args: string[], options: SpawnOptions = {}): Promise<void> {
		return new Promise((resolve, reject) => {
			const child = spawn(command, args, {
				shell: true,
				stdio: "inherit",
				...options
			});

			child.on("close", (code) => {
				if (code === 0) {
					resolve();
				} else {
					reject(new Error(`Command failed with exit code ${code}`));
				}
			});

			child.on("error", (err) => {
				reject(new Error(`Failed to execute command: ${err.message}`));
			});
		});
	}

	// eslint-disable-next-line max-params
	protected async gitAddOrUpdateEnvSecret(
		config: Config,
		repositoryName: string,
		key: string,
		devValue: string,
		prodValue: string
	): Promise<boolean | string> {
		if (config.gitProvider.gitHub) {
			try {
				await this.octokit.request("PUT /repos/{owner}/{repo}/environments/{environment_name}", {
					// eslint-disable-next-line camelcase
					environment_name: "Production",
					owner: this.owner,
					repo: repositoryName
				});
			} catch (error) {
				if (error instanceof RequestError || error instanceof Error) {
					return `Failed to create or update environment: ${error.message}`;
				}

				return "Failed to create or update environment: Unknown error";
			}

			try {
				const {
					data: { key: publicKey, key_id: keyId }
				} = await this.octokit.request(
					"GET /repos/{owner}/{repo}/environments/{environment_name}/secrets/public-key",
					{
						// eslint-disable-next-line camelcase
						environment_name: "Production",
						owner: this.owner,
						repo: repositoryName
					}
				);

				await sodium.ready;
				const keyBytes = sodium.from_base64(publicKey, sodium.base64_variants.ORIGINAL);
				const secretBytes = sodium.from_string(prodValue);
				const encryptedBytes = sodium.crypto_box_seal(secretBytes, keyBytes);
				const encryptedValue = sodium.to_base64(encryptedBytes, sodium.base64_variants.ORIGINAL);

				await this.octokit.request(
					"PUT /repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}",
					{
						// eslint-disable-next-line camelcase
						encrypted_value: encryptedValue,
						// eslint-disable-next-line camelcase
						environment_name: "Production",
						// eslint-disable-next-line camelcase
						key_id: keyId,
						owner: this.owner,
						repo: repositoryName,
						// eslint-disable-next-line camelcase
						secret_name: key
					}
				);
			} catch (error) {
				if (error instanceof RequestError || error instanceof Error) {
					return `Failed to add/update environment secret: ${error.message}`;
				}

				return "Failed to add/update environment secret: Unknown error";
			}
		}

		await this.updateEnvFile(repositoryName, key, devValue);

		return true;
	}

	// eslint-disable-next-line max-params
	protected async gitAddOrUpdateEnvVariable(
		config: Config,
		repositoryName: string,
		key: string,
		devValue: string,
		prodValue: string
	): Promise<boolean | string> {
		if (config.gitProvider.gitHub) {
			try {
				await this.octokit.request("PUT /repos/{owner}/{repo}/environments/{environment_name}", {
					// eslint-disable-next-line camelcase
					environment_name: "Production",
					owner: this.owner,
					repo: repositoryName
				});
			} catch (error) {
				if (error instanceof RequestError || error instanceof Error) {
					return `Failed to create or update environment: ${error.message}`;
				}

				return "Failed to create or update environment: Unknown error";
			}

			let variableExists = true;
			try {
				await this.octokit.request(
					"GET /repos/{owner}/{repo}/environments/{environment_name}/variables/{name}",
					{
						// eslint-disable-next-line camelcase
						environment_name: "Production",
						name: key,
						owner: this.owner,
						repo: repositoryName
					}
				);
			} catch (error) {
				if (error instanceof RequestError && error.status === 404) {
					variableExists = false;
				}
			}

			try {
				// eslint-disable-next-line unicorn/prefer-ternary
				if (variableExists) {
					await this.octokit.request(
						"PATCH /repos/{owner}/{repo}/environments/{environment_name}/variables/{name}",
						{
							// eslint-disable-next-line camelcase
							environment_name: "Production",
							name: key,
							owner: this.owner,
							repo: repositoryName,
							value: prodValue
						}
					);
				} else {
					await this.octokit.request(
						"POST /repos/{owner}/{repo}/environments/{environment_name}/variables/",
						{
							// eslint-disable-next-line camelcase
							environment_name: "Production",
							name: key,
							owner: this.owner,
							repo: repositoryName,
							value: prodValue
						}
					);
				}
			} catch (error) {
				if (error instanceof RequestError || error instanceof Error) {
					return `Failed to create environment variable: ${error.message}`;
				}

				return "Failed to create environment variable: Unknown error";
			}
		}

		await this.updateEnvFile(repositoryName, `PUBLIC_${key}`, devValue);

		return true;
	}

	protected async gitAddOrUpdateSecret(
		config: Config,
		repositoryName: string,
		key: string,
		value: string
	): Promise<boolean | string> {
		if (config.gitProvider.gitHub) {
			try {
				const {
					data: { key: publicKey, key_id: keyId }
				} = await this.octokit.request("GET /repos/{owner}/{repo}/actions/secrets/public-key", {
					owner: this.owner,
					repo: repositoryName
				});

				await sodium.ready;
				const keyBytes = sodium.from_base64(publicKey, sodium.base64_variants.ORIGINAL);
				const secretBytes = sodium.from_string(value);
				const encryptedBytes = sodium.crypto_box_seal(secretBytes, keyBytes);
				const encryptedValue = sodium.to_base64(encryptedBytes, sodium.base64_variants.ORIGINAL);

				await this.octokit.request("PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}", {
					// eslint-disable-next-line camelcase
					encrypted_value: encryptedValue,
					// eslint-disable-next-line camelcase
					key_id: keyId,
					owner: this.owner,
					repo: repositoryName,
					// eslint-disable-next-line camelcase
					secret_name: key
				});
				return true;
			} catch (error) {
				if (error instanceof RequestError || error instanceof Error) {
					return `Failed to add/update secret: ${error.message}`;
				}

				return "Failed to add/update secret: Unknown error";
			}
		}

		return true;
	}

	protected async gitAddOrUpdateVariable(
		config: Config,
		repositoryName: string,
		key: string,
		value: string
	): Promise<boolean | string> {
		if (config.gitProvider.gitHub) {
			try {
				let variableExists = true;
				try {
					await this.octokit.request("GET /repos/{owner}/{repo}/actions/variables/{name}", {
						name: key,
						owner: this.owner,
						repo: repositoryName
					});
				} catch {
					variableExists = false;
				}

				// eslint-disable-next-line unicorn/prefer-ternary
				if (variableExists) {
					await this.octokit.request("PATCH /repos/{owner}/{repo}/actions/variables/{name}", {
						name: key,
						owner: this.owner,
						repo: repositoryName,
						value
					});
				} else {
					// Create new variable
					await this.octokit.request("POST /repos/{owner}/{repo}/actions/variables", {
						name: key,
						owner: this.owner,
						repo: repositoryName,
						value
					});
				}

				return true;
			} catch (error) {
				if (error instanceof RequestError || error instanceof Error) {
					return `Failed to add/update variable: ${error.message}`;
				}

				return "Failed to add/update variable: Unknown error";
			}
		}

		return "Should not be reached";
	}

	protected async gitCreateRepository(config: Config, repositoryName: string): Promise<string> {
		if (config.gitProvider.gitHub) {
			try {
				await this.octokit.request("POST /orgs/{org}/repos", {
					name: repositoryName,
					org: this.owner,
					private: true
				});
			} catch (error) {
				if (error instanceof RequestError || error instanceof Error) {
					return `Failed to create repository: ${error.message}`;
				}

				return "Failed to create repository: Unknown error";
			}

			return `https://github.com/${this.owner}/${repositoryName}.git`;
		}

		return "Should not be reached";
	}

	protected async gitRepositoryExists(config: Config, repositoryName: string): Promise<boolean | string> {
		if (config.gitProvider.gitHub) {
			this.octokit = new Octokit({ auth: config.gitProvider.gitHub.token });
			try {
				const { data: memberships } = await this.octokit.request("GET /user/memberships/orgs");
				if (memberships.length === 0) {
					return "You do not have access to any organizations. Please try again with a different token.";
				}

				this.owner = memberships[0].organization.login;
			} catch (error) {
				if (error instanceof RequestError && error.status === 401) {
					return "Invalid GitHub token";
				}

				if (error instanceof RequestError && error.status === 403) {
					return "GitHub token has insufficient permissions";
				}

				if (error instanceof RequestError) {
					return error.message;
				}

				return "Unknown GitHub API error";
			}

			try {
				await this.octokit.request("GET /repos/{owner}/{repo}", {
					owner: this.owner,
					repo: repositoryName
				});
				return true;
			} catch (error) {
				if (error instanceof RequestError && error.status === 404) {
					return false;
				}

				if (error instanceof RequestError && error.status === 403) {
					return "GitHub token has insufficient permissions";
				}

				if (error instanceof RequestError) {
					return `Failed to check repository: ${error.message}`;
				}

				return "Failed to check repository: Unknown error";
			}
		}

		return "Should not be reached";
	}

	protected async isSvelteKitProject(): Promise<boolean> {
		const packageJsonPath = join(process.cwd(), "package.json");
		const packageJsonExists = await fs
			.access(packageJsonPath)
			.then(() => true)
			.catch(() => false);

		if (!packageJsonExists) return false;

		const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
		const deps = { ...packageJson.devDependencies };

		return Boolean(deps["@sveltejs/kit"]);
	}

	protected async modifyJsonFile(
		filePath: string,
		edits: Array<{ path: (number | string)[]; value: boolean | object | string }>,
		tabSize: number,
		projectName?: string
	): Promise<void> {
		const fullPath = projectName ? join(process.cwd(), projectName, filePath) : join(process.cwd(), filePath);
		let fileContent = await fs.readFile(fullPath, "utf8");

		for (const { path, value } of edits) {
			const formattingOptions = {
				eol: EOL,
				insertSpaces: true,
				tabSize
			};

			const jsonEdits = modify(fileContent, path, value, { formattingOptions });
			fileContent = applyEdits(fileContent, jsonEdits);
		}

		await fs.writeFile(fullPath, fileContent, "utf8");
	}

	protected async targetCreatePostHogReverseProxy(config: Config): Promise<string | URL> {
		if (config.deploymentTarget.cloudFlare) {
			const script = new File(
				[
					`
const API_HOST = "us.i.posthog.com" // Change to "eu.i.posthog.com" for the EU region
const ASSET_HOST = "us-assets.i.posthog.com" // Change to "eu-assets.i.posthog.com" for the EU region
const CORS_HEADERS = {
  // Access-Control-Allow-Origin: "*"                           ← Permissive (accepts any origin)
  // └── Replace the asterisk with your site’s origin (e.g. "https://my-cute-website.com")
  //     if you want to *tighten* your CORS policy and restrict access to your own domain.
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With"
}

function corsify(resp, extra = {}) {
  return new Response(resp ? resp.body : null, {
    status:     resp ? resp.status     : 204,
    statusText: resp ? resp.statusText : "No Content",
    headers:    { ...(resp ? resp.headers : {}), ...CORS_HEADERS, ...extra }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url            = new URL(request.url)
    const pathname       = url.pathname
    const pathWithSearch = pathname + url.search

    if (request.method === "OPTIONS") {
      return corsify(null, { "Access-Control-Max-Age": "86400" });
    }

    if (pathname.startsWith("/static/")) {
      let response = await caches.default.match(request)
      if (!response) {
        response = await fetch(\`https://\${ASSET_HOST}\${pathWithSearch}\`)
        ctx.waitUntil(caches.default.put(request, response.clone()))
      }
      return corsify(response)
    } else {
      const originRequest = new Request(request)
      originRequest.headers.delete("cookie")
      const response = await fetch(\`https://\${API_HOST}\${pathWithSearch}\`, originRequest)
      return corsify(response)
    }
  }
}

`
				],
				"index.js",
				{
					type: "application/javascript+module"
				}
			);
			const proxyName = "posthog-reverse-proxy";
			const domain = parse(config.deploymentTarget.cloudFlare.url.origin).domain ?? "";
			const proxyUrl = new URL(config.deploymentTarget.cloudFlare.url);
			proxyUrl.hostname = `a.${domain}`;

			try {
				await this.cloudflare.workers.scripts.update(proxyName, {
					// eslint-disable-next-line camelcase
					account_id: config.deploymentTarget.cloudFlare.accountId,
					files: {
						"index.js": script
					},
					metadata: {
						// eslint-disable-next-line camelcase
						compatibility_date: new Date().toISOString().split("T")[0],
						// eslint-disable-next-line camelcase
						main_module: "index.js"
					}
				});
				const zones = await this.cloudflare.zones.list({
					name: domain
				});
				await this.cloudflare.workers.domains.update({
					// eslint-disable-next-line camelcase
					account_id: config.deploymentTarget.cloudFlare.accountId,
					environment: "production",
					hostname: proxyUrl.hostname,
					service: proxyName,
					// eslint-disable-next-line camelcase
					zone_id: zones.result[0].id
				});
				return proxyUrl;
			} catch (error) {
				if (error instanceof CloudflareError) {
					return `Failed to create PostHog Reverse Proxy: ${error.message}`;
				}

				return "Failed to create PostHog Reverse Proxy: Unknown error";
			}
		}

		return "Should not be reached";
	}

	protected async targetCreateResources(config: Config, resourceName: string): Promise<string> {
		if (config.deploymentTarget.cloudFlare) {
			try {
				const d1 = await this.cloudflare.d1.database.create({
					// eslint-disable-next-line camelcase
					account_id: config.deploymentTarget.cloudFlare.accountId ?? "",
					name: resourceName
				});

				return d1.uuid ?? "";
			} catch (error) {
				if (error instanceof CloudflareError) {
					return `Failed to create resources: ${error.message}`;
				}

				return "Failed to create resources: Unknown error";
			}
		}

		return "Should not be reached";
	}

	protected async targetResourceExists(config: Config, resourceName: string): Promise<boolean | string> {
		if (config.deploymentTarget.cloudFlare) {
			this.cloudflare = new Cloudflare({ apiToken: config.deploymentTarget.cloudFlare.token });
			try {
				const verification = await this.cloudflare.accounts.tokens.verify({
					// eslint-disable-next-line camelcase
					account_id: config.deploymentTarget.cloudFlare.accountId ?? ""
				});
				if (verification.status !== "active") {
					return "Cloudflare API token is not active";
				}

				const zones = await this.cloudflare.zones.list({
					name: parse(config.deploymentTarget.cloudFlare.url.origin).domain ?? ""
				});
				if (zones.result.length === 0) {
					return "Cloudflare account does not have a zone with the specified URL";
				}
			} catch {
				return "Invalid Cloudflare account ID or API token";
			}

			try {
				for await (const script of this.cloudflare.workers.scripts.list({
					// eslint-disable-next-line camelcase
					account_id: config.deploymentTarget.cloudFlare.accountId ?? ""
				})) {
					if (script.id === resourceName) {
						return true;
					}
				}

				for await (const databaseListResponse of this.cloudflare.d1.database.list({
					// eslint-disable-next-line camelcase
					account_id: config.deploymentTarget.cloudFlare.accountId ?? ""
				})) {
					if (databaseListResponse.name === resourceName) {
						return true;
					}
				}

				return false;
			} catch (error) {
				if (error instanceof CloudflareError) {
					return `Failed to check resources: ${error.message}`;
				}

				return "Failed to check resources: Unknown error";
			}
		}

		return "Should not be reached";
	}

	private async updateEnvFile(repositoryName: string, key: string, value: string) {
		const envPath = join(process.cwd(), repositoryName, ".env");
		let envContent = "";

		try {
			envContent = await fs.readFile(envPath, "utf8");
		} catch {
			// File doesn't exist, that's fine
		}

		if (envContent.includes(`${key}=`)) {
			const lines = envContent.split(/\r?\n/);

			const updatedLines = lines.map((line) => {
				const [currentKey] = line.split("=");

				if (currentKey === key) {
					return `${key}=${value}`;
				}

				return line;
			});

			envContent = updatedLines.join("\n");
		} else {
			// Append new key=value line
			if (envContent && !envContent.endsWith("\n")) {
				envContent += "\n";
			}

			envContent += `${key}=${value}\n`;
		}

		await fs.writeFile(envPath, envContent, "utf8");
	}
}
