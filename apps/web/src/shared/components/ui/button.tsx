import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/utilities/utils';

const buttonVariants = cva(
  'hz-button inline-flex items-center justify-center whitespace-nowrap focus-visible:outline-none disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'hz-button--primary',
        secondary: 'hz-button--secondary',
        outline: 'hz-button--outline',
        ghost: 'hz-button--ghost',
      },
      size: {
        default: 'hz-button--md',
        sm: 'hz-button--sm',
        lg: 'hz-button--lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
