import { spawn, type SpawnOptions } from 'child_process';

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

/**
 * Executa um comando de forma assíncrona usando spawn.
 */
export const execAsync = (
  command: string,
  args: string[],
  options: SpawnOptions = {}
): Promise<ExecResult> => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (err) => {
      reject(err);
    });

    child.on('close', (code) => {
      resolve({ stdout, stderr, code });
    });
  });
};
