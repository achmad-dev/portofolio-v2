import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BlogView, ArticleView } from '../src/blog/BlogView';
import { parsePost } from '../src/blog/model';
const post = parsePost(
  `---
title: Example
slug: example
description: Summary
date: "2026-11-20"
category: Engineering
tags: [Rust]
source: local
featured: true
draft: false
---
# Example

Body with **strong** text.
`,
  'blog/example.md'
);
test('blog empty state renders accessible filters without category routes', () => {
  const html = renderToStaticMarkup(
    createElement(BlogView, { posts: [], href: () => '/blog/' })
  );
  assert.ok(html.includes('No articles yet.'));
  assert.ok(html.includes('aria-pressed="true"'));
  assert.ok(html.includes('All Posts (0)'));
});
test('blog renders featured cards, metadata, tags and article links', () => {
  const html = renderToStaticMarkup(
    createElement(BlogView, { posts: [post], href: (slug) => `/blog/${slug}/` })
  );
  for (const value of [
    'Featured Articles',
    'Latest Articles',
    'Rust',
    '2026-11-20',
    'href="/blog/example/"',
  ])
    assert.ok(html.includes(value));
});
test('article content renders to HTML without browser workspace', () => {
  const html = renderToStaticMarkup(createElement(ArticleView, { post }));
  assert.ok(html.includes('<strong>strong</strong>'));
  assert.ok(html.includes('dateTime="2026-11-20"'));
});
