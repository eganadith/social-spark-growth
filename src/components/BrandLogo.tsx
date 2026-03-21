import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
};

/** Socioly wordmark / mark from `public/logo.png` */
export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <img
      src="/logo.png"
      alt="Socioly"
      className={cn("h-8 w-auto max-h-9 object-contain object-left sm:h-9", className)}
      decoding="async"
    />
  );
}
