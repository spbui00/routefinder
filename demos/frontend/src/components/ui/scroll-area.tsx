import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function ScrollArea({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("overflow-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent", className)}
      {...props}
    />
  );
}
