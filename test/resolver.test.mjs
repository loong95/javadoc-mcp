import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

const { extractLocalRepositoryPath, getClassifierJarPath } = await import('../dist/javadoc/resolver.js');

test('extractLocalRepositoryPath ignores commented example values in settings.xml', () => {
  const settings = `
    <!-- localRepository
       | The path to the local repository maven will use to store artifacts.
       |
       | Default: \${user.home}/.m2/repository
      <localRepository>/path/to/local/repo</localRepository>
      -->
      <localRepository>\${user.home}/.m2/repository</localRepository>
  `;

  assert.equal(
    extractLocalRepositoryPath(settings),
    '${user.home}/.m2/repository'
  );
});

test('getClassifierJarPath uses the active localRepository instead of comment examples', () => {
  const jarPath = getClassifierJarPath(
    {
      groupId: 'org.apache.commons',
      artifactId: 'commons-lang3',
      version: '3.14.0',
    },
    'javadoc'
  );

  assert.equal(
    jarPath,
    path.join(
      os.homedir(),
      '.m2',
      'repository',
      'org',
      'apache',
      'commons',
      'commons-lang3',
      '3.14.0',
      'commons-lang3-3.14.0-javadoc.jar'
    )
  );
});
