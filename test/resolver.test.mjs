import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

const {
  buildMavenArgs,
  formatProcessError,
  extractLocalRepositoryPath,
  getClassifierJarPath,
  getMavenInvocation,
} = await import('../dist/javadoc/resolver.js');

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

test('getClassifierJarPath keeps artifact coordinates under the resolved localRepository', () => {
  const jarPath = getClassifierJarPath(
    {
      groupId: 'org.apache.commons',
      artifactId: 'commons-lang3',
      version: '3.14.0',
    },
    'javadoc'
  );

  assert.ok(
    jarPath.endsWith(
      path.join(
        'org',
        'apache',
        'commons',
        'commons-lang3',
        '3.14.0',
        'commons-lang3-3.14.0-javadoc.jar'
      )
    )
  );
  assert.notEqual(
    path.join(
      path.sep,
      'path',
      'to',
      'local',
      'repo',
      'org',
      'apache',
      'commons',
      'commons-lang3',
      '3.14.0',
      'commons-lang3-3.14.0-javadoc.jar'
    ),
    jarPath
  );
});

test('getMavenInvocation uses mvn directly on non-Windows platforms', () => {
  assert.deepEqual(
    getMavenInvocation(['dependency:get', '-Dartifact=org.example:demo:1.0.0'], 'linux'),
    {
      command: 'mvn',
      args: ['dependency:get', '-Dartifact=org.example:demo:1.0.0'],
    }
  );
});

test('getMavenInvocation routes through cmd.exe on Windows', () => {
  assert.deepEqual(
    getMavenInvocation(['dependency:get', '-Dartifact=org.example:demo:1.0.0'], 'win32'),
    {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', 'mvn', 'dependency:get', '-Dartifact=org.example:demo:1.0.0'],
    }
  );
});

test('buildMavenArgs pins the local repository and optional settings file', () => {
  assert.deepEqual(
    buildMavenArgs(
      ['dependency:get', '-Dartifact=org.example:demo:1.0.0'],
      {
        localRepository: 'D:/maven/repository',
        settingsPath: 'C:/Users/example/.m2/settings.xml',
      }
    ),
    [
      '-s',
      'C:/Users/example/.m2/settings.xml',
      '-Dmaven.repo.local=D:/maven/repository',
      'dependency:get',
      '-Dartifact=org.example:demo:1.0.0',
    ]
  );
});

test('formatProcessError includes child process stdout and stderr when present', () => {
  const error = new Error('Command failed');
  error.stdout = '[ERROR] repo.maven.apache.org';
  error.stderr = 'No plugin found for prefix dependency';

  assert.equal(
    formatProcessError(error),
    [
      'Command failed',
      'stdout:',
      '[ERROR] repo.maven.apache.org',
      'stderr:',
      'No plugin found for prefix dependency',
    ].join('\n')
  );
});
