import { useState } from 'react';
import type { Note, NoteEdge } from '../../blog/graph';
export function NoteGraph({
  notes,
  edges,
  activeId,
  onOpen,
}: {
  notes: Note[];
  edges: NoteEdge[];
  activeId: string | null;
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [hovered, setHovered] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const selected = hovered ?? activeId;
  const backlinks = notes.filter((n) =>
    edges.some((e) => e.source === n.id && e.target === activeId)
  );
  const linked = new Set(
    edges
      .filter((e) => e.source === selected || e.target === selected)
      .flatMap((e) => [e.source, e.target])
  );
  const positions = new Map(
    notes.map((note, i) => {
      const angle = (i / Math.max(notes.length, 1)) * Math.PI * 2 - Math.PI / 2;
      return [
        note.id,
        { x: 400 + Math.cos(angle) * 260, y: 150 + Math.sin(angle) * 105 },
      ];
    })
  );
  return (
    <section className="note-graph" aria-label="Linked notes graph">
      <div className="note-graph-controls">
        <label>
          Find a note{' '}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title…"
          />
        </label>
        <label>
          Zoom{' '}
          <input
            type="range"
            min="0.7"
            max="1.8"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setQuery('');
          }}
        >
          Reset
        </button>
      </div>
      <div className="note-graph-canvas">
        <svg
          viewBox={`${400 - 400 / zoom} ${150 - 150 / zoom} ${800 / zoom} ${300 / zoom}`}
          role="group"
          aria-label="Notes and their links"
        >
          {edges.map((e) => {
            const a = positions.get(e.source)!,
              b = positions.get(e.target)!;
            return (
              <line
                key={`${e.source}:${e.target}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={
                  e.source === selected || e.target === selected
                    ? 'is-linked'
                    : ''
                }
              />
            );
          })}
          {notes.map((note) => {
            const pos = positions.get(note.id)!;
            const matches = note.title
              .toLowerCase()
              .includes(query.toLowerCase());
            return (
              <a
                key={note.id}
                href={note.href}
                aria-label={`Open ${note.title}`}
                aria-current={note.id === activeId ? 'page' : undefined}
                className={`graph-node ${note.id === activeId ? 'is-active' : ''} ${linked.has(note.id) ? 'is-linked' : ''} ${!matches ? 'is-muted' : ''}`}
                onMouseEnter={() => setHovered(note.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(note.id)}
                onBlur={() => setHovered(null)}
                onClick={(e) => {
                  if (
                    !e.metaKey &&
                    !e.ctrlKey &&
                    !e.shiftKey &&
                    e.button === 0
                  ) {
                    e.preventDefault();
                    onOpen(note.id);
                  }
                }}
              >
                <title>{note.title}</title>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={note.id === activeId ? 7 : 5}
                />
                <text x={pos.x} y={pos.y + 21} textAnchor="middle">
                  {note.title.length > 30
                    ? note.title.slice(0, 28) + '…'
                    : note.title}
                </text>
              </a>
            );
          })}
        </svg>
      </div>
      <div className="note-backlinks">
        <strong>Backlinks</strong>
        {backlinks.length ? (
          backlinks.map((n) => (
            <button key={n.id} type="button" onClick={() => onOpen(n.id)}>
              {n.title}
            </button>
          ))
        ) : (
          <span>No notes link here yet.</span>
        )}
      </div>
      <p className="note-graph-hint">
        Lines show internal links and articles listed in Writing &amp; Research.
        Select a node to open it.
      </p>
    </section>
  );
}
