import React from 'react';
import { downloadPng } from '../../../downloadPng';
import type { EquipmentEntry } from '../../../types/equipment';
import styles from './styles.module.css';

// One square block per item: icon, name, type + id, and a PNG download button. The CDN serves 60x60 pixel-art PNGs; they render at 2x with image-rendering: pixelated (integer scale, so the pixels stay crisp instead of smearing). Items whose art does not exist on the CDN yet (the id-0 Ancient relics) get a labeled placeholder of the same size so the grid never shows a broken-image box and rows stay aligned, and no download button since there is nothing to save.
export default function EquipmentTile({ entry }: { entry: EquipmentEntry }) {
  return (
    <div className={styles.tile} title={entry.enumName}>
      {entry.isVisage && <span className={styles.badge}>Visage</span>}
      {entry.hasArt ? (
        <img className={styles.art} src={entry.imageUrl} alt={entry.name} width={120} height={120} loading="lazy" />
      ) : (
        <div className={styles.noArt} role="img" aria-label={`${entry.name} (no art)`}>no art yet</div>
      )}
      <div className={styles.name}>{entry.name}</div>
      <div className={styles.meta}>{entry.equipmentTypeName} #{entry.displayId}</div>
      {entry.hasArt && (
        <button className={styles.download} onClick={() => downloadPng(entry)}
                aria-label={`download ${entry.name} PNG`}>
          Download PNG
        </button>
      )}
    </div>
  );
}
