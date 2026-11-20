"""Incremental Medium RSS import. Builds never fetch content."""
import os
import re
import sys
import tempfile
import xml.etree.ElementTree as ET
from datetime import datetime
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
from urllib.request import Request, urlopen

import yaml
from bs4 import BeautifulSoup
from markdownify import markdownify
from category_classifier import classify

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / 'client/src/content/blog'

def local_name(tag):
    return tag.rsplit('}', 1)[-1]

def article_key(link):
    parsed = urlsplit(link)
    if parsed.scheme != 'https' or not (parsed.hostname == 'medium.com' or (parsed.hostname or '').endswith('.medium.com')):
        raise ValueError('Invalid Medium article URL')
    match = re.search(r'(?:-|/)([a-f0-9]{12})$', parsed.path.rstrip('/'), re.I)
    if not match:
        raise ValueError('Invalid Medium identifier')
    return match.group(1).lower()

def published_date(value):
    try:
        date = parsedate_to_datetime(value)
    except (ValueError, TypeError):
        date = datetime.fromisoformat(value.replace('Z', '+00:00'))
    return date.date().isoformat()

def safe_url(value):
    try:
        return urlsplit(value).scheme in ('https', 'http')
    except ValueError:
        return False

def clean_html(content):
    soup = BeautifulSoup(content, 'html.parser')
    for tag in soup(['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button']):
        tag.decompose()
    for tag in soup.find_all(True):
        for attr in list(tag.attrs):
            if attr not in ('href', 'src', 'alt', 'title'):
                del tag[attr]
        for attr in ('href', 'src'):
            if tag.get(attr) and not safe_url(tag[attr]):
                del tag[attr]
        if tag.name == 'img' and (not tag.get('src') or '/_/stat?' in tag['src']):
            tag.decompose()
    return soup

def html_to_markdown(content):
    return markdownify(str(clean_html(content)), heading_style='ATX', bullets='-').strip()

def summarize(text, limit=200):
    text = ' '.join(text.split())
    if len(text) <= limit:
        return text
    # Prefer a complete sentence; otherwise stop at a word boundary.
    excerpt = text[:limit + 1]
    sentences = list(re.finditer(r'[.!?](?=\s|$)', excerpt))
    if sentences and sentences[-1].end() >= limit // 2:
        return excerpt[:sentences[-1].end()]
    return excerpt.rsplit(' ', 1)[0].rstrip(' ,;:') + '…'

def article_description(soup, title):
    paragraphs = [p.get_text(' ', strip=True) for p in soup.find_all('p')]
    return summarize(next((p for p in paragraphs if p.strip()), soup.get_text(' ', strip=True))) or title

def read_post(path):
    match = re.match(r'^---\n([\s\S]*?)\n---\n([\s\S]*)$', path.read_text(encoding='utf-8'))
    if not match:
        raise ValueError(f'Missing frontmatter: {path.name}')
    meta = yaml.safe_load(match[1])
    if not isinstance(meta, dict):
        raise ValueError(f'Invalid frontmatter: {path.name}')
    return meta, match[2]

def parse_feed(data):
    root = ET.fromstring(data)
    if local_name(root.tag) != 'rss' or root.find('channel') is None:
        raise ValueError('Expected RSS channel')
    result, seen = [], set()
    for entry in root.find('channel').findall('item'):
        fields, tags = {}, []
        for child in entry:
            key = local_name(child.tag)
            value = ''.join(child.itertext()).strip()
            if key == 'category':
                tags.append(value)
            else:
                fields[key] = value
        title, link = fields.get('title', ''), fields.get('link', '')
        identity = article_key(link)
        if not title or identity in seen:
            raise ValueError('Missing title or duplicate feed identifier')
        seen.add(identity)
        content = fields.get('encoded') or fields.get('description') or ''
        if not content.strip():
            raise ValueError('Missing article content')
        soup = clean_html(content)
        body = html_to_markdown(str(soup))
        if not body:
            raise ValueError('Empty converted article')
        if not body.startswith('# '):
            body = f'# {title}\n\n{body}'
        link_parts = urlsplit(link)
        meta = dict(title=title, date=published_date(fields.get('pubDate', '')), tags=list(dict.fromkeys(tags)),
                    category=classify(tags), description=article_description(soup, title),
                    source='medium', source_id=identity,
                    original_url=urlunsplit((link_parts.scheme, link_parts.netloc, link_parts.path, '', '')))
        if fields.get('updated'):
            meta['updated'] = published_date(fields['updated'])
        image = soup.find('img', src=True)
        if image:
            meta['cover'] = image['src']
        result.append((meta, body + '\n'))
    return result

def sync_feed(name, url):
    if name != 'medium':
        raise ValueError('Unsupported source')
    print('[INFO] Fetching Medium RSS...')
    with urlopen(Request(url, headers={'User-Agent': 'PortfolioRSS/2.0'}), timeout=20) as response:
        entries = parse_feed(response.read())
    existing, slugs = {}, set()
    for path in OUTPUT_DIR.glob('*.md'):
        meta, _ = read_post(path)
        if meta.get('slug') in slugs:
            raise ValueError('Duplicate existing slug')
        slugs.add(meta.get('slug'))
        if meta.get('source') == 'medium':
            identity = meta.get('source_id')
            if not re.fullmatch(r'[a-f0-9]{12}', str(identity)) or identity in existing:
                raise ValueError('Invalid or duplicate existing identifier')
            existing[identity] = (path, meta)
    writes = []
    for imported, body in entries:
        identity = imported['source_id']
        if identity in existing:
            path, old = existing[identity]
            merged = dict(old)
            merged.update(imported)
            # Unavailable metadata stays preserved. Overrides are explicit author-owned fields.
            merged['category'] = classify(imported['tags'], old.get('category_override'))
            merged['description'] = old.get('description_override', imported['description'])
        else:
            stem = re.sub(r'[^a-z0-9]+', '-', imported['title'].lower()).strip('-')[:100] or 'post'
            slug = f'{stem}-{identity}'
            if slug in slugs:
                raise ValueError('Slug collision')
            slugs.add(slug)
            path = OUTPUT_DIR / f'{slug}.md'
            if path.exists():
                raise ValueError('Filename collision')
            merged = dict(imported, slug=slug, featured=False, draft=False)
        if merged.get('description_override') is not None and (not isinstance(merged['description_override'], str) or not merged['description_override'].strip()):
            raise ValueError('Invalid description override')
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', str(merged.get('slug', ''))):
            raise ValueError('Invalid slug')
        if not isinstance(merged.get('featured'), bool) or not isinstance(merged.get('draft'), bool):
            raise ValueError('Invalid flags')
        post = '---\n' + yaml.safe_dump(merged, sort_keys=False, allow_unicode=True) + '---\n' + body
        if path.exists() and path.read_text(encoding='utf-8') == post:
            print(f'[SKIP] {path.name}')
        else:
            writes.append((path, post))
    # All feed entries and existing identities are validated before any writes.
    if writes:
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for path, post in writes:
        action = 'UPDATE' if path.exists() else 'CREATE'
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=OUTPUT_DIR, delete=False) as temp:
            temp.write(post)
            staged = Path(temp.name)
        try:
            staged.replace(path)
        finally:
            staged.unlink(missing_ok=True)
        print(f'[{action}] {path.name}')
    print(f'[INFO] {len(entries)} articles; {len(writes)} changed.')

if __name__ == '__main__':
    try:
        username = os.environ.get('MEDIUM_USERNAME', '').lstrip('@')
        if not re.fullmatch(r'[A-Za-z0-9_-]+', username):
            raise ValueError('Set MEDIUM_USERNAME to a valid Medium account')
        sync_feed('medium', f'https://medium.com/feed/@{username}')
    except Exception as error:
        print(f'[ERROR] Synchronization failed: {type(error).__name__}: {error}', file=sys.stderr)
        sys.exit(1)
