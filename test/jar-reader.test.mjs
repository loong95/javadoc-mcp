import test from 'node:test';
import assert from 'node:assert/strict';

const { resolveEntryName } = await import('../dist/javadoc/jar-reader.js');
const { parsePackageSummary } = await import('../dist/javadoc/parser.js');

test('resolveEntryName prefers an exact JAR entry match', () => {
  const entryName = resolveEntryName(
    [
      'jakarta.persistence/jakarta/persistence/package-summary.html',
      'jakarta/persistence/package-summary.html',
    ],
    'jakarta/persistence/package-summary.html'
  );

  assert.equal(entryName, 'jakarta/persistence/package-summary.html');
});

test('resolveEntryName falls back to a module-prefixed entry', () => {
  const entryName = resolveEntryName(
    ['jakarta.persistence/jakarta/persistence/package-summary.html'],
    'jakarta/persistence/package-summary.html'
  );

  assert.equal(
    entryName,
    'jakarta.persistence/jakarta/persistence/package-summary.html'
  );
});

test('parsePackageSummary reads legacy rows with th.colFirst', () => {
  const classes = parsePackageSummary(`
    <table class="typeSummary">
      <caption><span>Interface Summary</span></caption>
      <tbody>
        <tr>
          <th class="colFirst" scope="row">
            <a href="EntityManager.html">EntityManager</a>
          </th>
          <td class="colLast">
            <div class="block">Interface used to interact with the persistence context.</div>
          </td>
        </tr>
      </tbody>
    </table>
  `);

  assert.deepEqual(classes, [
    {
      name: 'EntityManager',
      kind: 'interface',
      description: 'Interface used to interact with the persistence context.',
    },
  ]);
});
