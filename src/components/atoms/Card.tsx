import type { HTMLAttributes } from 'react';
import { cx } from '../../lib/classnames';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export function Card({ className, elevated = false, ...props }: CardProps) {
  return <div className={cx('card', elevated && 'card-elevated', className)} {...props} />;
}
