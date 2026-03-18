import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

const variants = {
  default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
  destructive: "bg-destructive text-white shadow-sm hover:bg-destructive/90",
  outline: "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
  secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  link: "text-primary underline-offset-4 hover:underline",
  success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-500",
  warning: "bg-amber-600 text-white shadow-sm hover:bg-amber-500",
} as const;

const sizes = {
  default: "h-8 px-3 py-1.5 text-sm",
  sm: "h-7 rounded-md px-2.5 text-xs",
  lg: "h-10 rounded-md px-6 text-sm",
  icon: "h-8 w-8",
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          variants[variant],
          sizes[size],
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button };
