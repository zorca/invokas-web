/**
 * The Invokas mark: two invoice sheets with a folded corner and a confirmation check.
 * Mirrors src-tauri/icons/app-icon.svg so the in-app brand matches the installed icon.
 */
export function InvokasMark({ className }: { className?: string }) {
  return (
    <svg
      data-testid="invokas-mark"
      viewBox="0 0 512 512"
      className={className}
      role="img"
      aria-label="Invokas"
    >
      <g transform="translate(-142 -150) scale(1.6)">
        <path d="M104 144H310L394 228V402H104Z" fill="#3C407E" />
        <path d="M132 106H302L380 184V374H132Z" fill="#7379F0" />
        <path d="M302 106V184H380Z" fill="#B8BBFF" />
        <rect x="176" y="212" width="140" height="22" rx="11" fill="#F8F9FF" />
        <rect x="176" y="260" width="94" height="18" rx="9" fill="#D5D7FF" />
        <path
          d="M303 315L328 340L374 291"
          fill="none"
          stroke="#54E0B0"
          strokeWidth={22}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
