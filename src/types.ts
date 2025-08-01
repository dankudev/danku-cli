import { type } from "arktype";

export const cloudFlareSchema = type({
	accountId: "string>0",
	token: "string>0",
	url: /^https:\/\/(www\.)?\w+(\.\w+)+.*[^/]$/
});

export const gitHubSchema = type({
	token: "string>0"
});

export const marketingBoilerplateSchema = type({});
export const saasFsBoilerplateSchema = type({
	stripePublishableKey: "string>0",
	stripePublishableKeyDev: "string>0",
	stripeSecretKey: "string>0",
	stripeSecretKeyDev: "string>0",
	stripeWebhookSecret: "string>0"
});

export const boilerplateSchema = type({
	"marketing?": marketingBoilerplateSchema,
	"saasFs?": saasFsBoilerplateSchema
}).pipe((target, ctx) => {
	const configuredBoilerplates = Object.entries(target)
		.filter(([_, config]) => config !== undefined)
		.map(([kind, _]) => kind);

	if (configuredBoilerplates.length > 1) {
		ctx.error("Only one boilerplate can be configured at a time");
	} // TODO fix so it doesn't expose secrets

	return target;
});

export const deploymentTargetSchema = type({
	"cloudFlare?": cloudFlareSchema
}).pipe((target, ctx) => {
	const configuredDeploymentTargets = Object.entries(target)
		.filter(([_, config]) => config !== undefined)
		.map(([platform, _]) => platform);
	if (configuredDeploymentTargets.length === 0) {
		ctx.error("At least one target platform must be configured");
	}

	if (configuredDeploymentTargets.length > 1) {
		ctx.error("Only one target platform can be configured at a time");
	}

	return target;
});

export const gitProviderSchema = type({
	"gitHub?": gitHubSchema
}).pipe((target, ctx) => {
	const configuredGitProviders = Object.entries(target)
		.filter(([_, config]) => config !== undefined)
		.map(([gitProvider, _]) => gitProvider);
	if (configuredGitProviders.length === 0) {
		ctx.error("At least one Git provider must be configured");
	}

	if (configuredGitProviders.length > 1) {
		ctx.error("Only one Git Provider can be configured at a time");
	}

	return target;
});

export const configSchema = type({
	boilerplate: boilerplateSchema,
	deploymentTarget: deploymentTargetSchema,
	gitProvider: gitProviderSchema
});

export type Config = typeof configSchema.infer;
