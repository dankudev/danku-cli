# DANKU CLI


[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/danku.svg)](https://npmjs.org/package/danku)
[![Downloads/week](https://img.shields.io/npm/dw/danku.svg)](https://npmjs.org/package/danku)


<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
## Usage
```sh-session
$ pnpm add -g danku
$ danku COMMAND
running command...
$ danku (--version)
danku/0.0.0 win32-x64 node-v22.14.0
$ danku --help [COMMAND]
USAGE
  $ danku COMMAND
...
```
## Commands
<!-- commands -->
* [`danku hello PERSON`](#danku-hello-person)
* [`danku hello world`](#danku-hello-world)
* [`danku help [COMMAND]`](#danku-help-command)

### `danku hello PERSON`

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

### `danku hello world`

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

### `danku help [COMMAND]`

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
<!-- commandsstop -->
