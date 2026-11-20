import { readFileSync } from 'node:fs';
import { routeFile } from '../src/blog/model';
import { CASE_STUDY, caseStudyHref } from '../src/config/site';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNoteLinks, resolveNoteLink } from '../src/blog/links';
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
  { id: CASE_STUDY.fileId, content: '# Case study' },
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
test('internal navigation resolves index, articles and relative notes across deployment bases', () => {
  for (const base of ['/', '/portfolio/']) {
    const notes = createNoteLinks(docs, [post], base);
    assert.equal(
      resolveNoteLink(caseStudyHref(base), 'content/about.md', notes, base),
      CASE_STUDY.fileId
    );
    assert.equal(
      resolveNoteLink(
        '/case-studies/ai-ads-workflow-study.md',
        'content/about.md',
        notes,
        base
      ),
      CASE_STUDY.fileId
    );
    assert.equal(
      resolveNoteLink(
        `${base}case-studies/ai-ads-workflow-study.md`,
        'content/about.md',
        notes,
        base
      ),
      CASE_STUDY.fileId
    );
    assert.equal(
      resolveNoteLink('/blog/', 'content/about.md', notes, base),
      'blog-index'
    );
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

test('homepage quick links target the case-study and writing routes', () => {
  const about = readFileSync(
    new URL('../src/content/about.md', import.meta.url),
    'utf8'
  );
  for (const label of ['Case Study', 'Writing']) {
    const href = about.match(new RegExp(`\\[${label}\\]\\(([^)]+)\\)`))?.[1];
    assert.ok(href);
    assert.equal(
      routeFile(href, []),
      label === 'Case Study' ? CASE_STUDY.fileId : 'blog-index'
    );
  }
});
