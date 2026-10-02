import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-zinc-100 text-zinc-900 font-semibold hover:bg-zinc-200 shadow-xs active:bg-zinc-300',
        secondary: 'bg-zinc-800/80 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100 border border-zinc-750',
        outline: 'border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 hover:text-zinc-100 text-zinc-300',
        ghost: 'hover:bg-zinc-800/70 text-zinc-400 hover:text-zinc-100',
        accent: 'bg-sky-600 text-white font-semibold hover:bg-sky-500 shadow-xs',
        destructive: 'bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25',
        success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25',
      },
      size: {
        default: 'h-8 px-3.5 py-1.5',
        sm: 'h-7 rounded px-2.5 text-[11px]',
        lg: 'h-9 rounded-md px-5 text-sm',
        icon: 'h-8 w-8 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
