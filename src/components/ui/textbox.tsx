import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextBoxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  helperText?: string;
}

const TextBox = React.forwardRef<HTMLInputElement, TextBoxProps>(
  ({ className, type, error, label, helperText, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-mono text-white/80">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border font-mono bg-black/40 px-3 py-2 text-sm transition-colors",
            "text-white placeholder:text-white/30",
            "border-white/20 focus:border-white/50",
            "focus:outline-none focus:ring-2 focus:ring-white/10",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500/50 focus:border-red-500 focus:ring-red-500/20",
            className
          )}
          autoComplete="off"
          data-form-type="other"
          ref={ref}
          {...props}
        />
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
TextBox.displayName = "TextBox"

export { TextBox } 
