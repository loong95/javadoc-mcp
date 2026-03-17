import test from 'node:test';
import assert from 'node:assert/strict';

const { resolveEntryName } = await import('../dist/javadoc/jar-reader.js');
const { parseClassPage, parsePackageSummary } = await import('../dist/javadoc/parser.js');
const { parseClassSourceDoc } = await import('../dist/javadoc/source-parser.js');
const {
  mergeClassDocMetadata,
  renderClassDocumentation,
} = await import('../dist/tools/get-class.js');

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

test('parseClassPage reads class-level metadata from section.class-description', () => {
  const doc = parseClassPage(`
    <section class="class-description" id="class-description">
      <div class="type-signature">public @interface MockBean</div>
      <div class="deprecation-block">
        <span class="deprecated-label">Deprecated, for removal: This API element is subject to removal in a future version.</span>
        <div class="deprecation-comment">since 3.4.0 for removal in 4.0.0 in favor of MockitoBean.</div>
      </div>
      <div class="block">Annotation that can be used to add mocks to a Spring ApplicationContext.</div>
      <dl class="notes">
        <dt>Since:</dt>
        <dd>1.4.0</dd>
        <dt>See Also:</dt>
        <dd><a href="MockitoPostProcessor.html"><code>MockitoPostProcessor</code></a></dd>
      </dl>
    </section>
  `);

  assert.equal(
    doc.description,
    'Annotation that can be used to add mocks to a Spring ApplicationContext.'
  );
  assert.equal(
    doc.deprecated,
    'Deprecated, for removal: This API element is subject to removal in a future version. since 3.4.0 for removal in 4.0.0 in favor of MockitoBean.'
  );
  assert.equal(doc.since, '1.4.0');
  assert.deepEqual(doc.seeAlso, ['MockitoPostProcessor']);
});

test('parseClassSourceDoc extracts class-level block tags from source comments', () => {
  const doc = parseClassSourceDoc(`
    /**
     * Example class.
     *
     * @author Phillip Webb
     * @since 1.4.0
     * @see MockitoPostProcessor
     * @deprecated since 3.4.0 for removal in 4.0.0 in favor of
     * {@link org.springframework.test.context.bean.override.mockito.MockitoBean}
     */
    @Deprecated
    public @interface MockBean {
    }
  `, 'org.springframework.boot.test.mock.mockito.MockBean');

  assert.deepEqual(doc.authors, ['Phillip Webb']);
  assert.equal(doc.since, '1.4.0');
  assert.deepEqual(doc.seeAlso, ['MockitoPostProcessor']);
  assert.equal(
    doc.deprecated,
    'since 3.4.0 for removal in 4.0.0 in favor of org.springframework.test.context.bean.override.mockito.MockitoBean'
  );
});

test('renderClassDocumentation includes merged class-level metadata', () => {
  const rendered = renderClassDocumentation(
    'org.springframework.boot.test.mock.mockito.MockBean',
    mergeClassDocMetadata(
      {
        signature: 'public @interface MockBean',
        kind: 'annotation',
        description: 'Annotation that can be used to add mocks to a Spring ApplicationContext.',
        since: '1.4.0',
        deprecated: 'since 3.4.0 for removal in 4.0.0 in favor of MockitoBean',
        seeAlso: ['MockitoPostProcessor'],
      },
      {
        authors: ['Phillip Webb'],
      }
    )
  );

  assert.match(rendered, /\*\*Author\*\*: Phillip Webb/);
  assert.match(rendered, /\*\*Since\*\*: 1\.4\.0/);
  assert.match(rendered, /\*\*See Also\*\*: MockitoPostProcessor/);
  assert.match(rendered, /\*\*Deprecated\*\*: since 3\.4\.0/);
});
