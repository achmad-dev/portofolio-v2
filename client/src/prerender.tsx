import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { posts, blogHref } from './blog/catalog';
import { ArticleView, BlogView } from './blog/BlogView';
const out = resolve('dist');
const origin = (process.env.SITE_URL || 'https://achmadalfazari.my.id').replace(
  /\/$/,
  ''
);
const absolute = (path: string) => new URL(path, origin).href;
const template = readFileSync(resolve(out, 'index.html'), 'utf8')
  .split('https://achmadalfazari.my.id/')
  .join(absolute(import.meta.env.BASE_URL));
writeFileSync(resolve(out, 'index.html'), template);
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!
  );
function emit(
  path: string,
  title: string,
  description: string,
  canonical: string,
  body: string,
  image?: string,
  date?: string,
  updated?: string
) {
  const metadata = `<title>${escape(title)} — Achmad Al Fazari</title>
<meta name="description" content="${escape(description)}" />
<link rel="canonical" href="${escape(canonical)}" />
<meta property="og:type" content="${date ? 'article' : 'website'}" />
<meta property="og:title" content="${escape(title)}" />
<meta property="og:description" content="${escape(description)}" />
<meta property="og:url" content="${escape(absolute(path))}" />
<meta property="og:image" content="${escape(image || absolute(`${import.meta.env.BASE_URL}og-preview.jpg`))}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escape(title)}" />
<meta name="twitter:description" content="${escape(description)}" />
<meta name="twitter:image" content="${escape(image || absolute(`${import.meta.env.BASE_URL}og-preview.jpg`))}" />
${date ? `<meta property="article:published_time" content="${date}" />` : ''}
${updated ? `<meta property="article:modified_time" content="${updated}" />` : ''}`;
  const stripped = template
    .replace(/<title>[\s\S]*?<\/title>/g, '')
    .replace(/<link\b[^>]*rel="canonical"[^>]*>/g, '')
    .replace(
      /<meta\b[^>]*(?:name="(?:description|twitter:[^"]+)"|property="(?:og:[^"]+|article:[^"]+)")[^>]*>/g,
      ''
    );
  const html = stripped
    .replace('</head>', `${metadata}</head>`)
    .replace(
      '<div id="root"></div>',
      `<div id="root"><main class="static-blog"><nav class="blog-view"><a href="${escape(import.meta.env.BASE_URL)}">Portfolio</a> · <a href="${escape(blogHref())}">Writing &amp; Research</a></nav>${body}</main></div>`
    );
  const local = path.slice(import.meta.env.BASE_URL.length);
  const dir = resolve(out, local);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'index.html'), html);
}
emit(
  blogHref(),
  'Writing & Research',
  'Articles on engineering, AI, cloud, security and finance.',
  absolute(blogHref()),
  renderToStaticMarkup(<BlogView posts={posts} href={blogHref} />)
);
for (const post of posts)
  emit(
    blogHref(post.slug),
    post.title,
    post.description,
    post.original_url || absolute(blogHref(post.slug)),
    renderToStaticMarkup(<ArticleView post={post} />),
    post.cover,
    post.date,
    post.updated
  );
const urls = [
  import.meta.env.BASE_URL,
  blogHref(),
  ...posts.map((p) => blogHref(p.slug)),
];
writeFileSync(
  resolve(out, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((p) => `<url><loc>${escape(absolute(p))}</loc></url>`).join('')}</urlset>`
);
writeFileSync(
  resolve(out, 'robots.txt'),
  `User-agent: *\nAllow: /\nSitemap: ${absolute(`${import.meta.env.BASE_URL}sitemap.xml`)}\n`
);
writeFileSync(resolve(out, '.nojekyll'), '');
writeFileSync(
  resolve(out, '404.html'),
  template
    .replace(
      /<title>[\s\S]*?<\/title>/,
      '<title>Page not found — Achmad Al Fazari</title>'
    )
    .replace('</head>', '<meta name="robots" content="noindex" /></head>')
    .replace(
      '<div id="root"></div>',
      '<div id="root"><h1>Page not found</h1></div>'
    )
);
console.log(`Generated blog index and ${posts.length} article pages.`);
