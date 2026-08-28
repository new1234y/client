import React from 'react';

const buttonVariants = {
  primary: 'rounded-full bg-blue-600 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 active:scale-[0.98]',
  primaryGradient: 'rounded-full bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 active:scale-[0.98]',
  secondary: 'rounded-full border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
  danger: 'rounded-full bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 active:scale-[0.98]',
  success: 'rounded-full bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 active:scale-[0.98]',
  power: 'rounded-full bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 active:scale-[0.98]',
  ghost: 'rounded-full border border-slate-200 bg-transparent px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 active:scale-[0.98] dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800',
  icon: 'h-11 w-11 rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 active:scale-[0.95] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
};

const buttonSizes = {
  sm: 'px-3 py-2 text-xs min-h-11',
  md: 'px-4 py-2.5 text-sm min-h-11',
  lg: 'px-6 py-3 text-base min-h-12',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  onClick,
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';
  const variantClasses = buttonVariants[variant] || buttonVariants.primary;
  const sizeClasses = buttonSizes[size] || '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
