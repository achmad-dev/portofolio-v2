import type { BlogPost } from './model';
export function updateSeo(
  post: BlogPost | undefined,
  index: boolean,
  missing: boolean
) {
  const base = import.meta.env.BASE_URL;
  const origin =
    import.meta.env.VITE_SITE_URL || 'https://achmadalfazari.my.id';
  const title =
    post?.title ??
    (missing
      ? 'Page not found'
      : index
        ? 'Writing & Research'
        : 'Achmad Al Fazari — Portfolio');
  const description =
    post?.description ??
    (index
      ? 'Articles on engineering, AI, cloud, security and finance.'
      : 'Achmad Al Fazari — software engineer building backend services, data workflows, and AI integrations.');
  const url = new URL(
    post ? `${base}blog/${post.slug}/` : index ? `${base}blog/` : base,
    origin
  ).href;
  const image = post?.cover ?? new URL(`${base}og-preview.jpg`, origin).href;
  document.title = `${title}${post || index ? ' — Achmad Al Fazari' : ''}`;
  let canonical = document.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]'
  );
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.append(canonical);
  }
  canonical.href = post?.original_url ?? url;
  const values: Record<string, string | undefined> = {
    description,
    'og:type': post ? 'article' : 'website',
    'og:title': title,
    'og:description': description,
    'og:url': url,
    'og:image': image,
    'twitter:card': 'summary_large_image',
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': image,
    'article:published_time': post?.date,
    'article:modified_time': post?.updated,
    robots: missing ? 'noindex' : undefined,
  };
  for (const [key, value] of Object.entries(values)) {
    const attr =
      key.startsWith('og:') || key.startsWith('article:') ? 'property' : 'name';
    let element = document.querySelector<HTMLMetaElement>(
      `meta[${attr}="${key}"]`
    );
    if (value === undefined) {
      element?.remove();
      continue;
    }
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attr, key);
      document.head.append(element);
    }
    element.content = value;
  }
}
