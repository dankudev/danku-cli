import { password } from '@inquirer/prompts'
import { Args, Flags } from '@oclif/core'
import * as fs from 'node:fs/promises'
import {basename, join} from 'node:path'

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
        boilerplate: Flags.string({char: 'b', description: 'Boilerplate to use', options: ['marketing', 'saas-fs']}),
        'cloudflare-account-id': Flags.string({ description: 'CloudFlare account ID, required for CloudFlare target'}),
        git: Flags.string({char: 'g', default: 'github', description: 'Git provider for repository hosting', options: ['github']}),
        target: Flags.string({char: 't', default: 'cloudflare', description: 'Deployment target (platform)', options: ['cloudflare']}),
        url: Flags.string({
            char: 'u',
            description: 'Domain where the application will be accessed (must start with https://)',
            async parse(input) {
                if (!input.startsWith('https://')) {
                    throw new Error('URL must start with https://');
                }

                while (input.endsWith('/')) {
                    input = input.slice(0, -1);
                }

                return input;
            },
            required: true
        })
    }

    public async run(): Promise<void> {
        const { args, flags } = await this.parse(New);

        this.log(`DANKU🧊 Creating a new SvelteKit project "${args.name}"`);

        if (flags.target === 'cloudflare' && !flags['cloudflare-account-id']) {
            this.error('CloudFlare account ID is required for CloudFlare target');
        }

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

        const targetToken = await password({
            mask: true,
            message: 'Enter your API token for the deployment target:',
            validate: async (input) => {
                const resourceExists = await this.targetResourceExists(flags.target, input, args.name, flags['cloudflare-account-id']);
                if (typeof resourceExists === 'string') {
                    return resourceExists;
                }

                return resourceExists ? 'Resource already exists' : true;
            }
        });

        // 1. Create a new git repo
        const createRepository = await this.gitCreateRepository(flags.git, gitToken, args.name);
        if (!createRepository.startsWith('https://github.com/')) {
            this.error(createRepository);
        }

        // 2. Create SvelteKit project
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

        // 3. Add vite-plugin-devtools-json, ESLint, Playwright, Prettier, TailwindCSS, and Vitest
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

        // 4. Add default boilerplate
        await this.copyTemplateFiles('boilerplate/default', args.name);
        await fs.unlink(join(process.cwd(), args.name, 'static', 'favicon.svg'));

        // 5. Add marketing boilerplate if needed
        if (flags.boilerplate === 'marketing') {
            const addOrUpdateEnvVariable = await this.gitAddOrUpdateEnvVariable(flags.git, gitToken, args.name, 'BASE_URL', 'http://localhost:5173', flags.url);
            if (typeof addOrUpdateEnvVariable === 'string') {
                this.error(addOrUpdateEnvVariable);
            }

            await this.copyTemplateFiles('boilerplate/marketing', args.name);
        }

        // 6. Add SaaS (Full Stack) boilerplate if needed
        if (flags.boilerplate === 'saas-fs') {
            const addOrUpdateEnvVariable = await this.gitAddOrUpdateEnvVariable(flags.git, gitToken, args.name, 'BASE_URL', 'http://localhost:5173', flags.url);
            if (typeof addOrUpdateEnvVariable === 'string') {
                this.error(addOrUpdateEnvVariable);
            }

            await this.copyTemplateFiles('boilerplate/marketing', args.name);
        }

        // 7. Add a correct Adapter and a template based on where this project is deployed to
        switch (flags.target) {
            default: {
                let createResources = '';
                if (flags.boilerplate === 'saas-fs') {
                    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                    createResources = await this.targetCreateResources(flags.target, targetToken, args.name, flags['cloudflare-account-id']);
                    if (!UUID_REGEX.test(createResources)) {
                        this.error(createResources);
                    }
                }

                const gitAddOrUpdateVariable = await this.gitAddOrUpdateVariable(flags.git, gitToken, args.name, 'CLOUDFLARE_ACCOUNT_ID', flags['cloudflare-account-id'] ?? '');
                if (typeof gitAddOrUpdateVariable === 'string') {
                    this.error(gitAddOrUpdateVariable);
                }

                const addOrUpdateSecret = await this.gitAddOrUpdateSecret(flags.git, gitToken, args.name, 'CLOUDFLARE_API_TOKEN', targetToken);
                if (typeof addOrUpdateSecret === 'string') {
                    this.error(addOrUpdateSecret);
                }

                await this.copyTemplateFiles('boilerplate/cloudflare', args.name); // TODO we need to construct .yml files ourservles, because we might have extra variables, etc.

                await this.executeCommand('pnpm dlx', [
                    'sv',
                    'add',
                    'sveltekit-adapter=adapter:cloudflare',
                    '--install pnpm',
                    '--cwd',
                    args.name
                ]);

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
                        value: flags.url.slice(8)
                    }
                ], args.name);
                if (flags.boilerplate === 'saas-fs') {
                    await this.modifyJsonFile('wrangler.jsonc', [
                        {
                            path: ['d1_databases', 0, 'binding'],
                            value: "DB"
                        },
                        {
                            path: ['d1_databases', 0, 'database_name'],
                            value: args.name
                        },
                        {
                            path: ['d1_databases', 0, 'database_id'],
                            value: createResources
                        }
                    ], args.name);
                }

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
                        value: ["src/worker-configuration.d.ts"]
                    }
                ], args.name);

                await this.executeCommand('pnpm', ['add', '-D', 'wrangler'], { cwd: args.name });
                await this.executeCommand('pnpm', ['run', 'cf-typegen'], { cwd: args.name });
            }
        }

        // 8. Initialize a new git repo and push local to remote
        await this.executeCommand('git', ['init'], { cwd: args.name });
        await this.executeCommand('git', ['add', '.'], { cwd: args.name });
        await this.executeCommand('git', ['commit', '-m', '"Initial commit"'], { cwd: args.name });
        await this.executeCommand('git', ['remote', 'add', 'origin', createRepository], { cwd: args.name });
        await this.executeCommand('git', ['push', '-u', 'origin', 'main'], { cwd: args.name });

        this.log(`DANKU✅ Successfully created SvelteKit project "${args.name}"`);
    }
}