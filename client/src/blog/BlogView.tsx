import { useState } from 'react';
import type { MouseEvent } from 'react';
import { categoryNames, filterPosts, featuredPosts } from './model';
import type { BlogCategory, BlogPost } from './model';
import { MarkdownViewer } from '../features/editor/MarkdownViewer';
export function BlogView({
  posts,
  href,
  onOpen,
}: {
  posts: BlogPost[];
  href: (slug?: string) => string;
  onOpen?: (id: string) => void;
}) {
  const [category, setCategory] = useState<BlogCategory | 'All Posts'>(
    'All Posts'
  );
  const visible = filterPosts(posts, category);
  const card = (p: BlogPost) => (
    <article key={p.slug} className="blog-card">
      {p.cover && <img src={p.cover} alt="" loading="lazy" />}
      <div>
        <p className="blog-meta">
          {p.category} · <time dateTime={p.date}>{p.date}</time>
        </p>
        <h3>
          <a
            href={href(p.slug)}
            onClick={(event: MouseEvent) => {
              if (
                onOpen &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.shiftKey &&
                event.button === 0
              ) {
                event.preventDefault();
                onOpen(p.fileId);
              }
            }}
          >
            {p.title}
          </a>
        </h3>
        <p>{p.description}</p>
        <div className="blog-tags">
          {p.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
    </article>
  );
  return (
    <section className="blog-view">
      <h1>Writing &amp; Research</h1>
      <div className="blog-filters" aria-label="Filter articles">
        {(['All Posts', ...categoryNames] as const).map((c) => (
          <button
            type="button"
            key={c}
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
          >
            {c} ({filterPosts(posts, c).length})
          </button>
        ))}
      </div>
      {featuredPosts(visible).length > 0 && (
        <>
          <h2>Featured Articles</h2>
          {featuredPosts(visible).map(card)}
        </>
      )}
      <h2>Latest Articles</h2>
      {visible.length ? visible.map(card) : <p>No articles yet.</p>}
    </section>
  );
}
export function ArticleView({
  post,
  reading = true,
}: {
  post: BlogPost;
  reading?: boolean;
}) {
  // Metadata provides the title; avoid repeating the imported opening heading.
  const openingHeading = /^# ([^\n]+)\r?\n/.exec(post.body);
  const body =
    openingHeading?.[1].trim() === post.title.trim()
      ? post.body.slice(openingHeading[0].length).replace(/^\s*\n/, '')
      : post.body;
  return (
    <article className={`article-view ${reading ? 'reader-mode' : ''}`}>
      <header className="blog-article-header">
        <h1>{post.title}</h1>
        <p className="article-summary">{post.description}</p>
        <p className="blog-meta">
          {post.category} · <time dateTime={post.date}>{post.date}</time>
          {post.updated && ` · Updated ${post.updated}`}
        </p>
        <div className="blog-tags">
          {post.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </header>
      <MarkdownViewer content={body} />
    </article>
  );
}
