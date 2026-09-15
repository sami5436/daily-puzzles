import { useEffect, useRef, useState } from 'react';
import { cardBlob, drawShareCard } from '../lib/shareCard';
import type { ShareCardInput } from '../lib/shareCard';

/**
 * Renders the day as a PNG and hands it to the system share sheet.
 *
 * The blob is drawn ahead of the click rather than inside it. Safari drops the
 * transient activation that navigator.share requires if an await sits between
 * the gesture and the call, so by click time the file already exists.
 */
export function ShareCard(input: ShareCardInput) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showing, setShowing] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const { p1, p2, row, standings, dateLabel } = input;

  useEffect(() => {
    let url: string | null = null;
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
        url = URL.createObjectURL(blob);
        setPreview(url);
        setFile(new File([blob], `daily-puzzles-${dateLabel}.png`, { type: 'image/png' }));
      })
      .catch(() => undefined);

    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [p1, p2, row, standings, dateLabel]);

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

    // Desktop browsers mostly cannot share a file, so save it instead and let
    // the person attach it themselves.
    if (!preview) return;
    const a = document.createElement('a');
    a.href = preview;
    a.download = file.name;
    a.click();
    setNote('Saved to your downloads.');
    window.setTimeout(() => setNote(null), 4000);
  }

  const empty = !row || row.games.length === 0;

  return (
    <section>
      <h2>Share</h2>
      <div className="row">
        <button className="primary" type="button" onClick={share} disabled={!file}>
          Send today as an image
        </button>
        <button className="link" type="button" onClick={() => setShowing((s) => !s)}>
          {showing ? 'Hide preview' : 'Preview'}
        </button>
      </div>
      {empty && (
        <p className="note" style={{ marginTop: 10 }}>
          Nothing logged for today yet, so the card will come out empty.
        </p>
      )}
      {note && <p className="note" style={{ marginTop: 10 }}>{note}</p>}
      {showing && preview && (
        <img className="card-preview" src={preview} alt="The day rendered as a shareable card" />
      )}
    </section>
  );
}
