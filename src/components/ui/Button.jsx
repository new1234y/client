import React from 'react';

const buttonVariants = {
  // Primary - main action buttons (like "Partagé", "Lancer la chasse")
  primary: 'rounded-full bg-blue-500 py-2.5 text-sm font-bold text-white shadow transition hover:bg-blue-600 active:scale-[0.98]',
  
  // Primary gradient - for main CTAs with gradient
  primaryGradient: 'rounded-full bg-gradient-to-r from-blue-500 to-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-600 hover:to-blue-700 active:scale-[0.98]',
  
  // Secondary - secondary actions
  secondary: 'rounded-full border-2 border-blue-300 bg-white py-2.5 text-sm font-semibold text-blue-600 shadow-sm transition hover:bg-blue-50 active:scale-[0.98] dark:border-blue-600 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700',
  
  // Danger - destructive actions (quit, kick, end game)
  danger: 'rounded-full bg-gradient-to-r from-blue-500 to-blue-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-600 hover:to-blue-700 active:scale-[0.98]',
  
  // Success - positive actions (add time, confirm)
  success: 'rounded-full bg-gradient-to-r from-blue-400 to-blue-500 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-500 hover:to-blue-600 active:scale-[0.98]',
  
  // Power - for super powers (purple)
  power: 'rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-600 hover:to-blue-700 active:scale-[0.98]',
  
  // Ghost - minimal buttons (close, cancel)
  ghost: 'rounded-full px-4 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-100 active:scale-[0.98] dark:text-blue-400 dark:hover:bg-slate-800',
  
  // Icon - small icon buttons
  icon: 'h-9 w-9 rounded-full border border-blue-300 bg-white text-blue-700 transition hover:bg-blue-50 active:scale-[0.95] dark:border-blue-600 dark:bg-slate-800 dark:text-blue-200 dark:hover:bg-slate-700',
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
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
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';
  
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
