import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextBoxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  helperText?: string;
}

const TextBox = React.forwardRef<HTMLInputElement, TextBoxProps>(
  ({ className, type, error, label, helperText, ...props }, ref) => {
    // Generate a random ID to prevent browser from recognizing the field
    const randomId = `chat_msg_${Math.random().toString(36).substring(2)}`;
    
    return (
      <div className="flex flex-col gap-1" role="textbox">
        {/* Hidden input to prevent autofill */}
        <input 
          type="text" 
          style={{ display: 'none' }} 
          name="hidden" 
          autoComplete="new-off"
        />
        {label && (
          <label className="text-sm font-mono text-white/80">
            {label}
          </label>
        )}
        <input
          type="search" // Using search prevents password manager triggering
          role="textbox"
          aria-label="Chat message"
          className={cn(
            "flex h-10 w-full rounded-md border font-mono bg-black/40 px-3 py-2 text-sm transition-colors",
            "text-white placeholder:text-white/30",
            "border-white/20 focus:border-white/50",
            "focus:outline-none focus:ring-2 focus:ring-white/10",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500/50 focus:border-red-500 focus:ring-red-500/20",
            className
          )}
          id={randomId}
          name={randomId}
          autoComplete="off"
          data-lpignore="true" // Prevents LastPass from detecting as password field
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
