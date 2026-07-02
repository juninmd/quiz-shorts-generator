import { spawnSync } from 'child_process';
import { pathToFileURL } from 'url';

interface PreflightOptions {
  readonly fetchImpl?: typeof fetch;
  readonly env?: NodeJS.ProcessEnv;
}

const ensureBinary = (command: string, args: string[]): void => {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`);
  }
};

const resolveOllamaHost = (env: NodeJS.ProcessEnv): string =>
  env.OLLAMA_BASE_URL ?? env.OLLAMA_HOST ?? 'http://localhost:11434';

export const runPreflight = async (options: PreflightOptions = {}): Promise<string[]> => {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const checks: string[] = [];

  ensureBinary('ffmpeg', ['-version']);
  checks.push('ffmpeg');

  ensureBinary('ffprobe', ['-version']);
  checks.push('ffprobe');

  ensureBinary('python', ['--version']);
  checks.push('python');

  const response = await fetchImpl(`${resolveOllamaHost(env)}/api/tags`);
  if (!response.ok) {
    throw new Error(`ollama healthcheck failed with status ${response.status}`);
  }
  checks.push('ollama');

  console.log(`INFO: preflight checks passed (${checks.join(', ')})`);
  return checks;
};

export const runPreflightCli = async (): Promise<void> => {
  try {
    await runPreflight();
    process.exit(0);
  } catch (error) {
    console.error('❌ Preflight failed:', error);
    process.exit(1);
  }
};

const isDirectExecution = (): boolean => {
  const entryPoint = process.argv[1];
  return entryPoint !== undefined && import.meta.url === pathToFileURL(entryPoint).href;
};

if (isDirectExecution()) {
  void runPreflightCli();
}