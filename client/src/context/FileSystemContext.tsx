import { CASE_STUDY, caseStudyHref } from '../config/site';
import { updateSeo } from '../blog/seo';
import { posts, blogHref } from '../blog/catalog';
import { routeFile } from '../blog/model';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { INITIAL_FILES } from '@/config/files';
import { FileSystemState } from '@/types';

// Define the shape of the context value
interface FileSystemContextType {
  files: FileSystemState;
  openFiles: string[];
  activeFileId: string | null;
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveFileId: React.Dispatch<React.SetStateAction<string | null>>;
  toggleFolder: (folderId: string) => void;
  openFile: (fileId: string) => void;
  closeFile: (fileId: string) => void;
  getFileType: (filename: string) => string;
}

// Create the context with an initial undefined value
const FileSystemContext = createContext<FileSystemContextType | undefined>(
  undefined
);

// FileSystemProvider component that provides the file system context to its children
export const FileSystemProvider = ({ children }: { children: ReactNode }) => {
  const [files, setFiles] = useState<FileSystemState>(INITIAL_FILES);
  const initialFile = routeFile(
    window.location.pathname,
    posts,
    import.meta.env.BASE_URL
  );
  const [openFiles, setOpenFiles] = useState<string[]>([initialFile]);
  const [activeFileId, setActiveFileId] = useState<string | null>(initialFile);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const handleViewportChange = () => setIsSidebarOpen(desktop.matches);
    handleViewportChange();
    desktop.addEventListener('change', handleViewportChange);
    return () => desktop.removeEventListener('change', handleViewportChange);
  }, []);

  const toggleFolder = (folderId: string) => {
    if (files[folderId]?.type !== 'folder') return;
    setFiles((prev) => ({
      ...prev,
      [folderId]: {
        ...prev[folderId],
        isOpen: !prev[folderId].isOpen,
      },
    }));
  };

  const selectFile = (fileId: string) => {
    if (!files[fileId] || files[fileId].type === 'folder') return;
    setOpenFiles((prev) => (prev.includes(fileId) ? prev : [...prev, fileId]));
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const navigateFile = (fileId: string | null) => {
    const post = posts.find((p) => p.fileId === fileId);
    const url = post
      ? blogHref(post.slug)
      : fileId === 'blog-index'
        ? blogHref()
        : fileId === CASE_STUDY.fileId
          ? caseStudyHref(import.meta.env.BASE_URL)
          : import.meta.env.BASE_URL;
    if (
      window.location.pathname !== url ||
      window.history.state?.fileId !== fileId
    )
      window.history.pushState({ fileId }, '', url);
    setActiveFileId(fileId);
  };
  const openFile = (fileId: string) => {
    selectFile(fileId);
    navigateFile(fileId);
  };
  useEffect(() => {
    const restore = () => {
      const requested = window.history.state?.fileId;
      const id =
        requested && files[requested] && files[requested].type !== 'folder'
          ? requested
          : routeFile(
              window.location.pathname,
              posts,
              import.meta.env.BASE_URL
            );
      setOpenFiles((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setActiveFileId(id);
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [files]);
  useEffect(() => {
    const post = posts.find((p) => p.fileId === activeFileId);
    updateSeo(
      post,
      activeFileId === 'blog-index',
      activeFileId === 'not-found',
      activeFileId === CASE_STUDY.fileId
    );
  }, [activeFileId]);

  const closeFile = (fileId: string) => {
    const newOpenFiles = openFiles.filter((id) => id !== fileId);
    setOpenFiles(newOpenFiles);

    if (activeFileId === fileId) {
      if (newOpenFiles.length > 0) {
        navigateFile(newOpenFiles[newOpenFiles.length - 1]);
      } else {
        navigateFile(null);
      }
    }
  };

  const getFileType = (filename: string) => {
    if (filename.endsWith('.md')) return 'md';
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.lua')) return 'lua';
    if (filename.endsWith('.sh')) return 'sh';
    return 'txt';
  };

  return (
    <FileSystemContext.Provider
      value={{
        files,
        openFiles,
        activeFileId,
        isSidebarOpen,
        setIsSidebarOpen,
        setActiveFileId: (value) => {
          const next =
            typeof value === 'function' ? value(activeFileId) : value;
          navigateFile(next);
        },
        toggleFolder,
        openFile,
        closeFile,
        getFileType,
      }}
    >
      {children}
    </FileSystemContext.Provider>
  );
};

export const useFileSystem = () => {
  const context = useContext(FileSystemContext);
  if (context === undefined) {
    throw new Error('useFileSystem must be used within a FileSystemProvider');
  }
  return context;
};
