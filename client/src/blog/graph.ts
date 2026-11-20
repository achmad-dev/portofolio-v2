import type { BlogPost } from './model';
export interface Note {
  id: string;
  title: string;
  body: string;
  href: string;
}
export interface NoteEdge {
  source: string;
  target: string;
}
export function resolveNoteLink(
  href: string,
  source: string,
  notes: Note[],
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
export function buildNoteGraph(
  documents: { id: string; content?: string }[],
  posts: BlogPost[],
  base = '/'
) {
  const notes: Note[] = [
    {
      id: 'blog-index',
      title: 'Writing & Research',
      body: '',
      href: `${base}blog/`,
    },
    ...documents
      .filter((d) => d.id.endsWith('.md'))
      .map((d) => {
        const post = posts.find((p) => p.fileId === d.id);
        return {
          id: d.id,
          title:
            post?.title ??
            /^#\s+(.+)$/m.exec(d.content ?? '')?.[1] ??
            d.id.split('/').pop()!,
          body: d.content ?? '',
          href: post ? `${base}blog/${post.slug}/` : base,
        };
      }),
  ];
  const edges: NoteEdge[] = [];
  const add = (source: string, target: string) => {
    if (
      source !== target &&
      !edges.some((e) => e.source === source && e.target === target)
    )
      edges.push({ source, target });
  };
  for (const note of notes) {
    const prose = note.body
      .replace(/^\s*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\s*\1\s*$/gm, '')
      .replace(/`[^`]*`/g, '');
    for (const match of prose.matchAll(
      /(?<!!)\[[^\]]+\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g
    )) {
      const target = resolveNoteLink(match[1], note.id, notes, base);
      if (target) add(note.id, target);
    }
  }
  // The writing index explicitly lists each published article.
  for (const post of posts)
    if (notes.some((n) => n.id === post.fileId)) add('blog-index', post.fileId);
  return { notes, edges };
}
