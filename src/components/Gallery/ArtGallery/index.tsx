import React, { useEffect, useMemo, useState } from 'react';
import ArtTile from '../ArtTile';
import { loadArt } from '../../../artCsv';
import type { ArtEntry } from '../../../artCsv';

const inp: React.CSSProperties = {
  background: '#141821', color: '#e9e4d8', border: '1px solid #2e3850',
  padding: '7px 10px', borderRadius: 8, fontSize: 13,
};

// One searchable grid per simple art dataset (items, NPCs, monsters). The CSV is fetched when the section first mounts; relative file paths (mirrored NPC GIFs and baked monster poses) resolve against BASE_URL so the app works under the /dfk-assets/ subpath the same as in dev.
export default function ArtGallery({ label, csv }: { label: string; csv: string }) {
  const [entries, setEntries] = useState<ArtEntry[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(`loading ${label}…`);

  useEffect(() => {
    loadArt(
      label,
      () => fetch(import.meta.env.BASE_URL + csv).then(r => r.text()),
      path => import.meta.env.BASE_URL + path,
    ).then(({ entries: loaded, status: loadStatus }) => {
      setEntries(loaded);
      setStatus(loadStatus);
    });
  }, [label, csv]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(e => `${e.name} ${e.slug}`.toLowerCase().includes(q));
  }, [entries, query]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', margin: '10px 0 6px' }}>
        <input style={{ ...inp, width: 200 }} aria-label={`search ${label}`} placeholder="search name…" value={query}
               onChange={e => setQuery(e.target.value)} />
      </div>
      <div role="status" style={{ color: '#8b93a3', fontSize: 12, marginBottom: 14 }}>
        {entries.length ? `${status} showing ${shown.length}.` : status}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {shown.map(e => (
          <ArtTile key={e.slug} entry={e} />
        ))}
      </div>
    </div>
  );
}
