import { access, readFile } from 'node:fs/promises';

const requiredFiles = [
  'README.md',
  'AGENTS.md',
  'SECURITY.md',
  'CONTRIBUTING.md',
  'LICENSE',
  'docs/open-source-launch-plan.md',
  'docs/recommended-project-design.md',
  'docs/github-open-architecture.mmd',
  'fixtures/snapshots/stm32-minimal-snapshot.json',
];

async function main() {
  for (const file of requiredFiles)
    await access(file);

  const readme = await readFile('README.md', 'utf8');
  for (const phrase of ['Default to read-only', 'No arbitrary JavaScript execution', 'No automatic manufacturing order']) {
    if (!readme.includes(phrase))
      throw new Error(`README is missing safety phrase: ${phrase}`);
  }

  console.log('docs check passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

