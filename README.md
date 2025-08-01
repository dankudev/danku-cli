# DANKU CLI

[![Version](https://img.shields.io/npm/v/danku.svg)](https://npmjs.org/package/danku)
[![Downloads/week](https://img.shields.io/npm/dw/danku.svg)](https://npmjs.org/package/danku)

## Usage

```sh-session
$ pnpm add -g danku
$ danku command
running command...
$ danku (--version)
danku/0.0.0 win32-x64 node-v22.14.0
$ danku --help [command]
USAGE
  $ danku command
...
```

## Commands

- [`danku components <name>`](#danku-components-name)
- [`danku help [command]`](#danku-help-command)
- [`danku new <name>`](#danku-new-name)

## `danku components <name>`

Creates or updates a component in your SvelteKit project

```
USAGE
  $ danku components <name>

ARGUMENTS
  <name>  Name of a component to create or update

DESCRIPTION
  Creates or updates a component in your SvelteKit project
```

_See code: [src/commands/components.ts](https://github.com/dankudev/danku-cli/blob/main/src/commands/components.ts)_

## `danku help [command]`

Display help for danku.

```
USAGE
  $ danku help [command] [-n]

ARGUMENTS
  [command]  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for danku.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/main/src/commands/help.ts)_

## `danku new <name>`

Creates a new SvelteKit project with git provider setup and integrated deployment, automatically configuring your chosen platform and creating a repository

```
USAGE
  $ danku new <name>

ARGUMENTS
  <name>  Name of a new SvelteKit project to create

DESCRIPTION
  Creates a new SvelteKit project with git provider setup and integrated deployment, automatically configuring your
  chosen platform and creating a repository
```

_See code: [src/commands/new.ts](https://github.com/dankudev/danku-cli/blob/main/src/commands/new.ts)_

### Prerequisites

- Install [pnpm](https://pnpm.io/installation)
- Install [Git](https://git-scm.com/downloads)

### Configuration

When you run this command for the first time, a default configuration file is created at the following location in your home directory:

- **Windows:** `%USERPROFILE%\.danku\cli\node\.config.jsonc`
- **Linux/macOS:** `~/.danku/cli/node/config.jsonc`

It will look like this:

```

```

#### Boilerplate

At most, **one** boilerplate may be configured.

##### Marketing

What exactly does this boilerplate do?

- TODO pre-rendering capabilities
- Adds `<svelte:head>` section inside of `+layout.svelte` with SEO metadata (titles, meta descriptions, etc.) for search engine optimization
- Adds `/sitemap.xml` and `/robots.txt` pages for better crawlability
- Adds `/privacy-policy` and `/terms-of-service` pages for legal compliance
- TODO POSTHOG

If you wish to use Marketing boilerplate:

1. Uncomment `marketing` section in your configuration file

##### SaaS (Full Stack)

What exactly does this boilerplate do?

- TODO EVERYTHING FROM MARKETING BOILERPLATE
- TODO STRIPE
- TODO BETTERAUTH
- TODO LOOPS

If you wish to use SaaS (Full Stack) boilerplate:

1. Uncomment `saasFs` section in your configuration file

#### Deployment target

Exactly **one** deployment target must be configured.

##### CloudFlare

If you wish to use CloudFlare as your deployment target:

1. Uncomment `cloudFlare` section in your configuration file
    ```
     "cloudFlare": {
       "accountId": "",
       "token": "",
       "url": ""
     }
    ```
2. Navigate to your **Account Home**, click the **three-dot icon**, then **Copy account ID**, and finally paste it into your configuration file
    ```
     "cloudFlare": {
       "accountId": "<my-cloudflare-account-id>",
       ...
     }
    ```
3. Go to **Manage Account > Account API Tokens** and click **Create Token**
4. Locate a **Edit Cloudflare Workers** template and click **Use template**
5. Give this token a unique name (e.g. 'my-cute-website')
6. Click **Add more** under **Permissions** and select **Account - D1 - Edit**
7. Set the specific zone to the desired **zone** (if you don't have any zones, create one by navigating to your **Account Home** and clicking **Onboard a domain**)
8. Click **Continue to summary** and **Create Token** to create your account API token
9. Copy your token and paste it into your configuration file
    ```
     "cloudFlare": {
       ...
       "token": "<my-cloudflare-token>",
       ...
     }
    ```
10. Set the `url` value in your configuration file to match the domain (zone) you created in Cloudflare. This should be the exact website URL your application will be served from. Must start with `https://` and NOT end with `/`.

```
 "cloudFlare": {
   ...
   "url": "https://my-cute-website.com"
 }
```

#### Git provider

Exactly **one** Git provider must be configured.

##### GitHub

If you wish to use GitHub as your Git provider:

1. Uncomment `gitHub` section in your configuration file
    ```
     "gitHub": {
       "token": ""
     }
    ```
2. Click [here](https://github.com/settings/personal-access-tokens/new)
3. Give this token a unique name (e.g. 'danku-cli')
4. Set **Resource owner** to the desired **organization** (if you don't have any organizations, create one [here](https://github.com/organizations/plan))
5. Set **Repository access** to **All repositories**
6. Choose the following **Organization permissions**: **Read access to members**
7. Choose the following **Repository permissions**: **Read access to metadata**, **Read and Write access to actions variables, administration, environments, and secrets**
8. Click **Generate token** to create your personal access token
9. Copy your token and paste it into your configuration file
    ```
     "gitHub": {
       "token": "<my-github-token>"
     }
    ```
