import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, rm, symlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const { parseCliArgv } = await import('../dist/cli.js');
const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8')
);

test('parseCliArgv parses search command options', () => {
  const parsed = parseCliArgv([
    'search',
    '--group-id',
    'org.apache.commons',
    '--artifact-id',
    'commons-lang3',
    '--version',
    '3.14.0',
    '--query',
    'StringUtils',
  ]);

  assert.equal(parsed.kind, 'run');
  assert.equal(parsed.definition.cliName, 'search');
  assert.deepEqual(parsed.params, {
    groupId: 'org.apache.commons',
    artifactId: 'commons-lang3',
    version: '3.14.0',
    query: 'StringUtils',
  });
});

test('parseCliArgv accepts MCP-style command aliases', () => {
  const parsed = parseCliArgv([
    'list_packages',
    '--group-id',
    'org.apache.commons',
    '--artifact-id',
    'commons-lang3',
    '--version',
    '3.14.0',
  ]);

  assert.equal(parsed.kind, 'run');
  assert.equal(parsed.definition.cliName, 'list-packages');
});

test('parseCliArgv returns command help for --help', () => {
  const parsed = parseCliArgv(['get-class', '--help']);

  assert.deepEqual(parsed, {
    kind: 'help',
    commandName: 'get-class',
  });
});

test('parseCliArgv reports missing required options', () => {
  const parsed = parseCliArgv([
    'get-member',
    '--group-id',
    'org.apache.commons',
  ]);

  assert.equal(parsed.kind, 'error');
  assert.match(parsed.message, /artifactId/i);
  assert.match(parsed.message, /version/i);
  assert.match(parsed.message, /className/i);
  assert.match(parsed.message, /memberName/i);
});

test('parseCliArgv rejects unexpected positional arguments', () => {
  const parsed = parseCliArgv(['search', 'StringUtils']);

  assert.equal(parsed.kind, 'error');
  assert.match(parsed.message, /Unexpected positional argument/);
});

test('javadoc-cli runs when launched through a symlinked package path', async (t) => {
  const tempRoot = fileURLToPath(new URL('../.temp/', import.meta.url));
  const fixtureRoot = path.join(tempRoot, 'cli-link-fixture');
  const linkedDistDir = path.join(fixtureRoot, 'dist');
  const realDistDir = fileURLToPath(new URL('../dist/', import.meta.url));
  const linkedCliPath = path.join(linkedDistDir, 'cli.js');

  await rm(fixtureRoot, { force: true, recursive: true });
  await mkdir(fixtureRoot, { recursive: true });
  await symlink(realDistDir, linkedDistDir, process.platform === 'win32' ? 'junction' : 'dir');

  t.after(async () => {
    await rm(fixtureRoot, { force: true, recursive: true });
  });

  const result = spawnSync(process.execPath, [linkedCliPath, '--version'], {
    encoding: 'utf8',
  });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout.trim(), packageJson.version);
});
