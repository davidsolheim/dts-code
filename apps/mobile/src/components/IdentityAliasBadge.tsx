import { View } from "react-native";

import { AppText as Text } from "./AppText";

function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    return (parts[0] ?? "?").slice(0, 2).toUpperCase();
  }
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export function IdentityAliasBadge(props: {
  readonly displayName: string;
  readonly accentColor?: string | undefined;
  readonly size?: number;
}) {
  const size = props.size ?? 14;
  return (
    <View
      accessibilityLabel={`Identity alias ${props.displayName}`}
      className="items-center justify-center rounded-full"
      style={{
        backgroundColor: props.accentColor ?? "#6b7280",
        height: size,
        width: size,
      }}
    >
      <Text
        className="font-t3-bold text-white"
        style={{ fontSize: Math.max(7, size * 0.5), lineHeight: size }}
      >
        {initials(props.displayName)}
      </Text>
    </View>
  );
}
