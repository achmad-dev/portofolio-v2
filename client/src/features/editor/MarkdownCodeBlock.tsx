import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { CodeHighlighter } from './CodeHighlighter';

export function MarkdownCodeBlock({
  text,
  language,
}: {
  text: string;
  language?: string;
}) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(text);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
    timer.current = setTimeout(() => setStatus('idle'), 2500);
  };
  return (
    <div className="markdown-code-block not-prose">
      <div className="markdown-code-toolbar">
        <span>{language && language !== 'text' ? language : 'Code'}</span>
        <button type="button" onClick={copy} aria-label="Copy code">
          {status === 'copied' ? (
            <Check size={14} aria-hidden="true" />
          ) : (
            <Copy size={14} aria-hidden="true" />
          )}
          <span aria-live="polite">
            {status === 'copied'
              ? 'Copied'
              : status === 'failed'
                ? 'Copy failed — try again'
                : 'Copy'}
          </span>
        </button>
      </div>
      <CodeHighlighter text={text} type={language || 'text'} reading />
    </div>
  );
}
