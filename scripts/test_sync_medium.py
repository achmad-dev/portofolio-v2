import tempfile
import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import patch
import yaml
import sync_medium as sync
from category_classifier import classify

def feed(title='Original title', body='<p>Hello <strong>world</strong></p>', identifier='46ea9ef371eb'):
    return f'''<rss xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><item>
    <title>{title}</title><link>https://medium.com/@author/post-{identifier}?source=rss</link>
    <pubDate>Fri, 20 Nov 2026 00:00:00 GMT</pubDate><category>Rust</category><category>LLM</category>
    <content:encoded><![CDATA[{body}]]></content:encoded></item></channel></rss>'''.encode()

class SyncTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.output = Path(self.temp.name)
        self.output_patch = patch.object(sync, 'OUTPUT_DIR', self.output)
        self.output_patch.start()
    def tearDown(self):
        self.output_patch.stop()
        self.temp.cleanup()
    def run_feed(self, data):
        with patch.object(sync, 'urlopen', return_value=BytesIO(data)):
            sync.sync_feed('medium', 'https://example.com/feed')
    def test_updates_preserve_identity_and_overrides_and_idempotency(self):
        self.run_feed(feed())
        path = next(self.output.glob('*.md'))
        meta, body = sync.read_post(path)
        meta.update(featured=True, category_override='Finance & Technology', description_override='Custom description')
        renamed = self.output / 'chosen-name.md'
        renamed.write_text('---\n' + yaml.safe_dump(meta) + '---\n' + body)
        path.unlink()
        self.run_feed(feed('Changed title', '<p>Changed body</p>'))
        updated, body = sync.read_post(renamed)
        self.assertEqual(updated['slug'], meta['slug'])
        self.assertEqual(updated['title'], 'Changed title')
        self.assertEqual(updated['category'], 'Finance & Technology')
        self.assertEqual(updated['description'], 'Custom description')
        self.assertTrue(updated['featured'])
        self.assertIn('Changed body', body)
        before, timestamp = renamed.read_bytes(), renamed.stat().st_mtime_ns
        self.run_feed(feed('Changed title', '<p>Changed body</p>'))
        self.assertEqual(renamed.read_bytes(), before)
        self.assertEqual(renamed.stat().st_mtime_ns, timestamp)
        self.assertEqual(len(list(self.output.glob('*.md'))), 1)
    def test_empty_and_missing_feed_posts_preserved(self):
        self.run_feed(feed())
        before = next(self.output.glob('*.md')).read_bytes()
        self.run_feed(b'<rss><channel/></rss>')
        self.assertEqual(next(self.output.glob('*.md')).read_bytes(), before)
        self.run_feed(feed(identifier='890d1768d6dd'))
        self.assertEqual(len(list(self.output.glob('*.md'))), 2)
    def test_invalid_feed_never_writes(self):
        for data in (b'<html/>', b'invalid', feed(identifier='../bad'), feed().replace(b'</channel>', feed().split(b'<channel>')[1].split(b'</channel>')[0] + b'</channel>')):
            with self.assertRaises(Exception):
                self.run_feed(data)
            self.assertEqual(list(self.output.iterdir()), [])
    def test_network_failure(self):
        with patch.object(sync, 'urlopen', side_effect=OSError('offline')):
            with self.assertRaises(OSError):
                sync.sync_feed('medium', 'https://example.com')
        self.assertEqual(list(self.output.iterdir()), [])
    def test_conversion_and_yaml(self):
        body = '<h2>Heading</h2><ol><li>First</li></ol><blockquote>Quote</blockquote><pre><code>x = 1</code></pre><img src="https://example.com/a.png"><script>bad()</script><a href="javascript:bad()">unsafe</a><img src="https://medium.com/_/stat?x">'
        result = sync.html_to_markdown(body)
        for text in ('## Heading', '1.', '> Quote', '```', 'https://example.com/a.png'):
            self.assertIn(text, result)
        for text in ('bad()', '/_/stat?'):
            self.assertNotIn(text, result)
        self.run_feed(feed('A: "quoted" title', body))
        meta, _ = sync.read_post(next(self.output.glob('*.md')))
        self.assertEqual(meta['title'], 'A: "quoted" title')
    def test_validate_all_before_write(self):
        data = feed().replace(b'</channel>', b'<item><title>Bad</title></item></channel>')
        with self.assertRaises(ValueError):
            self.run_feed(data)
        self.assertEqual(list(self.output.iterdir()), [])

class CategoryTests(unittest.TestCase):
    def test_categories(self):
        for tags, expected in [(['Rust'],'Engineering'), (['LLM','Rust'],'Artificial Intelligence'), (['Docker'],'DevOps & Cloud'), (['OWASP'],'Cybersecurity'), (['Finance'],'Finance & Technology'), ([], 'Engineering'), (['unknown'],'Engineering'), (['lLm'],'Artificial Intelligence'), (['API Security'],'Cybersecurity'), (['said'],'Engineering'), (['Rust', 'AWS tooling'],'Engineering')]:
            self.assertEqual(classify(tags), expected)
        self.assertEqual(classify(['LLM'], 'Engineering'), 'Engineering')
        with self.assertRaises(ValueError):
            classify([], 'invalid')

if __name__ == '__main__':
    unittest.main()
