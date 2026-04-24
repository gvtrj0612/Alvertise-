import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

function Avatar({ src, alt, fallback, size = "md", className, ...props }: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);

  return (
    <div
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {src && !imageError ? (
        <Image
          src={src}
          alt={alt || fallback}
          fill
          className="aspect-square object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-primary-foreground font-medium">
          {fallback.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}

export { Avatar };
