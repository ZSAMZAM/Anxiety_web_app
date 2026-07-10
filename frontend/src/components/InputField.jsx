import { FiChevronDown } from 'react-icons/fi';

function InputField({ label, type = 'text', placeholder, value, onChange, options = [], error, className = '', compact = false, ...props }) {
  const sizeStyles = compact
    ? 'h-8 min-h-8 rounded-lg px-3 text-sm'
    : 'min-h-[56px] rounded-2xl px-4 text-base';
  const inputStyles = `w-full border bg-white font-normal text-slate-950 shadow-sm outline-none transition duration-200 placeholder:text-[#9CA3AF] placeholder:font-normal hover:border-[#93C5FD] focus:border-[#2563EB] focus:ring-4 focus:ring-[rgba(37,99,235,.12)] ${sizeStyles} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-[#D6E4F0]'} dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-sky-300 dark:focus:border-sky-400 dark:focus:ring-sky-900/30 ${className}`;
  const labelStyles = `${compact ? 'mb-1 text-xs' : 'mb-2 text-[13px]'} block font-semibold uppercase tracking-[0.03em] text-slate-600 dark:text-slate-300`;

  if (type === 'select') {
    return (
      <label className="block text-sm text-slate-700 dark:text-slate-300">
        <span className={labelStyles}>{label}</span>
        <div className="relative">
        <select
          value={value}
          onChange={onChange}
          className={`${inputStyles} appearance-none pr-10`}
          {...props}
        >
          {options.map((item) => (
            <option key={item.value} value={item.value} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100">
              {item.label}
            </option>
          ))}
        </select>
        <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        </div>
        {error && <p className="mt-2 text-xs text-red-400 dark:text-red-300">{error}</p>}
      </label>
    );
  }

  return (
    <label className="block text-sm text-slate-700 dark:text-slate-300">
      <span className={labelStyles}>{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={inputStyles}
        {...props}
      />
      {error && <p className="mt-2 text-xs text-red-400 dark:text-red-300">{error}</p>}
    </label>
  );
}

export default InputField;
