import React, { useEffect, useState } from 'react';
import EquipmentView from './components/Equipment/EquipmentView';
import ArtGallery from './components/Gallery/ArtGallery';
import { SECTIONS, HERO_VIEWER_URL, sectionFromHash } from './sections';
import type { SectionKey } from './sections';

const navBtn: React.CSSProperties = {
  background: 'transparent', color: '#8b93a3', border: 'none', borderBottom: '2px solid transparent',
  padding: '6px 2px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
};
const navBtnActive: React.CSSProperties = {
  ...navBtn, color: '#e2922b', borderBottom: '2px solid #e2922b',
};

export default function App() {
  const [section, setSection] = useState<SectionKey>(() => sectionFromHash(window.location.hash));

  // The hash is the source of truth so back/forward and shared links work; clicks just write the hash and this listener brings the state along.
  useEffect(() => {
    const onHash = () => setSection(sectionFromHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', gap: 18, alignItems: 'baseline', flexWrap: 'wrap', borderBottom: '1px solid #2e3850', paddingBottom: 8 }}>
        <h1 style={{ margin: 0 }}>DFK Classic: Assets</h1>
        {SECTIONS.map(s => (
          <button key={s.key} style={section === s.key ? navBtnActive : navBtn}
                  onClick={() => { window.location.hash = s.key; }}>
            {s.label}
          </button>
        ))}
        <a href={HERO_VIEWER_URL} style={{ ...navBtn, textDecoration: 'none' }}>Hero Viewer ↗</a>
      </div>
      {section === 'equipment' && <EquipmentView />}
      {section === 'items' && <ArtGallery label="items" csvs={['items.csv']} />}
      {section === 'npcs' && <ArtGallery label="NPCs" csvs={['npcs.csv', 'npcs-archive.csv']} />}
      {section === 'monsters' && <ArtGallery label="monsters" csvs={['monsters.csv']} />}
    </div>
  );
}
