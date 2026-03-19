import test from 'node:test';
import assert from 'node:assert/strict';

const { parseSearchIndex } = await import('../dist/javadoc/parser.js');

test('parseSearchIndex reads modern package search indexes with trailing script calls', () => {
  const items = parseSearchIndex(
    'packageSearchIndex = [{"l":"com.example.pkg"}];updateSearchResults();',
    'package'
  );

  assert.deepEqual(items, [
    {
      category: 'package',
      label: 'com.example.pkg',
      url: 'com/example/pkg/package-summary.html',
      description: '',
    },
  ]);
});

test('parseSearchIndex reads legacy type search indexes without trailing script calls', () => {
  const items = parseSearchIndex(
    'typeSearchIndex = [{"p":"com.example","l":"Widget","d":"Contains ] and \\"quotes\\""}];',
    'type'
  );

  assert.deepEqual(items, [
    {
      category: 'type',
      label: 'Widget',
      url: 'com/example/Widget.html',
      description: 'Contains ] and "quotes"',
      qualifiedName: 'com.example.Widget',
    },
  ]);
});

test('parseSearchIndex maps member URLs from owner type and anchor', () => {
  const items = parseSearchIndex(
    'memberSearchIndex = [{"p":"com.example","c":"Widget","l":"run()","u":"run()","d":"Runs the widget"}];updateSearchResults();',
    'member'
  );

  assert.deepEqual(items, [
    {
      category: 'member',
      label: 'run()',
      url: 'com/example/Widget.html#run()',
      description: 'Runs the widget',
      qualifiedName: 'com.example.Widget',
    },
  ]);
});

test('parseSearchIndex returns an empty list for malformed content', () => {
  assert.deepEqual(parseSearchIndex('typeSearchIndex = [{"l":"Broken"}', 'type'), []);
});
