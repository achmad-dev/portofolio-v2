import { posts, blogHref } from '../../blog/catalog';
import { ArticleView, BlogView } from '../../blog/BlogView';
import React, { Suspense, useEffect, useState } from 'react';
import { useFileSystem } from '@/context/FileSystemContext';
import { Terminal } from 'lucide-react';
import { CodeHighlighter } from './CodeHighlighter';
import { MarkdownViewer } from './MarkdownViewer';

export const EditorArea: React.FC = () => {
  const { files, activeFileId, getFileType, openFile } = useFileSystem();
  const [readerMode, setReaderMode] = useState(false);
  const isMarkdown = Boolean(
    activeFileId && files[activeFileId]?.name.endsWith('.md')
  );

  useEffect(() => {
    document.querySelector<HTMLElement>('.editor-scroll')?.scrollTo(0, 0);
  }, [activeFileId]);

  return (
    <div className="flex-1 flex flex-col bg-catppuccin-base relative w-full h-full min-w-0 min-h-0">
      {/* Breadcrumbs / WinBar */}
      {activeFileId && files[activeFileId] && (
        <div className="h-8 flex items-center justify-between px-4 text-xs text-catppuccin-overlay0 border-b border-catppuccin-surface1/50 bg-catppuccin-base flex-shrink-0">
          <div className="flex items-center">
            {`portfolio > ${activeFileId.replace(/^content\//, '').replace(/\//g, ' > ')}`}
          </div>
          {isMarkdown && (
            <button
              type="button"
              onClick={() => setReaderMode((value) => !value)}
              aria-pressed={readerMode}
              className="reader-toggle"
            >
              {readerMode ? 'EDITOR VIEW' : 'READER VIEW'}
            </button>
          )}
        </div>
      )}

      {/* Content Scroll Area */}
      <div className="editor-scroll flex-1 min-h-0 overflow-auto custom-scrollbar relative">
        <div className="editor-buffer relative min-h-full">
          <Suspense
            fallback={
              <div className="p-4 text-catppuccin-overlay0 animate-pulse">
                Loading buffer...
              </div>
            }
          >
            {activeFileId && files[activeFileId] ? (
              activeFileId === 'blog-index' ? (
                <BlogView posts={posts} href={blogHref} onOpen={openFile} />
              ) : activeFileId === 'not-found' ? (
                <section className="blog-view">
                  <h1>Page not found</h1>
                  <a href={blogHref()}>Browse articles</a>
                </section>
              ) : files[activeFileId].name.endsWith('.md') ? (
                <div
                  className={`markdown-buffer min-h-full ${readerMode ? 'reader-mode' : ''}`}
                >
                  {posts.find((p) => p.fileId === activeFileId) ? (
                    <ArticleView
                      post={posts.find((p) => p.fileId === activeFileId)!}
                    />
                  ) : (
                    <MarkdownViewer
                      content={files[activeFileId].content ?? ''}
                    />
                  )}
                </div>
              ) : (
                <div className="p-2 md:p-4 min-h-full pb-20">
                  <CodeHighlighter
                    text={files[activeFileId].content}
                    type={getFileType(files[activeFileId].name)}
                  />
                </div>
              )
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-catppuccin-overlay0">
                <Terminal size={64} className="mb-4 opacity-20" />
                <p>No buffer open</p>
                <p className="text-xs mt-2">Select a file from the sidebar</p>
              </div>
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
};
