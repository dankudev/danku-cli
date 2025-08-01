import { Args } from "@oclif/core";

import BaseCommand from "../base-command.js";

export default class Components extends BaseCommand {
	static override args = {
		name: Args.string({
			description: "Name of a component to create or update",
			required: true
		})
	};
	static override description = "Creates or updates a component in your SvelteKit project";

	public async run(): Promise<void> {
		const { args } = await this.parse(Components);
	}
}
