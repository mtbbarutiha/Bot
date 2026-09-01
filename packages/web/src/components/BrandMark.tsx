export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <span className={`brand-mark ${className}`}>
      pet<span className="brand-mark-dot">date</span>
    </span>
  );
}
