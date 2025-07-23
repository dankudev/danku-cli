import { password } from '@inquirer/prompts'
import * as jsonc from 'jsonc-parser'
import * as fs from 'node:fs/promises'
import { basename, join } from 'node:path'

import BaseCommand from '../../base-command.js'

export default class ModulesMarketing extends BaseCommand {
  static override description = 'Creates or updates the marketing module in the current SvelteKit project'

  public async run(): Promise<void> {
    if (!(await this.isSvelteKitProject())) {
      this.error('Please run this command inside of a SvelteKit project directory')
    }

    const wranglerPath = join(process.cwd(), 'wrangler.jsonc');
    try {
      await fs.access(wranglerPath);
    } catch {
      this.error('Could not find wrangler.jsonc file');
    }

    const wranglerContent = await fs.readFile(wranglerPath, 'utf8');
    const wranglerJson = jsonc.parse(wranglerContent);
    const url = `https://${wranglerJson?.routes?.[0]?.pattern}`;

    const gitToken = await password({
      mask: true,
      message: 'Enter your API token for the git provider:',
      validate: async (input) => {
        const repositoryExists = await this.gitRepositoryExists('GitHub', input, basename(process.cwd()));

        if (typeof repositoryExists === 'string') {
          return repositoryExists;
        }

        return repositoryExists ? true : 'Repository does not exist';
      }
    });

    this.log(`DANKU🧊 Creating or updating the marketing module`)

    const addOrUpdateEnvvar = await this.gitAddOrUpdateEnvVar('GitHub', gitToken, basename(process.cwd()), 'BASE_URL', 'http://localhost:5173', url);
    if (typeof addOrUpdateEnvvar === 'string') {
      this.error(addOrUpdateEnvvar);
    }

    await this.copyTemplateFiles('marketing');

    const layoutPath = join(process.cwd(), 'src', 'routes', '+layout.svelte');

    const layout = await fs.readFile(layoutPath, 'utf8');
    const importsToAdd = `\timport { PUBLIC_BASE_URL } from '$env/static/public';
\timport { page } from '$app/state';`;
    const headContentToAdd = `<svelte:head>
\t<meta property="og:url" content={PUBLIC_BASE_URL + page.url.pathname} />
\t<link rel="canonical" href={PUBLIC_BASE_URL + page.url.pathname} />
\t<meta property="og:description" content={page.data.description} />
\t<meta property="og:image" content={PUBLIC_BASE_URL + '/og.png'} />
\t<meta name="description" content={page.data.description} />
\t<meta property="og:title" content={page.data.title} />
\t<meta property="og:type" content="website" />
\t<title>{page.data.title}</title>
</svelte:head>`;

    // eslint-disable-next-line no-warning-comments
    // TODO manipulate .svelte files using ast

    const scriptTagStart = '<script lang="ts">';
    const scriptStartPos = layout.indexOf(scriptTagStart);
    let modifiedLayout = layout;
    const importInsertPos = scriptStartPos + scriptTagStart.length;
    modifiedLayout = modifiedLayout.slice(0, importInsertPos) + '\n' + importsToAdd + modifiedLayout.slice(importInsertPos);
    const newScriptEndPos = modifiedLayout.indexOf('</script>');
    const headInsertPos = newScriptEndPos + '</script>'.length;
    modifiedLayout = modifiedLayout.slice(0, headInsertPos) + '\n\n' + headContentToAdd + modifiedLayout.slice(headInsertPos);
    await fs.writeFile(layoutPath, modifiedLayout, 'utf8');

    this.log(`DANKU✅ Successfully created or updated the marketing module`);
  }
}