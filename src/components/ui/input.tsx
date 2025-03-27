import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    // Use non-standard characters in name to prevent recognition
    const timestamp = Date.now();
    const randomName = `nх_${timestamp}`; // Note: 'х' is Cyrillic 'x', not Latin 'x'
    
    return (
      <input
        type={type || "text"}
        id={randomName}
        name={randomName}
        autoComplete="chrome-off" // Special value to prevent Chrome autofill
        data-lpignore="true"
        data-form-type="other"
        translate="no" // Prevents browser from translating/analyzing content
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          // Add CSS rules to prevent autofill styling
          "[&:-webkit-autofill]:!bg-black/40 [&:-webkit-autofill]:!bg-clip-text [&:-webkit-autofill]:!text-white [&:-webkit-autofill]:!shadow-[0_0_0px_1000px_rgba(0,0,0,0.4)_inset] [&:-webkit-autofill]:!-webkit-text-fill-color-white",
          // Prevent browser from analyzing input
          "[-webkit-credentials-auto-fill-button]:hidden [&::-webkit-credentials-auto-fill-button]:hidden [&::-webkit-caps-lock-indicator]:hidden [&::-webkit-contacts-auto-fill-button]:hidden [&::-webkit-credit-card-auto-fill-button]:hidden [&::-webkit-strong-password-auto-fill-button]:hidden",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
