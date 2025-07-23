import { Command } from '@oclif/core'
import { applyEdits, modify } from 'jsonc-parser'
import { spawn } from 'node:child_process'
import * as fs from 'node:fs/promises'
import { EOL } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Octokit, RequestError } from "octokit";

export default abstract class BaseCommand extends Command {
  private octokit?: Octokit
  private userLogin: string = ''

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
  protected async gitAddOrUpdateEnvVar(gitProvider: string, token: string, repositoryName: string, key: string, devValue: string, prodValue: string): Promise<boolean | string> {
    try {
      await this.octokit?.request('PUT /repos/{owner}/{repo}/environments/{environment_name}', {
        // eslint-disable-next-line camelcase
        environment_name: 'Production',
        owner: this.userLogin,
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
      await this.octokit?.request('GET /repos/{owner}/{repo}/environments/{environment_name}/variables/{name}', {
        // eslint-disable-next-line camelcase
        environment_name: 'Production',
        name: key,
        owner: this.userLogin,
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
        await this.octokit?.request('PATCH /repos/{owner}/{repo}/environments/{environment_name}/variables/{name}', {
          // eslint-disable-next-line camelcase
          environment_name: 'Production',
          name: key,
          owner: this.userLogin,
          repo: repositoryName,
          value: prodValue
        });
      } else {
        await this.octokit?.request('POST /repos/{owner}/{repo}/environments/{environment_name}/variables/', {
          // eslint-disable-next-line camelcase
          environment_name: 'Production',
          name: key,
          owner: this.userLogin,
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

  protected async gitCreateRepository(gitProvider: string, token: string, repositoryName: string): Promise<string> {
    switch (gitProvider) {
      default: {
        const validateToken = await this.gitValidateToken(gitProvider, token);
        if (typeof validateToken === 'string') {
          return validateToken;
        }

        try {
          await this.octokit?.request('POST /user/repos', {
            name: repositoryName,
            private: true
          });
        } catch (error) {
          if (error instanceof RequestError || error instanceof Error) {
            return `Failed to create repository: ${error.message}`;
          }

          return 'Failed to create repository: Unknown error';
        }

        return `https://github.com/${this.userLogin}/${repositoryName}.git`;
      }
    }
  }

  protected async gitRepositoryExists(gitProvider: string, token: string, repositoryName: string): Promise<boolean | string> {
    switch (gitProvider) {
      default: {
        const validateToken = await this.gitValidateToken(gitProvider, token);
        if (typeof validateToken === 'string') {
          return validateToken;
        }

        try {
          await this.octokit?.request('GET /repos/{owner}/{repo}', {
            owner: this.userLogin,
            repo: repositoryName
          });
          return true;
        } catch (error) {
          if (error instanceof RequestError && error.status === 404) {
            return false;
          }

          if (error instanceof RequestError || error instanceof Error) {
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

  protected async modifyJsonFile(
    filePath: string,
    edits: Array<{ path: (number | string)[], value: any }>,
    projectName?: string
  ): Promise<void> {
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

  private async gitValidateToken(gitProvider: string, token: string): Promise<boolean | string> {
    switch (gitProvider) {
      default: {
        if (this.userLogin) {
          return true;
        }

        this.octokit = new Octokit({ auth: token });

        try {
          const { data: user } = await this.octokit.request('GET /user');
          this.userLogin = user.login;
          return true;
        } catch (error) {
          if (error instanceof RequestError) {
            if (error.status === 401) {
              return 'Invalid GitHub token: Authentication failed';
            }

            if (error.status === 403) {
              return 'GitHub token has insufficient permissions';
            }

            return `GitHub API error: ${error.message}`;
          }

          return error instanceof Error ? `Network error: ${error.message}` : 'An unexpected error occurred';
        }
      }
    }
  }
}
