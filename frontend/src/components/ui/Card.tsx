import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * A grouped section: no background, no border, no rounding. Sections are
 * separated by spacing/typography alone — an outlined or filled rectangle
 * around every section is the boxed "AI dashboard" look Harsimran keeps
 * flagging. Small, purposeful boxes (inputs, individual list rows) still
 * carry their own `border` and are unaffected by this.
 */
export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}
