interface ChatDateSeparatorProps {
  label: string;
}

export function ChatDateSeparator({ label }: ChatDateSeparatorProps) {
  return (
    <div className="chat-date-separator" role="separator" aria-label={label}>
      <span>{label}</span>
    </div>
  );
}

