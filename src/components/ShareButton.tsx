export function ShareButton({ onShare, ready }: { onShare: () => void; ready: boolean }) {
  return (
    <button className="icon-btn" type="button" onClick={onShare} disabled={!ready}
            title="Send today as an image" aria-label="Send today as an image">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v12M12 3L8 7M12 3l4 4" fill="none" stroke="currentColor"
              strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 13v5.5A1.5 1.5 0 006.5 20h11a1.5 1.5 0 001.5-1.5V13" fill="none"
              stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    </button>
  );
}

export function ThemeButton({ theme, onToggle }: { theme: 'light' | 'dark'; onToggle: () => void }) {
  const toDark = theme === 'light';
  return (
    <button className="icon-btn" type="button" onClick={onToggle}
            title={toDark ? 'Switch to dark' : 'Switch to light'}
            aria-label={toDark ? 'Switch to dark mode' : 'Switch to light mode'}>
      {toDark ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 13.4A8 8 0 1110.6 4a6.6 6.6 0 009.4 9.4z" fill="none"
                stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path d="M12 2.6v2.2M12 19.2v2.2M4.2 12H2M22 12h-2.2M6.3 6.3L4.8 4.8M19.2 19.2l-1.5-1.5M17.7 6.3l1.5-1.5M4.8 19.2l1.5-1.5"
                fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
