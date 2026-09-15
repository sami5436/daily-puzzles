/** The four square mark. Picks up the theme through the colour tokens. */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="4"  y="4"  width="10" height="10" fill="var(--text)" />
      <rect x="18" y="4"  width="10" height="10" fill="var(--p1)" />
      <rect x="4"  y="18" width="10" height="10" fill="var(--p2)" />
      <rect x="18" y="18" width="10" height="10" fill="var(--text)" />
    </svg>
  );
}
