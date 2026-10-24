import { spawnSync } from 'node:child_process';

const steps = [
  ['typecheck', ['npx', 'tsc', '--noEmit']],
  ['lint', ['npx', 'eslint', '.']],
  ['test', ['npx', 'vitest', 'run']],
];

for (const [name, [command, ...args]] of steps) {
  const started = performance.now();
  const result = spawnSync(command, args, { stdio: 'inherit' });
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  if (result.status !== 0) {
    console.error(`check: '${name}' failed with exit code ${result.status} after ${seconds}s`);
    process.exit(result.status ?? 1);
  }
  console.log(`check: '${name}' passed in ${seconds}s`);
}
