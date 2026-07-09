function Card({ title, value, description, icon, className = '' }) {
  return (
    <div className={`group rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-lg backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900/75 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sky-600 dark:text-sky-300">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
        </div>
        {icon && <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-lg">{icon}</span>}
      </div>
      {description && <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>}
    </div>
  );
}

export default Card;
