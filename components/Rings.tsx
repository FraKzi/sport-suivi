import { ReactNode } from "react";

type RingProps = {
  progress: number;
  size?: number;
  strokeWidth?: number;
  /** Tailwind utility class controlling the active stroke color (e.g. `text-accent`). */
  colorClass?: string;
  emoji?: string;
  value?: ReactNode;
  label?: string;
  /** Optional extra emoji shown in the bottom-right corner when progress >= 1. */
  doneOverlay?: string;
};

export function Ring({
  progress,
  size = 120,
  strokeWidth = 12,
  colorClass = "text-accent",
  emoji,
  value,
  label,
  doneOverlay = "✓",
}: RingProps) {
  const pct = Math.min(1, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - pct);
  const done = pct >= 1;

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-surface2"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className={`${done ? "text-success" : colorClass} transition-all duration-700 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        {emoji && <div className="text-xl leading-none mb-0.5">{emoji}</div>}
        {value !== undefined && (
          <div className="text-sm font-semibold tabular-nums leading-tight">{value}</div>
        )}
        {label && <div className="text-[10px] text-muted leading-none mt-0.5">{label}</div>}
      </div>
      {done && (
        <div className="absolute -top-1 -right-1 bg-success text-white text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-md">
          {doneOverlay}
        </div>
      )}
    </div>
  );
}
