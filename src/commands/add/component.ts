import {Command} from '@oclif/core'

export default class Component extends Command {
  static args = {}
  static description = 'Say add world'
  static examples = [
    `<%= config.bin %> <%= command.id %>
hello world! (./src/commands/hello/world.ts)
`,
  ]
  static flags = {}

  async run(): Promise<void> {
    this.log('add world! (./src/commands/add/component.ts)')
  }
}
