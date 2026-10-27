import { useId, type InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export default function TextField({ label, error, ...inputProps }: Props) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-200">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded-lg border bg-sea-900 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 ${
          error ? 'border-coral focus:ring-coral/50' : 'border-sea-700 focus:ring-gold/50'
        }`}
        {...inputProps}
      />
      {/* Altura reservada para que el mensaje no mueva el formulario */}
      <p id={errorId} className="mt-1 min-h-5 text-sm text-coral">
        {error}
      </p>
    </div>
  );
}
