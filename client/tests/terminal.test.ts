import { test } from 'node:test';
import assert from 'node:assert/strict';
import { terminalCommand } from '../src/features/terminal/commands';
import { CASE_STUDY, SITE } from '../src/config/site';
test('terminal navigation exposes working portfolio destinations and profile URL', () => {
  assert.equal(terminalCommand('ls').fileId, 'content/about.md');
  assert.equal(terminalCommand('blog').fileId, 'blog-index');
  assert.equal(terminalCommand('case-study').fileId, CASE_STUDY.fileId);
  assert.equal(terminalCommand('github').text, SITE.github);
  for (const command of ['ls', 'github', 'blog', 'case-study'])
    assert.ok(terminalCommand('help').text.includes(command));
  assert.equal(terminalCommand('clear').clear, true);
  assert.ok(terminalCommand('invalid').text.includes('command not found'));
});
