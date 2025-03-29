import * as React from "react"
import { cn } from "@/lib/utils"

export interface ContentEditableProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  helperText?: string;
}

const ContentEditable = React.forwardRef<HTMLDivElement, ContentEditableProps>(
  ({ value, onChange, onKeyDown, placeholder, className, disabled, error, label, helperText }, ref) => {
    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
      const content = e.currentTarget.textContent || '';
      onChange(content);
    };

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-mono text-white/80">
            {label}
          </label>
        )}
        <div
          ref={ref}
          contentEditable={!disabled}
          onInput={handleInput}
          onKeyDown={onKeyDown}
          className={cn(
            "flex min-h-[40px] w-full rounded-md border font-mono bg-black/40 px-3 py-2 text-sm transition-colors",
            "text-white placeholder:text-white/30",
            "border-white/20 focus:border-white/50",
            "focus:outline-none focus:ring-2 focus:ring-white/10",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "empty:before:content-[attr(data-placeholder)] empty:before:text-white/30",
            error && "border-red-500/50 focus:border-red-500 focus:ring-red-500/20",
            className
          )}
          data-placeholder={placeholder}
          suppressContentEditableWarning
        >
          {value}
        </div>
        {(error || helperText) && (
          <span className={cn(
            "text-xs font-mono",
            error ? "text-red-400" : "text-white/50"
          )}>
            {error || helperText}
          </span>
        )}
      </div>
    )
  }
)
ContentEditable.displayName = "ContentEditable"

export { ContentEditable } 