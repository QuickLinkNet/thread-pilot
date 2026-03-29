import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../../lib/classnames';

type ButtonVariant = 'primary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  block = false,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(
        'btn',
        `btn-${variant}`,
        size === 'sm' ? 'btn-sm' : 'btn-md',
        block && 'btn-block',
        className
      )}
      {...props}
    />
  );
}
