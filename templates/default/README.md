# DANKU CLI

Everything you need to build a SvelteKit application, powered by [danku-cli](https://github.com/dankudev/danku-cli).

## Prerequisites

- Install [Git](https://git-scm.com/downloads)
- Create a personal access token with *repo* and *user* scopes on [GitHub](https://github.com/settings/tokens/new)
- Create a personal access token on [CloudFlare](https://github.com/settings/tokens/new)

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# Create a new SvelteKit project with git provider setup and integrated deployment, automatically configuring your chosen platform and creating a repository
pnpm dlx danku new NAME --url <value>

cd NAME
```

Optionally, you can add modules to speed up your development.

### Marketing module

This module optimizes your Svelte application for search engines by adding a `<svelte:head>` section with SEO metadata (titles, meta descriptions, etc.), generating `sitemap.xml` and `robots.txt` pages for better crawlability, and including essential `privacy-policy` and `terms-of-service` pages for legal compliance.

```bash
# Creates or updates the marketing module in the current SvelteKit project
pnpm dlx danku modules marketing
```

### SaaS module

```bash
# Creates or updates the SaaS module in the current SvelteKit project
pnpm dlx danku modules saas
```

## Developing

```bash
pnpm run dev
# or
pnpm run dev --open
```

Remember to add the following:
- 1
- 2
- 3

## Deploying