import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNoteGraph, resolveNoteLink } from '../src/blog/graph';
import { parsePost } from '../src/blog/model';
const post = parsePost(
  `---
title: Example
slug: example
description: Example article
date: "2026-11-20"
category: Engineering
tags: []
source: local
featured: false
draft: false
---
[About](/)
`,
  'blog/example.md'
);
const docs = [
  {
    id: 'content/about.md',
    content:
      '# About\n[Writing](/blog/)\n[Writing again](/blog/)\n[External](https://example.com)\n![Image](/blog/example/)\n```md\n[Sample](/blog/example/)\n```',
  },
  { id: post.fileId, content: post.body },
  {
    id: 'case-studies/study.md',
    content: '# Case study\n[Article](../blog/example.md)',
  },
];
test('graph derives distinct real links, index links and backlinks, excluding images/code/external URLs', () => {
  for (const base of ['/', '/portfolio/']) {
    const { notes, edges } = buildNoteGraph(docs, [post], base);
    assert.equal(notes.length, 4);
    assert.deepEqual(edges, [
      { source: 'content/about.md', target: 'blog-index' },
      { source: 'blog/example.md', target: 'content/about.md' },
      { source: 'case-studies/study.md', target: 'blog/example.md' },
      { source: 'blog-index', target: 'blog/example.md' },
    ]);
    assert.equal(
      resolveNoteLink(`${base}blog/example/`, 'content/about.md', notes, base),
      post.fileId
    );
    assert.equal(
      resolveNoteLink(
        '../blog/example.md',
        'case-studies/study.md',
        notes,
        base
      ),
      post.fileId
    );
    for (const href of [
      '#section',
      'https://example.com',
      'mailto:a@example.com',
      '/missing',
      '%ZZ',
      '',
    ])
      assert.equal(
        resolveNoteLink(href, 'content/about.md', notes, base),
        undefined
      );
  }
});
test('empty graph retains the writing index without broken edges', () => {
  const graph = buildNoteGraph([], []);
  assert.equal(graph.notes.length, 1);
  assert.deepEqual(graph.edges, []);
});
