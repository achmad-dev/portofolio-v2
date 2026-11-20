import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revealFile } from '../src/context/revealFile';
import type { FileSystemState } from '../src/types';
const tree = (): FileSystemState => ({
  root: {
    id: 'root',
    name: 'root',
    type: 'folder',
    isOpen: false,
    children: ['blog', 'case-studies', 'config'],
  },
  blog: {
    id: 'blog',
    name: 'blog',
    type: 'folder',
    isOpen: false,
    children: ['blog-index', 'blog/post.md'],
  },
  'blog-index': { id: 'blog-index', name: 'Writing & Research', type: 'file' },
  'blog/post.md': { id: 'blog/post.md', name: 'post.md', type: 'file' },
  'case-studies': {
    id: 'case-studies',
    name: 'case-studies',
    type: 'folder',
    isOpen: false,
    children: ['case-studies/study.md'],
  },
  'case-studies/study.md': {
    id: 'case-studies/study.md',
    name: 'study.md',
    type: 'file',
  },
  config: {
    id: 'config',
    name: 'config',
    type: 'folder',
    isOpen: false,
    children: [],
  },
});
test('navigation reveals virtual blog index, articles and case studies without opening unrelated folders', () => {
  for (const id of ['blog-index', 'blog/post.md', 'case-studies/study.md']) {
    const files = tree();
    const next = revealFile(files, id);
    const folder = id.startsWith('case-studies/') ? 'case-studies' : 'blog';
    assert.equal(next.root.isOpen, true);
    assert.equal(next[folder].isOpen, true);
    assert.equal(next.config.isOpen, false);
    assert.equal(
      next[folder === 'blog' ? 'case-studies' : 'blog'].isOpen,
      false
    );
    assert.equal(files.root.isOpen, false);
    assert.equal(files[folder].isOpen, false);
    assert.equal(revealFile(next, id), next);
  }
});
test('reselecting a page reopens a manually collapsed parent and leaves other open folders alone', () => {
  let files = revealFile(tree(), 'blog-index');
  files = {
    ...files,
    blog: { ...files.blog, isOpen: false },
    config: { ...files.config, isOpen: true },
  };
  const next = revealFile(files, 'blog-index');
  assert.equal(next.blog.isOpen, true);
  assert.equal(next.config.isOpen, true);
  for (const id of [null, 'missing', 'blog'])
    assert.equal(revealFile(files, id), files);
});
