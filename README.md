danku
=================

DANKU CLI


[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/danku.svg)](https://npmjs.org/package/danku)
[![Downloads/week](https://img.shields.io/npm/dw/danku.svg)](https://npmjs.org/package/danku)


<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g danku
$ danku COMMAND
running command...
$ danku (--version)
danku/0.0.0 win32-x64 node-v22.14.0
$ danku --help [COMMAND]
USAGE
  $ danku COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`danku hello PERSON`](#danku-hello-person)
* [`danku hello world`](#danku-hello-world)
* [`danku help [COMMAND]`](#danku-help-command)
* [`danku plugins`](#danku-plugins)
* [`danku plugins add PLUGIN`](#danku-plugins-add-plugin)
* [`danku plugins:inspect PLUGIN...`](#danku-pluginsinspect-plugin)
* [`danku plugins install PLUGIN`](#danku-plugins-install-plugin)
* [`danku plugins link PATH`](#danku-plugins-link-path)
* [`danku plugins remove [PLUGIN]`](#danku-plugins-remove-plugin)
* [`danku plugins reset`](#danku-plugins-reset)
* [`danku plugins uninstall [PLUGIN]`](#danku-plugins-uninstall-plugin)
* [`danku plugins unlink [PLUGIN]`](#danku-plugins-unlink-plugin)
* [`danku plugins update`](#danku-plugins-update)

## `danku hello PERSON`

Say hello

```
USAGE
  $ danku hello PERSON -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ danku hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [src/commands/hello/index.ts](https://github.com/DANKU/danku-cli/blob/v0.0.0/src/commands/hello/index.ts)_

## `danku hello world`

Say hello world

```
USAGE
  $ danku hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ danku hello world
  hello world! (./src/commands/hello/component.ts)
```

_See code: [src/commands/hello/component.ts](https://github.com/DANKU/danku-cli/blob/v0.0.0/src/commands/hello/world.ts)_

## `danku help [COMMAND]`

Display help for danku.

```
USAGE
  $ danku help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for danku.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.26/src/commands/help.ts)_

## `danku plugins`

List installed plugins.

```
USAGE
  $ danku plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ danku plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.34/src/commands/plugins/index.ts)_

## `danku plugins add PLUGIN`

Installs a plugin into danku.

```
USAGE
  $ danku plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into danku.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the DANKU_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the DANKU_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ danku plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ danku plugins add myplugin

  Install a plugin from a github url.

    $ danku plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ danku plugins add someuser/someplugin
```

## `danku plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ danku plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ danku plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.34/src/commands/plugins/inspect.ts)_

## `danku plugins install PLUGIN`

Installs a plugin into danku.

```
USAGE
  $ danku plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into danku.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the DANKU_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the DANKU_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ danku plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ danku plugins install myplugin

  Install a plugin from a github url.

    $ danku plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ danku plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.34/src/commands/plugins/install.ts)_

## `danku plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ danku plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ danku plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.34/src/commands/plugins/link.ts)_

## `danku plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ danku plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ danku plugins unlink
  $ danku plugins remove

EXAMPLES
  $ danku plugins remove myplugin
```

## `danku plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ danku plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.34/src/commands/plugins/reset.ts)_

## `danku plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ danku plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ danku plugins unlink
  $ danku plugins remove

EXAMPLES
  $ danku plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.34/src/commands/plugins/uninstall.ts)_

## `danku plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ danku plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ danku plugins unlink
  $ danku plugins remove

EXAMPLES
  $ danku plugins unlink myplugin
```

## `danku plugins update`

Update installed plugins.

```
USAGE
  $ danku plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.34/src/commands/plugins/update.ts)_
<!-- commandsstop -->
