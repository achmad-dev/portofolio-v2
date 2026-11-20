import type { BlogPost } from './model';
export interface NoteLink {
  id: string;
  href: string;
}
export function resolveNoteLink(
  href: string,
  source: string,
  notes: NoteLink[],
  base = '/'
) {
  if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(href)) return undefined;
  let path: string;
  try {
    path = decodeURIComponent(href.split(/[?#]/)[0]);
  } catch {
    return undefined;
  }
  if (!path) return undefined;
  const routePath =
    path.startsWith('/') && !path.startsWith(base)
      ? `${base}${path.slice(1)}`
      : path;
  const route = notes.find(
    (n) => n.href.replace(/\/$/, '') === routePath.replace(/\/$/, '')
  );
  if (route) return route.id;
  const parts = path.startsWith('/') ? [] : source.split('/').slice(0, -1);
  for (const part of path.replace(/^\//, '').split('/')) {
    if (part === '..') parts.pop();
    else if (part && part !== '.') parts.push(part);
  }
  const candidate = parts.join('/');
  return (
    notes.find(
      (n) =>
        n.id === candidate ||
        n.id === `${candidate}.md` ||
        n.id === candidate.replace(/^content\//, '')
    )?.id ??
    (path === `${base}blog` || path === `${base}blog/`
      ? 'blog-index'
      : undefined)
  );
}
export function createNoteLinks(
  documents: { id: string }[],
  posts: BlogPost[],
  base = '/'
): NoteLink[] {
  return [
    { id: 'blog-index', href: `${base}blog/` },
    ...documents
      .filter((d) => d.id.endsWith('.md'))
      .map((d) => {
        const post = posts.find((p) => p.fileId === d.id);
        return { id: d.id, href: post ? `${base}blog/${post.slug}/` : base };
      }),
  ];
}
