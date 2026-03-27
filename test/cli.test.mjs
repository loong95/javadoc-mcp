import test from 'node:test';
import assert from 'node:assert/strict';

const { parseCliArgv } = await import('../dist/cli.js');

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
