import * as React from 'react';
import { cn } from '@/shared/utilities/utils';

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = 'text', ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)] transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export { Input };
