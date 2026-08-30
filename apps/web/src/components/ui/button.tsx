import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '#/lib/utils';

export const buttonVariants = cva(
  'inline-flex min-h-13.5 items-center justify-center gap-3 rounded-none border border-ink px-5 font-sans text-[0.8125rem] leading-tight font-[760] no-underline transition-[background-color,color,transform,box-shadow] duration-180 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-trace active:translate-y-0 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-ink text-white shadow-[0_12px_24px_rgb(16_35_50_/_0.16)] hover:-translate-y-0.5 hover:bg-[#173447] hover:shadow-[0_16px_28px_rgb(16_35_50_/_0.2)]',
        secondary: 'bg-paper text-ink hover:bg-[#eef3f5]',
        header:
          'min-h-11 bg-ink px-4.5 text-white shadow-none hover:-translate-y-px hover:bg-[#173447]',
        ghost: 'min-h-11 border-0 bg-transparent px-1 text-ink shadow-none hover:text-trace-text',
        outline: 'min-h-11 border-line bg-transparent px-3 text-ink shadow-none hover:border-trace',
      },
      size: {
        default: '',
        compact: 'min-h-11 gap-2 px-3',
        full: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'default',
    },
  },
);

export function Button({
  className,
  variant,
  size,
  type = 'button',
  ...props
}: ComponentProps<'button'> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      data-slot="button"
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
