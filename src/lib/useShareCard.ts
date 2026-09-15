import { useEffect, useRef, useState } from 'react';
import { cardBlob, drawShareCard } from './shareCard';
import type { ShareCardInput } from './shareCard';

/**
 * Keeps a rendered PNG of the day ready to send.
 *
 * The file is drawn ahead of the tap rather than inside it. Safari drops the
 * transient activation navigator.share requires if an await sits between the
 * gesture and the call, so by tap time the file already exists.
 */
export function useShareCard(input: ShareCardInput) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const { p1, p2, row, standings, dateLabel } = input;

  useEffect(() => {
    let live = true;
    const canvas = canvasRef.current ?? document.createElement('canvas');
    canvasRef.current = canvas;

    try {
      drawShareCard(canvas, { p1, p2, row, standings, dateLabel });
    } catch {
      return;
    }

    cardBlob(canvas)
      .then((blob) => {
        if (!live) return;
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = URL.createObjectURL(blob);
        setFile(new File([blob], `daily-puzzles-${dateLabel}.png`, { type: 'image/png' }));
      })
      .catch(() => undefined);

    return () => { live = false; };
  }, [p1, p2, row, standings, dateLabel]);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  function share() {
    if (!file) return;
    const nav = navigator as Navigator & {
      canShare?: (d: ShareData) => boolean;
      share?: (d: ShareData) => Promise<void>;
    };

    if (nav.canShare?.({ files: [file] }) && nav.share) {
      nav.share({ files: [file], title: 'Daily Puzzles' }).catch(() => undefined);
      return;
    }

    // Desktop browsers mostly cannot share a file, so save it instead.
    const url = urlRef.current;
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    setNote('Saved to your downloads');
    window.setTimeout(() => setNote(null), 3500);
  }

  return { share, ready: file !== null, note };
}
