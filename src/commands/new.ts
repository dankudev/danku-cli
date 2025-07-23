import { password } from '@inquirer/prompts'
import { Args, Flags } from '@oclif/core'
import * as fs from 'node:fs/promises'
import { join } from 'node:path'

import BaseCommand from '../base-command.js'

export default class New extends BaseCommand {
    static override args = {
        name: Args.string({
            description: 'Name of a new SvelteKit project to create',
            required: true
            })
    }
    static override description = 'Creates a new SvelteKit project with git provider setup and integrated deployment, automatically configuring your chosen platform and creating a repository'
    static override flags = {
        git: Flags.string({char: 'g', default: 'GitHub', description: 'Git provider for repository hosting', options: ['GitHub']}),
        target: Flags.string({char: 't', default: 'CloudFlare', description: 'Deployment target (platform)', options: ['CloudFlare']}),
        url: Flags.string({
            char: 'u',
            description: 'Domain where the application will be accessed (must start with https://)',
            async parse(input) {
                if (!input.startsWith('https://')) {
                    throw new Error('URL must start with https://');
                }

                let url = input.slice(8);
                while (url.endsWith('/')) {
                    url = url.slice(0, -1);
                }

                return url;
            },
            required: true
        })
    }

    public async run(): Promise<void> {
        const { args, flags } = await this.parse(New);

        let directoryExists = true;
        try {
            await fs.access(join(process.cwd(), args.name));
        }
        catch {
            directoryExists = false;
        }

        if (directoryExists) {
            this.error(`Directory ${args.name} already exists`);
        }

        const gitToken = await password({
            mask: true,
            message: 'Enter your API token for the git provider:',
            validate: async (input) => {
                const repositoryExists = await this.gitRepositoryExists(flags.git, input, args.name);
                if (typeof repositoryExists === 'string') {
                    return repositoryExists;
                }

                return repositoryExists ? 'Repository already exists' : true;
            }
        });

        // const targetToken = await password({
        //     mask: true,
        //     message: 'Enter your API token for the deployment target:',
        //     async validate(input) {
        //         if (input.length < 10) {
        //             return 'API key must be at least 10 characters'
        //         }
        //
        //         return true
        //     }
        // });

        this.log(`DANKU🧊 Creating a new SvelteKit project "${args.name}"`);

        // 1. Create SvelteKit project
        await this.executeCommand('pnpm dlx', [
            'sv',
            'create',
            '--template',
            'minimal',
            '--types',
            'ts',
            '--no-add-ons',
            '--install pnpm',
            args.name
        ]);

        // 2. Add vite-plugin-devtools-json, ESLint, Playwright, Prettier, TailwindCSS, and Vitest
        await this.executeCommand('pnpm dlx', [
            'sv',
            'add',
            'devtools-json',
            '--install pnpm',
            '--cwd',
            args.name
        ]);
        await this.executeCommand('pnpm dlx', [
            'sv',
            'add',
            'eslint',
            '--install pnpm',
            '--cwd',
            args.name
        ]);
        await this.executeCommand('pnpm dlx', [
            'sv',
            'add',
            'playwright',
            '--install pnpm',
            '--cwd',
            args.name
        ]);
        await this.executeCommand('pnpm dlx', [
            'sv',
            'add',
            'prettier',
            '--install pnpm',
            '--cwd',
            args.name
        ]);
        await this.executeCommand('pnpm dlx', [
            'sv',
            'add',
            'tailwindcss="plugins:typography,forms"',
            '--install pnpm',
            '--cwd',
            args.name
        ]);
        await this.executeCommand('pnpm dlx', [
            'sv',
            'add',
            'vitest="usages:unit,component"',
            '--install pnpm',
            '--cwd',
            args.name
        ]);

        // 3. Add a correct Adapter and a template based on where this project is deployed to
        switch (flags.target) {
            default: {
                await this.executeCommand('pnpm dlx', [
                    'sv',
                    'add',
                    'sveltekit-adapter=adapter:cloudflare',
                    '--install pnpm',
                    '--cwd',
                    args.name
                ]);

                await this.copyTemplateFiles(`git/${flags.git}/cloudflare`, args.name);
                await this.copyTemplateFiles('target/cloudflare', args.name);

                await this.executeCommand('pnpm', ['add', '-D', 'wrangler'], { cwd: args.name });
                await this.executeCommand('pnpm', ['add', '-D', '@cloudflare/workers-types'], { cwd: args.name });

                await this.modifyJsonFile('package.json', [
                    {
                        path: ['scripts', 'preview'],
                        value: "vite preview && wrangler dev"
                    },
                    {
                        path: ['scripts', 'cf-typegen'],
                        value: "wrangler types && move worker-configuration.d.ts src/"
                    }
                ], args.name);
                await this.modifyJsonFile('tsconfig.json', [
                    {
                        path: ['compilerOptions', 'types'],
                        value: ["@cloudflare/workers-types/2023-07-01"]
                    }
                ], args.name);
                await this.modifyJsonFile('wrangler.jsonc', [
                    {
                        path: ['name'],
                        value: args.name
                    },
                    {
                        path: ['compatibility_date'],
                        value: new Date().toISOString().slice(0, 10)
                    },
                    {
                        path: ['routes', 0, 'pattern'],
                        value: flags.url
                    }
                ], args.name);
            }
        }

        // 4. Add the default template
        await this.copyTemplateFiles('default', args.name);
        await fs.unlink(join(process.cwd(), args.name, 'static', 'favicon.svg'));

        // 5. Initialize a new git repo
        await this.executeCommand('git', ['init'], { cwd: args.name });
        await this.executeCommand('git', ['add', '.'], { cwd: args.name });
        await this.executeCommand('git', ['commit', '-m', '"Initial commit"'], { cwd: args.name });

        // 6. Create a new git repo and push local to remote
        const createRepository = await this.gitCreateRepository(flags.git, gitToken, args.name);
        if (!createRepository.startsWith('https://github.com/')) {
            this.error(createRepository);
        }

        await this.executeCommand('git', ['remote', 'add', 'origin', createRepository], { cwd: args.name });
        await this.executeCommand('git', ['push', '-u', 'origin', 'main'], { cwd: args.name });

        this.log(`DANKU✅ Successfully created SvelteKit project "${args.name}"`);
    }
}