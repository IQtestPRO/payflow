import { cn } from "@/lib/utils";

type PayFlowLogoProps = {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
};

const sizeClasses = {
  sm: {
    mark: "h-9 w-9",
    word: "text-xl",
    tagline: "text-[11px]"
  },
  md: {
    mark: "h-11 w-11",
    word: "text-2xl",
    tagline: "text-xs"
  },
  lg: {
    mark: "h-16 w-16",
    word: "text-4xl",
    tagline: "text-sm"
  }
};

export function PayFlowLogo({ variant = "light", size = "md", showTagline = false, className }: PayFlowLogoProps) {
  const sizes = sizeClasses[size];
  const dark = variant === "dark";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <PayFlowMark className={sizes.mark} variant={variant} />
      <div className="min-w-0">
        <p className={cn("font-bold leading-none tracking-normal", sizes.word)}>
          <span className={dark ? "text-white" : "text-brand-navy"}>Pay</span>
          <span className={dark ? "bg-gradient-to-r from-brand-cyan to-brand-green bg-clip-text text-transparent" : "bg-gradient-to-r from-brand-blue to-brand-electric bg-clip-text text-transparent"}>Flow</span>
        </p>
        {showTagline ? (
          <p className={cn("mt-1 font-semibold tracking-normal", sizes.tagline, dark ? "text-white/70" : "text-muted-foreground")}>
            Operações e recuperação
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function PayFlowMark({ className, variant = "light" }: { className?: string; variant?: "light" | "dark" }) {
  const dark = variant === "dark";

  return (
    <svg className={cn("shrink-0", className)} viewBox="0 0 96 96" role="img" aria-label="PayFlow">
      <defs>
        <linearGradient id="payflow-mark-navy" x1="26" x2="75" y1="7" y2="53" gradientUnits="userSpaceOnUse">
          <stop stopColor="#06245B" />
          <stop offset="1" stopColor="#001A42" />
        </linearGradient>
        <linearGradient id="payflow-mark-blue" x1="16" x2="43" y1="48" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0A84FF" />
          <stop offset="1" stopColor="#0757F8" />
        </linearGradient>
        <linearGradient id="payflow-mark-flow" x1="6" x2="85" y1="47" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0967FF" />
          <stop offset="0.48" stopColor="#16C8C7" />
          <stop offset="1" stopColor="#3BEA8D" />
        </linearGradient>
        <filter id="payflow-mark-shadow" x="-10%" y="-10%" width="120%" height="125%" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#001A42" floodOpacity="0.18" />
        </filter>
      </defs>
      <rect width="96" height="96" rx="22" fill={dark ? "#FFFFFF" : "url(#payflow-mark-navy)"} opacity={dark ? "0.1" : "0.06"} />
      <g filter="url(#payflow-mark-shadow)">
        <path
          d="M31.5 15H58.5C73.5 15 84 25.8 84 40.5C84 55.2 73.5 66 58.5 66H44.5L47.5 51.5H58C64.7 51.5 69.5 47.1 69.5 40.5C69.5 33.9 64.7 29.5 58 29.5H29.5L31.5 15Z"
          fill={dark ? "#F8FBFF" : "url(#payflow-mark-navy)"}
        />
        <path
          d="M22.5 46.5H43.5L36.8 82C36.2 85.1 33.5 87.3 30.3 87.3H18.4C14.4 87.3 11.4 83.7 12.1 79.8L17.5 51.9C18.1 48.8 20.8 46.5 22.5 46.5Z"
          fill="url(#payflow-mark-blue)"
        />
        <path
          d="M5.5 55.5C16.7 38 40 39.7 58.7 47.5C65.1 50.2 70.7 51.2 75.2 50.5L72.4 43.8C71.6 42 73.5 40.2 75.2 41.3L91 51.3C92.8 52.5 92.9 55.1 91.1 56.4L76.2 67.4C74.6 68.6 72.5 67.1 73.1 65.2L75.2 58.7C65.6 62.5 52.1 60.1 39.8 54.8C25.6 48.7 14.5 49.7 5.5 55.5Z"
          fill="url(#payflow-mark-flow)"
        />
      </g>
    </svg>
  );
}
