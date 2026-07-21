import { type ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all duration-150 ease-out-strong disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]';

const variants: Record<Variant, string> = {
  primary: 'bg-[var(--text-primary)] text-[var(--bg-elevated)] hover:opacity-90',
  secondary: 'bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--border-strong)]',
  ghost: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className = '', children, ...props },
  ref,
) {
  return (
    <button ref={ref} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      <span className="inline-flex items-center gap-2">{children}</span>
    </button>
  );
});
