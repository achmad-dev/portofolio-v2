import { useFileSystem } from '../../context/FileSystemContext';
import { terminalCommand } from './commands';
import { SITE } from '../../config/site';
import React, { useEffect, useRef, useState } from 'react';

interface TerminalLine {
  type: 'system' | 'input' | 'output';
  text: string;
}

const prompt = 'achmad@portfolio:~$';
const email = SITE.email;

export const TerminalBuffer: React.FC<{ isOpen?: boolean }> = ({
  isOpen = true,
}) => {
  const { openFile } = useFileSystem();
  const [history, setHistory] = useState<TerminalLine[]>([
    { type: 'system', text: 'achmad@portfolio — interactive shell' },
    { type: 'system', text: 'Type "help" to see available commands.' },
  ]);
  const [input, setInput] = useState('');
  const historyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCommand = (value: string) => {
    const result = terminalCommand(value);
    if (result.clear) {
      setHistory([]);
      return;
    }
    if (result.fileId) openFile(result.fileId);
    const response = result.text;
    setHistory((previous) => [
      ...previous,
      { type: 'input', text: value },
      ...(response ? [{ type: 'output' as const, text: response }] : []),
    ]);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleCommand(input);
    setInput('');
  };

  useEffect(() => {
    const scroller = historyRef.current;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }, [history, input, isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  return (
    <div className="flex-1 min-h-0 p-4 font-mono text-sm bg-catppuccin-base text-catppuccin-text">
      <div
        ref={historyRef}
        className="terminal-history h-full overflow-y-auto custom-scrollbar pr-2"
        onClick={() => inputRef.current?.focus()}
      >
        {history.map((line, index) => (
          <div
            key={index}
            className={`whitespace-pre-wrap leading-6 ${line.type === 'input' ? 'text-catppuccin-text' : 'text-catppuccin-subtext0'}`}
          >
            {line.type === 'input' ? (
              <>
                <span className="text-catppuccin-green font-bold">
                  {prompt}
                </span>{' '}
                {line.text}
              </>
            ) : line.text.includes(email) ? (
              <>
                {line.text.split(email)[0]}
                <a
                  className="text-catppuccin-blue underline"
                  href={`mailto:${email}`}
                >
                  {email}
                </a>
              </>
            ) : (
              line.text
            )}
          </div>
        ))}
        <form
          onSubmit={handleSubmit}
          className="flex items-center min-w-0 leading-6"
        >
          <label
            htmlFor="terminal-input"
            className="text-catppuccin-green font-bold whitespace-nowrap"
          >
            {prompt}
          </label>
          <input
            id="terminal-input"
            ref={inputRef}
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="flex-1 min-w-0 ml-2 bg-transparent border-none outline-none text-catppuccin-text focus:ring-0 p-0"
            autoComplete="off"
            spellCheck={false}
            aria-label="Terminal command"
          />
        </form>
      </div>
    </div>
  );
};
