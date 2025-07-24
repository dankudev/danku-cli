import { Command } from '@oclif/core'
import { Cloudflare, CloudflareError } from "cloudflare"
import { applyEdits, modify } from 'jsonc-parser'
import sodium from 'libsodium-wrappers'
import { spawn } from 'node:child_process'
import * as fs from 'node:fs/promises'
import { EOL } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Octokit, RequestError } from "octokit"

export default abstract class BaseCommand extends Command {
  private cloudflare = new Cloudflare();
  private octokit = new Octokit();
  private owner = ''

  protected async copyTemplateFiles(templatePath: string, projectName?: string): Promise<void> {
    const templateSrcDir = join(join(dirname(fileURLToPath(import.meta.url)), '..'), 'templates', ...templatePath.split('/'));
    const targetSrcDir = projectName ? join(process.cwd(), projectName) : process.cwd();
    await fs.cp(templateSrcDir, targetSrcDir, { force: true, recursive: true });
  }

  protected executeCommand(command: string, args: string[], options: any = {}): Promise<void> {
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

  // eslint-disable-next-line max-params
  protected async gitAddOrUpdateEnvVariable(gitProvider: string, token: string, repositoryName: string, key: string, devValue: string, prodValue: string): Promise<boolean | string> {
    try {
      await this.octokit.request('PUT /repos/{owner}/{repo}/environments/{environment_name}', {
        // eslint-disable-next-line camelcase
        environment_name: 'Production',
        owner: this.owner,
        repo: repositoryName
      });
    } catch (error) {
      if (error instanceof RequestError || error instanceof Error) {
        return `Failed to create or update environment: ${error.message}`;
      }

      return 'Failed to create or update environment: Unknown error';
    }

    let variableExists = true;
    try {
      await this.octokit.request('GET /repos/{owner}/{repo}/environments/{environment_name}/variables/{name}', {
        // eslint-disable-next-line camelcase
        environment_name: 'Production',
        name: key,
        owner: this.owner,
        repo: repositoryName
      });
    } catch (error) {
      if (error instanceof RequestError && error.status === 404) {
        variableExists = false;
      }
    }

    try {
      // eslint-disable-next-line unicorn/prefer-ternary
      if (variableExists) {
        await this.octokit.request('PATCH /repos/{owner}/{repo}/environments/{environment_name}/variables/{name}', {
          // eslint-disable-next-line camelcase
          environment_name: 'Production',
          name: key,
          owner: this.owner,
          repo: repositoryName,
          value: prodValue
        });
      } else {
        await this.octokit.request('POST /repos/{owner}/{repo}/environments/{environment_name}/variables/', {
          // eslint-disable-next-line camelcase
          environment_name: 'Production',
          name: key,
          owner: this.owner,
          repo: repositoryName,
          value: prodValue
        });
      }
    } catch (error) {
      if (error instanceof RequestError || error instanceof Error) {
        return `Failed to create variable: ${error.message}`;
      }

      return 'Failed to create variable: Unknown error';
    }

    const envPath = join(process.cwd(), '.env');
    let envContent = '';

    try {
      envContent = await fs.readFile(envPath, 'utf8');
    } catch {
      // File doesn't exist, that's fine
    }

    if (envContent.includes(key)) {
      const lines = envContent.split('\n');
      const updatedLines = lines.map(line => {
        if (line.startsWith(`PUBLIC_${key}=`)) {
          return `PUBLIC_${key}=${devValue}`;
        }

        return line;
      });
      envContent = updatedLines.join('\n');
    } else {
      if (envContent && !envContent.endsWith('\n')) {
        envContent += '\n';
      }

      envContent += `PUBLIC_${key}=${devValue}\n`;
    }

    await fs.writeFile(envPath, envContent, 'utf8');

    return true;
  }

  // eslint-disable-next-line max-params
  protected async gitAddOrUpdateSecret(gitProvider: string, token: string, repositoryName: string, key: string, value: string): Promise<boolean | string> {
    switch (gitProvider) {
      default: {
        try {
          const { data: { key: publicKey, key_id: keyId } } = await this.octokit.request('GET /repos/{owner}/{repo}/actions/secrets/public-key', {
            owner: this.owner,
            repo: repositoryName
          });

          await sodium.ready;
          const keyBytes = sodium.from_base64(publicKey, sodium.base64_variants.ORIGINAL);
          const secretBytes = sodium.from_string(value);
          const encryptedBytes = sodium.crypto_box_seal(secretBytes, keyBytes);
          const encryptedValue = sodium.to_base64(encryptedBytes, sodium.base64_variants.ORIGINAL);

          await this.octokit.request('PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}', {
            // eslint-disable-next-line camelcase
            encrypted_value: encryptedValue,
            // eslint-disable-next-line camelcase
            key_id: keyId,
            owner: this.owner,
            repo: repositoryName,
            // eslint-disable-next-line camelcase
            secret_name: key
          });
          return true;

        } catch (error) {
          if (error instanceof RequestError || error instanceof Error) {
            return `Failed to add/update secret: ${error.message}`;
          }

          return 'Failed to add/update secret: Unknown error';
        }
      }
    }
  }

  // eslint-disable-next-line max-params
  protected async gitAddOrUpdateVariable(gitProvider: string, token: string, repositoryName: string, key: string, value: string): Promise<boolean | string> {
    switch (gitProvider) {
      default: {
        try {
          let variableExists = true;
          try {
            await this.octokit.request('GET /repos/{owner}/{repo}/actions/variables/{name}', {
              name: key,
              owner: this.owner,
              repo: repositoryName
            });
          } catch {
            variableExists = false;
          }

          // eslint-disable-next-line unicorn/prefer-ternary
          if (variableExists) {
            await this.octokit.request('PATCH /repos/{owner}/{repo}/actions/variables/{name}', {
              name: key,
              owner: this.owner,
              repo: repositoryName,
              value
            });
          } else {
            // Create new variable
            await this.octokit.request('POST /repos/{owner}/{repo}/actions/variables', {
              name: key,
              owner: this.owner,
              repo: repositoryName,
              value
            });
          }

          return true;

        } catch (error) {
          if (error instanceof RequestError || error instanceof Error) {
            return `Failed to add/update variable: ${error.message}`;
          }

          return 'Failed to add/update variable: Unknown error';
        }
      }
    }
  }

  protected async gitCreateRepository(gitProvider: string, token: string, repositoryName: string): Promise<string> {
    switch (gitProvider) {
      default: {
        try {
          await this.octokit.request('POST /orgs/{org}/repos', {
            name: repositoryName,
            org: this.owner,
            private: true
          });
        } catch (error) {
          if (error instanceof RequestError || error instanceof Error) {
            return `Failed to create repository: ${error.message}`;
          }

          return 'Failed to create repository: Unknown error';
        }

        return `https://github.com/${this.owner}/${repositoryName}.git`;
      }
    }
  }

  protected async gitRepositoryExists(gitProvider: string, token: string, repositoryName: string): Promise<boolean | string> {
    switch (gitProvider) {
      default: {
        this.octokit = new Octokit({ auth: token });
        try {
          const { data: memberships } = await this.octokit.request('GET /user/memberships/orgs');
          if (memberships.length === 0) {
            return 'You do not have access to any organizations. Please try again with a different token.';
          }

          this.owner = memberships[0].organization.login;
        } catch (error) {
          if (error instanceof RequestError && error.status === 401) {
              return 'Invalid GitHub token';
          }

          if (error instanceof RequestError && error.status === 403) {
            return 'GitHub token has insufficient permissions';
          }

          if (error instanceof RequestError) {
            return error.message;
          }

          return 'Unknown GitHub API error';
          }

        try {
          await this.octokit.request('GET /repos/{owner}/{repo}', {
            owner: this.owner,
            repo: repositoryName
          });
          return true;
        } catch (error) {
          if (error instanceof RequestError && error.status === 404) {
            return false;
          }

          if (error instanceof RequestError && error.status === 403) {
            return 'GitHub token has insufficient permissions';
          }

          if (error instanceof RequestError) {
            return `Failed to check repository: ${error.message}`;
          }

          return 'Failed to check repository: Unknown error';
        }
      }
    }
  }

  protected async isSvelteKitProject(): Promise<boolean> {
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJsonExists = await fs.access(packageJsonPath).then(() => true).catch(() => false);

    if (!packageJsonExists) return false;

    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    const deps = { ...packageJson.devDependencies };

    return Boolean(deps['@sveltejs/kit']);
  }

  protected async modifyJsonFile(filePath: string, edits: Array<{ path: (number | string)[], value: any }>, projectName?: string): Promise<void> {
    const fullPath = projectName ? join(process.cwd(), projectName, filePath) : join(process.cwd(), filePath);
    let fileContent = await fs.readFile(fullPath, 'utf8');

    for (const { path, value } of edits) {
      const formattingOptions = {
        eol: EOL,
        insertSpaces: true,
        tabSize: 4
      };

      const jsonEdits = modify(fileContent, path, value, { formattingOptions });
      fileContent = applyEdits(fileContent, jsonEdits);
    }

    await fs.writeFile(fullPath, fileContent, 'utf8');
  }

  protected async targetCreateResources(deploymentTarget: string, token: string, resourceName: string, accountId?: string): Promise<string> {
    switch (deploymentTarget) {
      default: {
        try {
          // eslint-disable-next-line camelcase
          const d1 = await this.cloudflare.d1.database.create({ account_id: accountId ?? '', name: resourceName });

          return d1.uuid ?? '';
        } catch (error) {
          if (error instanceof CloudflareError) {
            return `Failed to create resources: ${error.message}`;
          }

          return 'Failed to create resources: Unknown error';
        }

        // return `https://github.com/${this.owner}/${repositoryName}.git`;
      }
    }
  }

  protected async targetResourceExists(deploymentTarget: string, token: string, resourceName: string, accountId?: string): Promise<boolean | string> {
    switch (deploymentTarget) {
      default: {
        this.cloudflare = new Cloudflare({ apiToken: token });
        try {
          // eslint-disable-next-line camelcase
          const verification = await this.cloudflare.accounts.tokens.verify({ account_id: accountId ?? '' });
          if (verification.status !== 'active') {
            return "Cloudflare API token is not active";
          }
        } catch {
          return "Invalid Cloudflare account ID or API token";
        }
        try {
          // eslint-disable-next-line camelcase
          for await (const script of this.cloudflare.workers.scripts.list({ account_id: accountId ?? '' })) {
            if (script.id === resourceName) {
              return true;
            }
          }

          // eslint-disable-next-line camelcase
          for await (const databaseListResponse of this.cloudflare.d1.database.list({ account_id: accountId ?? '' })) {
            if (databaseListResponse.name === resourceName) {
              return true;
            }
          }

          return false;
        } catch (error) {
          if (error instanceof CloudflareError) {
            return `Failed to check resources: ${error.message}`;
          }

          return 'Failed to check resources: Unknown error';
        }
      }
    }
  }
}
