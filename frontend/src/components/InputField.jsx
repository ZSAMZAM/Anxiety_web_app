import { FiChevronDown } from 'react-icons/fi';

function InputField({ label, type = 'text', placeholder, value, onChange, options = [], error, ...props }) {
  const inputStyles = `w-full rounded-3xl border px-4 py-3 text-slate-900 outline-none transition ${error ? 'border-red-500 focus:border-red-400' : 'border-slate-200 focus:border-sky-400'} bg-white/80 backdrop-blur-sm shadow-sm dark:bg-slate-800/80 dark:text-slate-100 dark:border-slate-700 dark:focus:border-sky-400 dark:placeholder-slate-400`;

  if (type === 'select') {
    return (
      <label className="relative space-y-2 text-sm text-slate-700 dark:text-slate-300">
        <span className="font-medium text-slate-900 dark:text-slate-100">{label}</span>
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
        {error && <p className="mt-2 text-xs text-red-400 dark:text-red-300">{error}</p>}
      </label>
    );
  }

  return (
    <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
      <span className="font-medium text-slate-900 dark:text-slate-100">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={inputStyles}
        {...props}
      />
      {error && <p className="text-xs text-red-400 dark:text-red-300">{error}</p>}
    </label>
  );
}

export default InputField;
