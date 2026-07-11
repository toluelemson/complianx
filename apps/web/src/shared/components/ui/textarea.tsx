import * as React from 'react';
import { cn } from '@/shared/utilities/utils';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[120px] w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)] transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';

export { Textarea };
