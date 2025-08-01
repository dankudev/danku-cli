import { runCommand } from "@oclif/test";
import { expect } from "chai";

describe("components", () => {
	it("runs components cmd", async () => {
		const { stdout } = await runCommand("components");
		expect(stdout).to.contain("hello world");
	});

	it("runs components --name oclif", async () => {
		const { stdout } = await runCommand("components --name oclif");
		expect(stdout).to.contain("hello oclif");
	});
});
