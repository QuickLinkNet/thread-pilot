import type { ReactNode } from 'react';
import { cx } from '../../lib/classnames';

interface SectionHeaderProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, subtitle, action, className }: SectionHeaderProps) {
  const hasHeading = Boolean(title || subtitle);

  return (
    <header className={cx('section-header', className)}>
      {hasHeading ? (
        <div>
          {title ? <h2>{title}</h2> : null}
          {subtitle && <p>{subtitle}</p>}
        </div>
      ) : null}
      {action}
    </header>
  );
}
