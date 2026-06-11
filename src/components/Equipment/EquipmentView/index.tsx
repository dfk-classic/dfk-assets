import React, { useEffect, useMemo, useState } from 'react';
import EquipmentTile from '../EquipmentTile';
import { loadEquipment } from '../../../equipment';
import { filterEquipment, TABS } from '../../../filterEquipment';
import type { FilterTab } from '../../../filterEquipment';
import type { EquipmentEntry } from '../../../types/equipment';

const btn: React.CSSProperties = {
  background: '#1d2330', color: '#e9e4d8', border: '1px solid #2e3850',
  padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
};
// Full border shorthand, not borderColor: a tab button swaps between btn and activeBtn on rerender, and React warns (and can mis-style) when a shorthand and its longhand are mixed across renders.
const activeBtn: React.CSSProperties = {
  ...btn, border: '1px solid #e2922b', color: '#e2922b',
};
const inp: React.CSSProperties = {
  background: '#141821', color: '#e9e4d8', border: '1px solid #2e3850',
  padding: '7px 10px', borderRadius: 8, fontSize: 13,
};

export default function EquipmentView() {
  const [entries, setEntries] = useState<EquipmentEntry[]>([]);
  const [tab, setTab] = useState<FilterTab>('all');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('loading equipment…');

  useEffect(() => {
    loadEquipment([
      () => fetch(import.meta.env.BASE_URL + 'gear.csv').then(r => r.text()),
      () => fetch(import.meta.env.BASE_URL + 'visages.csv').then(r => r.text()),
    ]).then(({ entries: loaded, status: loadStatus }) => {
      setEntries(loaded);
      setStatus(loadStatus);
    });
  }, []);

  const shown = useMemo(() => filterEquipment(entries, tab, query), [entries, tab, query]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', margin: '10px 0 6px' }}>
        {TABS.map(t => (
          <button key={t.key} style={tab === t.key ? activeBtn : btn} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
        <span style={{ width: 14 }} />
        <input style={{ ...inp, width: 200 }} aria-label="search equipment" placeholder="search name…" value={query}
               onChange={e => setQuery(e.target.value)} />
      </div>
      <div role="status" style={{ color: '#8b93a3', fontSize: 12, marginBottom: 14 }}>
        {entries.length ? `${status} showing ${shown.length}.` : status}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {shown.map(e => (
          <EquipmentTile key={`${e.category}-${e.equipmentType}-${e.displayId}`} entry={e} />
        ))}
      </div>
    </div>
  );
}
