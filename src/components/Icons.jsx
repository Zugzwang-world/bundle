// Shared glyphs. The spark ✦ is the mark of a Claude-formed section (Fig. 4-④).

export function Spark({ size = 12, className = '' }) {
  return (
    <svg className={`ic-spark ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-label="Formed by Claude" role="img">
      <path d="M12 1.6 L14.9 9.1 L22.4 12 L14.9 14.9 L12 22.4 L9.1 14.9 L1.6 12 L9.1 9.1 Z" />
    </svg>
  );
}

export function ChatGlyph({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.5c4.7 0 8.5 3.2 8.5 7.2s-3.8 7.2-8.5 7.2c-.9 0-1.8-.1-2.6-.4L5 20.2l.9-3.4c-1.5-1.3-2.4-3-2.4-5.1 0-4 3.8-7.2 8.5-7.2Z" />
    </svg>
  );
}

export function Chevron({ open, size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .18s ease' }}>
      <path d="m9 5 8 7-8 7" />
    </svg>
  );
}

export function Dots({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

export function Gear({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" />
    </svg>
  );
}

export function Toggle({ on, disabled, onClick, mini = false, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`cl-switch ${mini ? 'is-mini' : ''} ${on ? 'is-on' : ''} ${disabled ? 'is-disabled' : ''}`}
    >
      <span className="cl-switch-knob" />
    </button>
  );
}

export function ZwMark({ size = 34 }) {
  // The Foundation's hourglass-Z, simplified.
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 8h22L14 40h22" />
      <path d="M14 40h22M12 8h22" opacity="0" />
      <path d="M40 6v36" strokeWidth="1.6" opacity=".55" />
    </svg>
  );
}
