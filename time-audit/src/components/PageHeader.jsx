export default function PageHeader({ title, subtitle, right }) {
  return (
    <div className="px-8 pt-8 pb-5 flex items-end justify-between gap-6 border-b border-border">
      <div>
        <div className="text-[11px] uppercase tracking-widest text-muted">{subtitle}</div>
        <h1 className="font-display text-3xl mt-1">{title}</h1>
      </div>
      {right}
    </div>
  );
}
