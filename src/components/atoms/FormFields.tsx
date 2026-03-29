import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cx } from '../../lib/classnames';

interface BaseFieldProps {
  id: string;
  label: string;
}

type TextFieldProps = BaseFieldProps & InputHTMLAttributes<HTMLInputElement>;
type TextAreaFieldProps = BaseFieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>;
type SelectFieldProps = BaseFieldProps & SelectHTMLAttributes<HTMLSelectElement>;

export function TextField({ id, label, className, ...props }: TextFieldProps) {
  return (
    <label htmlFor={id} className="field">
      <span className="field-label">{label}</span>
      <input id={id} className={cx('field-control', className)} {...props} />
    </label>
  );
}

export function TextAreaField({ id, label, className, ...props }: TextAreaFieldProps) {
  return (
    <label htmlFor={id} className="field">
      <span className="field-label">{label}</span>
      <textarea id={id} className={cx('field-control field-textarea', className)} {...props} />
    </label>
  );
}

export function SelectField({ id, label, className, children, ...props }: SelectFieldProps) {
  return (
    <label htmlFor={id} className="field">
      <span className="field-label">{label}</span>
      <select id={id} className={cx('field-control field-select', className)} {...props}>
        {children}
      </select>
    </label>
  );
}
