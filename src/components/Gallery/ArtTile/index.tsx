import React from 'react';
import { downloadImage, artFileName } from '../../../downloadPng';
import type { ArtEntry } from '../../../artCsv';
import styles from './styles.module.css';

// Generic tile for the simple art datasets (items, NPCs, monsters): image, name, download button. Unlike equipment icons, these images come in assorted sizes (item icons, tall NPC GIFs, baked monster poses), so the art box letterboxes with object-fit: contain instead of forcing a fixed bitmap size; image-rendering: pixelated keeps the upscale crisp either way. NPC GIFs animate in place for free since they are real <img> GIFs.
export default function ArtTile({ entry }: { entry: ArtEntry }) {
  return (
    <div className={styles.tile} title={entry.slug}>
      <img className={styles.art} src={entry.imageUrl} alt={entry.name} loading="lazy" />
      <div className={styles.name}>{entry.name}</div>
      {entry.note && <div className={styles.meta}>{entry.note}</div>}
      <button className={styles.download} onClick={() => downloadImage(entry.imageUrl, artFileName(entry))}
              aria-label={`download ${entry.name} image`}>
        Download
      </button>
    </div>
  );
}
