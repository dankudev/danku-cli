import { Hook } from "@oclif/core";
import { access, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const hook: Hook<"prerun"> = async function (opts) {
	if (opts.Command.id !== "new") {
		return;
	}

	const configDir = join(homedir(), ".danku", "cli", "node");
	const configPath = join(configDir, "config.jsonc");

	try {
		await access(configPath);
		// Configuration exists, our job is finished here
	} catch {
		const defaultConfigContent = `{
  // Configuration file for DANKU CLI
  // Visit https://danku.dev/svelte/cli for more detailed information

  "boilerplate": {
  	// "marketing": {
  	//
  	// }
  	// "saasFs": {
  	//   "stripePublishableKey": "",
  	//   "stripePublishableKeyDev": "",
  	//   "stripeSecretKey": "",
  	//   "stripeSecretKeyDev": "",
  	//   "stripeWebhookSecret": ""
  	// }
  },

  "deploymentTarget": {
    // "cloudFlare": {
    //   "accountId": "",
    //   "token": "",
    //   "url": ""
    // }
  },

  "gitProvider": {
    // "gitHub": {
    //   "token": ""
    // }
  }
}`;

		await mkdir(configDir, { recursive: true });
		await writeFile(configPath, defaultConfigContent, {
			mode: 0o600
		});
		this.log("DANKU✅ Created default configuration file at", configPath);
		this.log("DANKU⚠️ Please update the configuration file before running this command again");
		opts.context.exit(1);
	}
};

export default hook;
