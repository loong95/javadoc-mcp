import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8')
);
const packageLock = JSON.parse(
  await readFile(new URL('../package-lock.json', import.meta.url), 'utf8')
);

test('release metadata stays aligned for version 1.0.5', async () => {
  const changelog = await readFile(
    new URL('../CHANGELOG.md', import.meta.url),
    'utf8'
  );

  assert.equal(packageJson.version, '1.0.5');
  assert.equal(packageLock.version, '1.0.5');
  assert.equal(packageLock.packages[''].version, '1.0.5');
  assert.match(changelog, /^## 1\.0\.5\b/m);
  assert.match(changelog, /CLI/i);
  assert.match(changelog, /符号链接|symlink/i);
  assert.match(changelog, /npx/i);
});
