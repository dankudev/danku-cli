import {Args, Flags} from '@oclif/core'
import * as fs from 'node:fs/promises'
import { join } from 'node:path'

import BaseCommand from '../../base-command.js'

export default class ModulesSaas extends BaseCommand {
  static override args = {
    file: Args.string({description: 'file to read'}),
  }
  static override description = 'describe the command here'
  static override examples = [
    '<%= config.bin %> <%= command.id %>',
  ]
  static override flags = {
    // flag with no value (-f, --force)
    force: Flags.boolean({char: 'f'}),
    // flag with a value (-n, --name=VALUE)
    name: Flags.string({char: 'n', description: 'name to print'}),
  }

  public async run(): Promise<void> {
    // Add Posthog analytics
    try {
      // Install posthog-js
      await this.executeCommand('pnpm', ['add', 'posthog-js']);

      // Copy template files
      await this.copyTemplateFiles('analytics/posthog');

      // Update layout file
      const layoutPath = join(process.cwd(), 'src', 'routes', '+layout.svelte');

      // Check if layout file exists
      const layoutExists = await fs.access(layoutPath).then(() => true).catch(() => false);
      if (!layoutExists) {
        this.error('Could not find layout file at src/routes/+layout.svelte');
        return;
      }

      const layout = await fs.readFile(layoutPath, 'utf8');
      const importsToAdd = `  import { beforeNavigate, afterNavigate } from '$app/navigation';
  import { browser, dev } from '$app/environment';
  import posthog from 'posthog-js';`;
      const postHogCodeToAdd = `  if (browser && !dev) {
    beforeNavigate(() => posthog.capture('$pageleave'));
    afterNavigate(() => posthog.capture('$pageview'));
  }`;

      const scriptTagStart = '<script lang="ts">';
      const scriptStartPos = layout.indexOf(scriptTagStart);
      if (scriptStartPos === -1) {
        this.warn('Could not find script tag in layout file. Manual integration may be required.');
      } else {
        let modifiedLayout = layout;
        const importInsertPos = scriptStartPos + scriptTagStart.length;
        modifiedLayout = modifiedLayout.slice(0, importInsertPos) + '\n' + importsToAdd + modifiedLayout.slice(importInsertPos);
        const newScriptEndPos = modifiedLayout.indexOf('</script>');
        modifiedLayout = modifiedLayout.slice(0, newScriptEndPos) + '\n' + postHogCodeToAdd + '\n' + modifiedLayout.slice(newScriptEndPos);
        await fs.writeFile(layoutPath, modifiedLayout, 'utf8');
      }

      this.log(`✅ Analytics module applied successfully`);
    } catch (error) {
      this.error(`Failed to add analytics: ${error}`);
    }
    }
  }