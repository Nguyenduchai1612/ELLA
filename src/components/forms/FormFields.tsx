import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

/** Section 28/39: consistent label + error/hint wiring for every form field. */
export function Field({ label, htmlFor, error, hint, required, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-neutral-800">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-error-500" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-neutral-500">{hint}</p>
      ) : null}
    </div>
  );
}

const inputBaseClasses =
  "h-11 w-full rounded-lg border border-neutral-300 bg-white px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 disabled:bg-neutral-100 disabled:text-neutral-400";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export function Input({ hasError, className = "", ...rest }: InputProps) {
  return (
    <input
      className={`${inputBaseClasses} ${hasError ? "border-error-500" : ""} ${className}`}
      {...rest}
    />
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export function Textarea({ hasError, className = "", ...rest }: TextareaProps) {
  return (
    <textarea
      className={`min-h-[100px] w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 disabled:bg-neutral-100 disabled:text-neutral-400 ${
        hasError ? "border-error-500" : ""
      } ${className}`}
      {...rest}
    />
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export function Select({ hasError, className = "", children, ...rest }: SelectProps) {
  return (
    <select
      className={`${inputBaseClasses} appearance-none bg-white ${hasError ? "border-error-500" : ""} ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}
