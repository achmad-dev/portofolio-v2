import { loadPosts } from './model';
export const posts = loadPosts(
  import.meta.glob<string>('../content/blog/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  import.meta.env.PROD
);
export const blogHref = (slug?: string) =>
  `${import.meta.env.BASE_URL}blog/${slug ? `${slug}/` : ''}`;
