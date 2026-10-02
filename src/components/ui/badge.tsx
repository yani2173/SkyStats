import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none',
  {
    variants: {
      variant: {
        default: 'bg-zinc-800 text-zinc-100 border border-zinc-700/60',
        secondary: 'bg-zinc-800/60 text-zinc-300 border border-zinc-800',
        outline: 'border border-zinc-700 text-zinc-300',
        emerald: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
        sky: 'bg-sky-500/10 text-sky-400 border border-sky-500/25',
        amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/25',
        rose: 'bg-rose-500/10 text-rose-400 border border-rose-500/25',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
