function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-8 flex flex-col gap-3">
      <p className="text-sm uppercase tracking-[0.35em] text-sky-600 dark:text-sky-300">{subtitle}</p>
      <h2 className="max-w-3xl text-3xl font-semibold text-slate-900 sm:text-4xl dark:text-slate-100">{title}</h2>
    </div>
  );
}

export default SectionHeader;
