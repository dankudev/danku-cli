import {Args, Command, Flags} from '@oclif/core'
import { applyEdits, modify } from 'jsonc-parser'
import { execSync, spawn } from 'node:child_process'
import * as fs from 'node:fs/promises'
import { EOL } from 'node:os';
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export default class New extends Command {
    static override args = {
        name: Args.string({
            description: 'Name of a new SvelteKit project to create',
            required: true
            })
    }
    static override description = 'Create a new SvelteKit project'
    static override flags = {
        analytics: Flags.string({description: 'Analytics platform to use', options: ['posthog']}),
        deployment: Flags.string({default: 'cloudflare', description: 'Platform to deploy the project to', options: ['cloudflare'], required: true}),
        marketing: Flags.boolean({allowNo: true, default: false, description: 'Whether to apply marketing template or not'}),
    }

    public async run(): Promise<void> {
        const { args, flags } = await this.parse(New)

        this.log(`[DANKU] Creating a new SvelteKit project "${args.name}"`)

        // 1. Create SvelteKit project
        await this.executeCommand('pnpm dlx', [
            'sv',
            'create',
            '--template',
            'minimal',
            '--types',
            'ts',
            '--no-add-ons',
            '--no-install',
            args.name
        ]);

        // 2. Add vite-plugin-devtools-json, ESLint, Playwright, Prettier, TailwindCSS, and Vitest
        await this.executeCommand('pnpm dlx', [
            'sv',
            'add',
            'devtools-json',
            '--no-install',
            '--cwd',
            args.name
        ]);
        await this.executeCommand('pnpm dlx', [
            'sv',
            'add',
            'eslint',
            '--no-install',
            '--cwd',
            args.name
        ]);
        await this.executeCommand('pnpm dlx', [
            'sv',
            'add',
            'playwright',
            '--no-install',
            '--cwd',
            args.name
        ]);
        await this.executeCommand('pnpm dlx', [
            'sv',
            'add',
            'prettier',
            '--no-install',
            '--cwd',
            args.name
        ]);
        await this.executeCommand('pnpm dlx', [
            'sv',
            'add',
            'tailwindcss="plugins:typography,forms"',
            '--no-install',
            '--cwd',
            args.name
        ]);
        await this.executeCommand('pnpm dlx', [
            'sv',
            'add',
            'vitest="usages:unit,component"',
            '--no-install',
            '--cwd',
            args.name
        ]);

        // 3. Add a correct Adapter and a template based on where this project is deployed to
        if (flags.deployment === 'cloudflare') {
            await this.executeCommand('pnpm dlx', [
                'sv',
                'add',
                'sveltekit-adapter=adapter:cloudflare',
                '--no-install',
                '--cwd',
                args.name
            ]);
            const templateSrcDir = join(join(dirname(fileURLToPath(import.meta.url)), '..', '..'), 'templates', 'deployment', 'cloudflare');
            const targetSrcDir = join(process.cwd(), args.name);
            await fs.cp(templateSrcDir, targetSrcDir, { force: true, recursive: true });

            const packageJsonPath = join(targetSrcDir, 'package.json');
            let packageJson = await fs.readFile(packageJsonPath, 'utf8');
            const packageJsonEditGroups = [
                {
                    path: ['scripts', 'preview'],
                    value: "pnpm run build && wrangler dev"
                },
                {
                    path: ['scripts', 'deploy'],
                    value: "pnpm run build && wrangler deploy"
                },
                {
                    path: ['scripts', 'cf-typegen'],
                    value: "wrangler types && move worker-configuration.d.ts src/"
                }
            ];
            for (const { path, value } of packageJsonEditGroups) {
                const edits = modify(packageJson, path, value, {
                    formattingOptions: { eol: EOL, insertSpaces: true, tabSize: 2 }
                });
                packageJson = applyEdits(packageJson, edits);
            }

            await fs.writeFile(packageJsonPath, packageJson);

            await this.executeCommand('pnpm', ['add', '-D', 'wrangler'], { cwd: args.name });
            await this.executeCommand('pnpm', ['add', '-D', '@cloudflare/workers-types'], { cwd: args.name });

            const tsConfigPath = join(targetSrcDir, 'tsconfig.json');
            let tsConfig = await fs.readFile(tsConfigPath, 'utf8');
            const tsConfigEditGroups = [
                {
                    path: ['compilerOptions', 'types'],
                    value: ["@cloudflare/workers-types/2023-07-01"]
                }
            ];
            for (const { path, value } of tsConfigEditGroups) {
                const edits = modify(tsConfig, path, value, {
                    formattingOptions: { eol: EOL, insertSpaces: true, tabSize: 4 }
                });
                tsConfig = applyEdits(tsConfig, edits);
            }

            await fs.writeFile(tsConfigPath, tsConfig);

            const wranglerPath = join(targetSrcDir, 'wrangler.jsonc');
            let wrangler = await fs.readFile(wranglerPath, 'utf8');
            const wranglerEditGroups = [
                {
                    path: ['name'],
                    value: args.name
                },
                {
                    path: ['compatibility_date'],
                    value: new Date().toISOString().slice(0, 10)
                }
            ];
            for (const { path, value } of wranglerEditGroups) {
                const edits = modify(wrangler, path, value, {
                    formattingOptions: { eol: EOL, insertSpaces: true, tabSize: 4 }
                });
                wrangler = applyEdits(wrangler, edits);
            }

            await fs.writeFile(wranglerPath, wrangler);
        }

        // 4. Add a marketing template if the flag is enabled
        if (flags.marketing) {
            const templateSrcDir = join(join(dirname(fileURLToPath(import.meta.url)), '..', '..'), 'templates', 'marketing');
            const targetSrcDir = join(process.cwd(), args.name);
            await fs.cp(templateSrcDir, targetSrcDir, { force: true, recursive: true });

            const layoutPath = join(targetSrcDir, 'src', 'routes', '+layout.svelte');
            const layout = await fs.readFile(layoutPath, 'utf8');
            const importsToAdd = `	import { PUBLIC_BASE_URL } from '$env/static/public';
	import { page } from '$app/state';`;
            const headContentToAdd = `<svelte:head>
	<meta property="og:url" content={PUBLIC_BASE_URL + page.url.pathname} />
	<link rel="canonical" href={PUBLIC_BASE_URL + page.url.pathname} />
	<meta property="og:description" content={page.data.description} />
	<meta property="og:image" content={PUBLIC_BASE_URL + '/og.png'} />
	<meta name="description" content={page.data.description} />
	<meta property="og:title" content={page.data.title} />
	<meta property="og:type" content="website" />
	<title>{page.data.title}</title>
</svelte:head>`;
            const scriptTagStart = '<script lang="ts">';
            const scriptStartPos = layout.indexOf(scriptTagStart);
            if (scriptStartPos !== -1) {
                let modifiedLayout = layout;
                const importInsertPos = scriptStartPos + scriptTagStart.length;
                modifiedLayout = modifiedLayout.slice(0, importInsertPos) + '\n' + importsToAdd + modifiedLayout.slice(importInsertPos);
                const newScriptEndPos = modifiedLayout.indexOf('</script>');
                const headInsertPos = newScriptEndPos + '</script>'.length;
                modifiedLayout = modifiedLayout.slice(0, headInsertPos) + '\n\n' + headContentToAdd + modifiedLayout.slice(headInsertPos);
                await fs.writeFile(layoutPath, modifiedLayout, 'utf8');
            }
        }

        // 5. Add analytics
        if (flags.analytics === 'posthog') {
            await this.executeCommand('pnpm', ['add', 'posthog-js'], { cwd: args.name });

            const templateSrcDir = join(join(dirname(fileURLToPath(import.meta.url)), '..', '..'), 'templates', 'analytics', 'posthog');
            const targetSrcDir = join(process.cwd(), args.name);
            await fs.cp(templateSrcDir, targetSrcDir, { force: true, recursive: true });

            const layoutPath = join(targetSrcDir, 'src', 'routes', '+layout.svelte');
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
            if (scriptStartPos !== -1) {
                let modifiedLayout = layout;
                const importInsertPos = scriptStartPos + scriptTagStart.length;
                modifiedLayout = modifiedLayout.slice(0, importInsertPos) + '\n' + importsToAdd + modifiedLayout.slice(importInsertPos);
                const newScriptEndPos = modifiedLayout.indexOf('</script>');
                modifiedLayout = modifiedLayout.slice(0, newScriptEndPos) + '\n' + postHogCodeToAdd + '\n' + modifiedLayout.slice(newScriptEndPos);
                await fs.writeFile(layoutPath, modifiedLayout, 'utf8');
            }
        }

        // 6. Add a default template
        const templateSrcDir = join(join(dirname(fileURLToPath(import.meta.url)), '..', '..'), 'templates', 'default');
        const targetSrcDir = join(process.cwd(), args.name);
        await fs.unlink(join(targetSrcDir, 'static', 'favicon.png'));
        await fs.cp(templateSrcDir, targetSrcDir, { force: true, recursive: true });

        // 7. Install dependencies
        await this.executeCommand('pnpm', ['install'], { cwd: args.name });

        // 8. Create a new GitHub repo
        await this.executeCommand('git', ['init'], { cwd: args.name });
        await this.executeCommand('git', ['add', '.'], { cwd: args.name });
        await this.executeCommand('git', ['commit', '-m', '"Initial commit"'], { cwd: args.name });

        const username = execSync('gh api user --jq .login', {
            cwd: args.name,
            encoding: 'utf8'
        }).trim();

        await this.executeCommand('gh', ['repo', 'create', args.name, '--private'], { cwd: args.name });
        await this.executeCommand('git', ['remote', 'add', 'origin', `https://github.com/${username}/${args.name}.git`], { cwd: args.name });
        await this.executeCommand('git', ['push', '-u', 'origin', 'main'], { cwd: args.name });
    }

    private executeCommand(command: string, args: string[], options: any = {}): Promise<void> {
        return new Promise((resolve, reject) => {
            const child = spawn(command, args, {
                shell: true,
                stdio: 'inherit',
                ...options
            })

            child.on('close', code => {
                if (code === 0) {
                    resolve()
                } else {
                    reject(new Error(`Command failed with exit code ${code}`))
                }
            })

            child.on('error', err => {
                reject(new Error(`Failed to execute command: ${err.message}`))
            })
        })
    }
}