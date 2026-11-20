import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { loadPosts } from '../src/blog/model';
const base = process.env.VITE_BASE_PATH || '/';
const origin = process.env.SITE_URL || 'https://achmadalfazari.my.id';
const contentDir = new URL('../src/content/blog/', import.meta.url);
const posts = loadPosts(
  Object.fromEntries(
    readdirSync(contentDir)
      .filter((p) => p.endsWith('.md'))
      .map((p) => [p, readFileSync(new URL(p, contentDir), 'utf8')])
  )
);
const read = (path: string) =>
  readFileSync(new URL(`../dist/${path}`, import.meta.url), 'utf8');
const sitemap = read('sitemap.xml');
assert.ok(sitemap.includes(new URL(`${base}blog/`, origin).href));
assert.ok(
  read('robots.txt').includes(new URL(`${base}sitemap.xml`, origin).href)
);
assert.ok(read('blog/index.html').includes('Writing &amp; Research'));
assert.ok(read('404.html').includes('Page not found'));
for (const post of posts) {
  const html = read(`blog/${post.slug}/index.html`);
  assert.ok(html.includes('article:published_time'));
  assert.ok(html.includes('rel="canonical"'));
  assert.ok(
    html.includes(
      post.original_url || new URL(`${base}blog/${post.slug}/`, origin).href
    )
  );
  assert.ok(html.includes(`${base}assets/`));
  assert.equal((html.match(/<title>/g) || []).length, 1);
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert.ok(html.includes('<article>'));
  assert.ok(sitemap.includes(`${base}blog/${post.slug}/`));
}
const scripts = readdirSync(new URL('../dist/assets/', import.meta.url))
  .filter((p) => p.endsWith('.js'))
  .map((p) => read(`assets/${p}`))
  .join('');
for (const forbidden of [
  '/auth/ticket',
  '/ai/generate',
  'VITE_HMAC_SECRET',
  'localhost:8080',
])
  assert.ok(
    !scripts.includes(forbidden),
    `Active bundle contains ${forbidden}`
  );
console.log(
  `Verified ${posts.length} static article pages, metadata, base paths and inactive chat.`
);
