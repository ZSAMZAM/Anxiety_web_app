function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-4 flex flex-col gap-2">
      {subtitle && <p className="text-[12px] font-bold uppercase tracking-[0.34em] text-[#2563EB] dark:text-[#93C5FD]">{subtitle}</p>}
      <h2 className="max-w-4xl text-3xl font-black tracking-tight text-[#111827] sm:text-4xl dark:text-[#F8FAFC]">{title}</h2>
    </div>
  );
}

export default SectionHeader;
