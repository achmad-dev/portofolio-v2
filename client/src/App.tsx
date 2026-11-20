import { useEffect, useState } from 'react';
import { FileSystemProvider, useFileSystem } from '@/context/FileSystemContext';
import { Sidebar } from '@/features/explorer/Sidebar';
import { TopBar } from '@/features/layout/TopBar';
import { EditorArea } from '@/features/editor/EditorArea';
import { StatusLine } from '@/features/layout/StatusLine';
import { TerminalBuffer } from '@/features/terminal/TerminalBuffer';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

function Workspace() {
  const {
    activeFileId,
    openFiles,
    isSidebarOpen,
    setActiveFileId,
    setIsSidebarOpen,
  } = useFileSystem();
  const [terminalOpen, setTerminalOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    const syncHeight = () => {
      document.documentElement.style.setProperty(
        '--workspace-height',
        `${Math.round(viewport?.height ?? window.innerHeight)}px`
      );
    };
    syncHeight();
    viewport?.addEventListener('resize', syncHeight);
    window.addEventListener('resize', syncHeight);
    return () => {
      viewport?.removeEventListener('resize', syncHeight);
      window.removeEventListener('resize', syncHeight);
      document.documentElement.style.removeProperty('--workspace-height');
    };
  }, []);

  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>('.editor-scroll');
    if (!scroller) return;
    const lenis = new Lenis({
      wrapper: scroller,
      content: scroller.querySelector<HTMLElement>('.editor-buffer')!,
    });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 't') {
        event.preventDefault();
        setTerminalOpen((open) => !open);
      }
      if (event.ctrlKey && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        setIsSidebarOpen((open) => !open);
      }
      if (event.ctrlKey && event.key === 'Tab' && openFiles.length > 1) {
        event.preventDefault();
        const index = openFiles.indexOf(activeFileId ?? '');
        setActiveFileId(
          openFiles[
            (index + (event.shiftKey ? openFiles.length - 1 : 1)) %
              openFiles.length
          ]
        );
      }
      if (event.key === 'Escape') setTerminalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeFileId, openFiles, setActiveFileId, setIsSidebarOpen]);

  return (
    <div
      className={`workspace ${isSidebarOpen ? '' : 'sidebar-collapsed'} w-full flex flex-col overflow-hidden bg-catppuccin-base text-catppuccin-text font-mono`}
    >
      <div className="workspace-topbar">
        <TopBar
          terminalOpen={terminalOpen}
          onToggleTerminal={() => setTerminalOpen((open) => !open)}
        />
      </div>
      <div className="flex flex-1 overflow-hidden relative min-h-0">
        <div className="workspace-sidebar">
          <Sidebar />
        </div>
        <EditorArea />
      </div>
      <div className="workspace-status">
        <StatusLine terminalOpen={terminalOpen} />
      </div>
      <div
        className={`terminal-drawer ${terminalOpen ? 'is-open' : ''}`}
        aria-hidden={!terminalOpen}
        inert={!terminalOpen}
      >
        <div className="terminal-heading">
          <span>TERMINAL</span>
          <button
            onClick={() => setTerminalOpen(false)}
            aria-label="Close terminal"
          >
            ×
          </button>
        </div>
        <TerminalBuffer isOpen={terminalOpen} />
      </div>
    </div>
  );
}

function App() {
  return (
    <FileSystemProvider>
      <Workspace />
    </FileSystemProvider>
  );
}

export default App;
