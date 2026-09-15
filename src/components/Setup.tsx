import { useState } from 'react';

export function Setup({ onSave }: { onSave: (names: [string, string]) => Promise<void> }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = a.trim().length > 0 && b.trim().length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSave([a.trim(), b.trim()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'something went wrong');
      setBusy(false);
    }
  }

  return (
    <section>
      <h2>Who is playing</h2>
      <form className="panel" onSubmit={submit}>
        <p className="note" style={{ marginBottom: 14 }}>
          Two players. No accounts, no passwords. You can change these later.
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          <input type="text" placeholder="First name" value={a} maxLength={40}
                 onChange={(e) => setA(e.target.value)} aria-label="First player name" />
          <input type="text" placeholder="Second name" value={b} maxLength={40}
                 onChange={(e) => setB(e.target.value)} aria-label="Second player name" />
        </div>
        <div style={{ marginTop: 14 }}>
          <button className="primary" type="submit" disabled={!ready || busy}>
            {busy ? 'Saving' : 'Start'}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </form>
    </section>
  );
}
