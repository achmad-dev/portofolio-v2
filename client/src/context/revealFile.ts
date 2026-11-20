import type { FileSystemState } from '../types';

// Use the explorer tree rather than splitting IDs: virtual pages such as
// blog-index are children of folders even though their IDs contain no slash.
export function revealFile(
  files: FileSystemState,
  fileId: string | null
): FileSystemState {
  if (!fileId || !files[fileId] || files[fileId].type === 'folder')
    return files;
  const findParents = (
    id: string,
    visited: Set<string>
  ): string[] | undefined => {
    if (id === fileId) return [];
    const folder = files[id];
    if (!folder || folder.type !== 'folder' || visited.has(id))
      return undefined;
    visited.add(id);
    for (const child of folder.children ?? []) {
      const parents = findParents(child, visited);
      if (parents) return [id, ...parents];
    }
    return undefined;
  };
  const parents = findParents('root', new Set());
  if (!parents) return files;
  const closed = parents.filter((id) => !files[id].isOpen);
  if (!closed.length) return files;
  const next = { ...files };
  for (const id of closed) next[id] = { ...files[id], isOpen: true };
  return next;
}
