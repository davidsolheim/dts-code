import { type CSSProperties, memo } from "react";

import { providerInstanceInitials } from "./ProviderInstanceIcon";
import { cn } from "~/lib/utils";

export const IdentityAliasIcon = memo(function IdentityAliasIcon(props: {
  displayName: string;
  accentColor?: string | undefined;
  className?: string;
}) {
  const accentStyle = props.accentColor
    ? ({ "--provider-accent": props.accentColor } as CSSProperties)
    : undefined;

  return (
    <span
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[8px] font-semibold leading-none",
        props.accentColor
          ? "bg-[var(--provider-accent)] text-white"
          : "bg-muted text-muted-foreground",
        props.className,
      )}
      style={accentStyle}
      data-identity-alias-accent={props.accentColor}
      aria-hidden
    >
      {providerInstanceInitials(props.displayName)}
    </span>
  );
});
