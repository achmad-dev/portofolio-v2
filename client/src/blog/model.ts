import { CASE_STUDY } from '../config/site';
import { parse } from 'yaml';
import categories from './categories.json';
export type BlogCategory = keyof typeof categories;
export const categoryNames = Object.keys(categories) as BlogCategory[];
export interface BlogPost {
  title: string;
  slug: string;
  description: string;
  date: string;
  updated?: string;
  category: BlogCategory;
  tags: string[];
  tags_override?: string[];
  cover?: string;
  source: 'medium' | 'local';
  source_id?: string;
  original_url?: string;
  featured: boolean;
  draft: boolean;
  body: string;
  fileId: string;
  category_override?: BlogCategory;
  description_override?: string;
}
const dateValid = (s: unknown): s is string =>
  typeof s === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  !Number.isNaN(Date.parse(s)) &&
  new Date(s).toISOString().slice(0, 10) === s;
const webUrl = (s: unknown) => {
  try {
    return (
      typeof s === 'string' && ['https:', 'http:'].includes(new URL(s).protocol)
    );
  } catch {
    return false;
  }
};
export function parsePost(raw: string, fileId: string): BlogPost {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  if (!match) throw new Error(`${fileId}: missing frontmatter`);
  const m = parse(match[1]);
  const fail = () => {
    throw new Error(`${fileId}: invalid blog metadata`);
  };
  if (!m || typeof m !== 'object') return fail();
  for (const key of ['title', 'description', 'slug'])
    if (typeof m[key] !== 'string' || !m[key].trim()) fail();
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(m.slug) ||
    !dateValid(m.date) ||
    (m.updated !== undefined && !dateValid(m.updated))
  )
    fail();
  if (
    !categoryNames.includes(m.category) ||
    !Array.isArray(m.tags) ||
    m.tags.some((t: unknown) => typeof t !== 'string')
  )
    fail();
  if (
    !['medium', 'local'].includes(m.source) ||
    typeof m.featured !== 'boolean' ||
    typeof m.draft !== 'boolean'
  )
    fail();
  if (
    m.source === 'medium' &&
    (typeof m.source_id !== 'string' ||
      !/^[a-f0-9]{12}$/.test(m.source_id) ||
      !webUrl(m.original_url))
  )
    fail();
  if (m.cover !== undefined && !webUrl(m.cover)) fail();
  if (m.original_url !== undefined && !webUrl(m.original_url)) fail();
  if (
    m.category_override !== undefined &&
    !categoryNames.includes(m.category_override)
  )
    fail();
  if (
    m.description_override !== undefined &&
    (typeof m.description_override !== 'string' ||
      !m.description_override.trim())
  )
    fail();
  if (
    m.tags_override !== undefined &&
    (!Array.isArray(m.tags_override) ||
      m.tags_override.some((t: unknown) => typeof t !== 'string' || !t.trim()))
  )
    fail();
  return {
    ...m,
    tags: m.tags_override ?? m.tags,
    category: m.category_override ?? m.category,
    description: m.description_override ?? m.description,
    body: match[2],
    fileId,
  };
}
export function loadPosts(
  modules: Record<string, string>,
  production = true
): BlogPost[] {
  const posts = Object.entries(modules).map(([path, raw]) =>
    parsePost(raw, `blog/${path.split('/').pop()}`)
  );
  for (const key of ['slug', 'source_id'] as const) {
    const values = posts.map((p) => p[key]).filter(Boolean);
    if (new Set(values).size !== values.length)
      throw new Error(`Duplicate ${key}`);
  }
  return posts
    .filter((p) => !production || !p.draft)
    .sort(
      (a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug)
    );
}
export const filterPosts = (
  posts: BlogPost[],
  category: BlogCategory | 'All Posts'
) => posts.filter((p) => category === 'All Posts' || p.category === category);
export const featuredPosts = (posts: BlogPost[]) =>
  posts.filter((p) => p.featured);
export const latestPosts = (posts: BlogPost[]) =>
  posts.filter((p) => !p.featured);
export function routeFile(path: string, posts: BlogPost[], base = '/') {
  const prefix = base.replace(/\/$/, '');
  if (prefix && path !== prefix && !path.startsWith(`${prefix}/`))
    return 'not-found';
  const local = path.slice(prefix.length).replace(/\/+$/, '') || '/';
  if (local === '/') return 'content/about.md';
  if (local === '/blog') return 'blog-index';
  if (local === `/${CASE_STUDY.path.replace(/\/$/, '')}`)
    return CASE_STUDY.fileId;
  return posts.find((p) => local === `/blog/${p.slug}`)?.fileId ?? 'not-found';
}
