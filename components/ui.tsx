import { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-surface border border-border rounded-xl p-5 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-base font-semibold mb-3">{children}</h2>;
}

export function Stat({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className="bg-surface2 border border-border rounded-lg px-4 py-3">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className="text-2xl font-semibold leading-none">
        {value}
        {unit && <span className="text-sm text-muted font-normal ml-1">{unit}</span>}
      </div>
      {hint && <div className="text-xs text-muted mt-1">{hint}</div>}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const v =
    variant === "primary"
      ? "bg-accent hover:bg-accent/90 text-white"
      : variant === "danger"
      ? "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25"
      : "bg-surface2 text-text border border-border hover:bg-surface";
  return (
    <button
      {...rest}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${v} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <div className="text-xs text-muted mb-1">{label}</div>
      {children}
      {hint && <div className="text-xs text-muted mt-1">{hint}</div>}
    </label>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "success" | "warning";
}) {
  const t =
    tone === "accent"
      ? "bg-accent/15 text-accent border-accent/30"
      : tone === "success"
      ? "bg-success/15 text-success border-success/30"
      : tone === "warning"
      ? "bg-warning/15 text-warning border-warning/30"
      : "bg-surface2 text-muted border-border";
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded border ${t}`}>
      {children}
    </span>
  );
}
