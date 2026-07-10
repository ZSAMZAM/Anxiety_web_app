function Card({ title, value, description, icon, trend, className = '' }) {
  return (
    <div className={`premium-stat-card group relative min-h-[104px] overflow-hidden rounded-[16px] border border-[#E2E8F0] bg-white/92 p-4 shadow-[0_18px_46px_-38px_rgba(37,99,235,0.34)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_-48px_rgba(37,99,235,0.55)] dark:border-white/10 dark:bg-[#0B2239]/86 ${className}`}>
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#3B82F6]/70 to-transparent" />
      <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#2563EB]/12 blur-2xl" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8] dark:text-[#93C5FD]">{title}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-[#0F172A] dark:text-white">{value}</p>
        </div>
        {icon && <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition group-hover:scale-105 dark:bg-[#102B46] dark:text-[#60A5FA]">{icon}</span>}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        {description && <p className="text-sm leading-5 text-[#64748B] dark:text-[#B6C6DA]">{description}</p>}
        {trend && <span className="rounded-full bg-[#EFF6FF] px-2.5 py-1 text-xs font-bold text-[#2563EB] dark:bg-[#2563EB]/14 dark:text-[#93C5FD]">{trend}</span>}
      </div>
    </div>
  );
}

export default Card;
