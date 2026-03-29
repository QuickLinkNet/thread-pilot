import type { HTMLAttributes } from 'react';
import { cx } from '../../lib/classnames';

interface AlertBoxProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'error' | 'info';
}

export function AlertBox({ tone = 'error', className, children, ...props }: AlertBoxProps) {
  return (
    <div className={cx('alert-box', `alert-${tone}`, className)} {...props}>
      {children}
    </div>
  );
}
