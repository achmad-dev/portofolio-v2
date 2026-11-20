import body from '../content/case-studies/ai-ads-workflow-study.md?raw';
import { MarkdownViewer } from '../features/editor/MarkdownViewer';
export function CaseStudyView({ reading = true }: { reading?: boolean }) {
  return (
    <article className={`article-view ${reading ? 'reader-mode' : ''}`}>
      <MarkdownViewer content={body} />
    </article>
  );
}
