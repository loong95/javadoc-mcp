import test from 'node:test';
import assert from 'node:assert/strict';

const {
  matchesSearchResult,
  renderSearchResultLine,
} = await import('../dist/tools/search.js');

test('matchesSearchResult matches a type by its fully qualified class name', () => {
  assert.equal(
    matchesSearchResult(
      {
        category: 'type',
        label: 'PreAuthorize',
        qualifiedName: 'org.springframework.security.access.prepost.PreAuthorize',
        url: 'org/springframework/security/access/prepost/PreAuthorize.html',
      },
      'org.springframework.security.access.prepost.PreAuthorize'
    ),
    true
  );
});

test('matchesSearchResult matches a member by its fully qualified member reference', () => {
  assert.equal(
    matchesSearchResult(
      {
        category: 'member',
        label: 'join(Object[], String)',
        qualifiedName: 'org.apache.commons.lang3.StringUtils',
        url: 'org/apache/commons/lang3/StringUtils.html#join(java.lang.Object[],java.lang.String)',
      },
      'org.apache.commons.lang3.StringUtils.join'
    ),
    true
  );
});

test('matchesSearchResult does not match a member on class name alone', () => {
  assert.equal(
    matchesSearchResult(
      {
        category: 'member',
        label: 'value()',
        qualifiedName: 'org.springframework.security.access.prepost.PreAuthorize',
        url: 'org/springframework/security/access/prepost/PreAuthorize.html#value()',
      },
      'org.springframework.security.access.prepost.PreAuthorize'
    ),
    false
  );
});

test('renderSearchResultLine includes the full class name for type and member results', () => {
  assert.equal(
    renderSearchResultLine({
      category: 'type',
      label: 'PreAuthorize',
      qualifiedName: 'org.springframework.security.access.prepost.PreAuthorize',
      url: 'org/springframework/security/access/prepost/PreAuthorize.html',
    }),
    '- [type] **PreAuthorize** — org.springframework.security.access.prepost.PreAuthorize'
  );

  assert.equal(
    renderSearchResultLine({
      category: 'member',
      label: 'join(Object[], String)',
      qualifiedName: 'org.apache.commons.lang3.StringUtils',
      url: 'org/apache/commons/lang3/StringUtils.html#join(java.lang.Object[],java.lang.String)',
    }),
    '- [member] **join(Object[], String)** — org.apache.commons.lang3.StringUtils'
  );
});
