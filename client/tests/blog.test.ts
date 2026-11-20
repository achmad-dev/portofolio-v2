import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { stringify } from 'yaml';
import {
  filterPosts,
  featuredPosts,
  loadPosts,
  parsePost,
  routeFile,
} from '../src/blog/model';
const meta = {
  title: 'Example',
  slug: 'example',
  description: 'Description',
  date: '2026-11-20',
  category: 'Engineering',
  tags: ['Rust'],
  source: 'local',
  featured: false,
  draft: false,
};
const raw = (overrides = {}) =>
  `---\n${stringify({ ...meta, ...overrides })}---\n# Example\nBody`;
test('validation rejects missing/invalid metadata', () => {
  for (const value of [
    '# Missing',
    raw({ category: 'Bad' }),
    raw({ date: '2026-02-30' }),
    raw({ slug: '../bad' }),
    raw({ tags: 'Rust' }),
    raw({ source: 'medium' }),
    raw({ cover: 'javascript:bad()' }),
  ])
    assert.throws(() => parsePost(value, 'bad.md'));
  assert.equal(parsePost(raw(), 'example.md').body, '# Example\nBody');
});
test('sorts dates, rejects duplicates, excludes drafts in production', () => {
  const modules = {
    'a.md': raw({ slug: 'a', date: '2025-01-01' }),
    'b.md': raw({ slug: 'b' }),
    'c.md': raw({ slug: 'c', draft: true }),
  };
  assert.deepEqual(
    loadPosts(modules).map((p) => p.slug),
    ['b', 'a']
  );
  assert.equal(loadPosts(modules, false).length, 3);
  assert.throws(() => loadPosts({ 'a.md': raw(), 'b.md': raw() }));
});
test('filters, featured, empty catalog and overrides', () => {
  const posts = loadPosts({
    'a.md': raw({
      featured: true,
      category_override: 'Cybersecurity',
      description_override: 'Custom',
    }),
  });
  assert.equal(filterPosts(posts, 'Engineering').length, 0);
  assert.equal(filterPosts(posts, 'All Posts').length, 1);
  assert.equal(featuredPosts(posts).length, 1);
  assert.equal(posts[0].description, 'Custom');
  assert.deepEqual(loadPosts({}), []);
});
test('routes resolve root, index, article and unknown slugs with deployment base', () => {
  const posts = loadPosts({ 'a.md': raw() });
  for (const base of ['/', '/portfolio/']) {
    assert.equal(routeFile(base, posts, base), 'content/about.md');
    assert.equal(routeFile(`${base}blog/`, posts, base), 'blog-index');
    assert.equal(routeFile(`${base}blog/example/`, posts, base), 'blog/a.md');
    assert.equal(routeFile(`${base}blog/missing/`, posts, base), 'not-found');
  }
  assert.equal(routeFile('/elsewhere/', posts, '/portfolio/'), 'not-found');
});
test('migrated articles and future imports validate', () => {
  const dir = new URL('../src/content/blog/', import.meta.url);
  const modules = Object.fromEntries(
    readdirSync(dir)
      .filter((p) => p.endsWith('.md'))
      .map((p) => [p, readFileSync(new URL(p, dir), 'utf8')])
  );
  const posts = loadPosts(modules);
  assert.ok(posts.length >= 7);
  const imported = posts.filter((p) => p.source === 'medium');
  assert.ok(imported.length >= 7);
  assert.equal(new Set(imported.map((p) => p.source_id)).size, imported.length);
});
