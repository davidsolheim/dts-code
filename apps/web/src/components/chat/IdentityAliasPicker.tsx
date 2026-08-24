"use client";

import {
  identityAliasGrokHomeChanged,
  type EnvironmentId,
  type IdentityAliasId,
  type ThreadId,
} from "@t3tools/contracts";
import { useCallback, useMemo } from "react";

import { useEnvironmentSettings } from "../../hooks/useSettings";
import { listIdentityAliases, shouldShowIdentityAliasControl } from "../../identityAliases";
import { threadEnvironment } from "../../state/threads";
import { useAtomCommand } from "../../state/use-atom-command";
import { ComposerSelectControl } from "./ComposerControl";
import { IdentityAliasIcon } from "./IdentityAliasIcon";
import { Select, SelectItem, SelectPopup, SelectValue } from "../ui/select";
import { cn } from "~/lib/utils";

export function IdentityAliasPicker(props: {
  readonly environmentId: EnvironmentId;
  readonly threadId: ThreadId | null;
  readonly currentAliasId: IdentityAliasId | null | undefined;
  readonly compact?: boolean;
  readonly disabled?: boolean;
  readonly triggerClassName?: string;
}) {
  const identityAliases = useEnvironmentSettings(
    props.environmentId,
    (settings) => settings.identityAliases,
  );
  const aliases = useMemo(() => listIdentityAliases(identityAliases), [identityAliases]);
  const updateThreadMetadata = useAtomCommand(
    threadEnvironment.updateMetadata,
    "thread identity alias update",
  );
  const stopThreadSession = useAtomCommand(threadEnvironment.stopSession, "thread session stop");

  const current = aliases.find((alias) => alias.id === props.currentAliasId) ?? null;
  const boundMissing =
    props.currentAliasId != null && props.currentAliasId.length > 0 && current === null;
  const selectValue = current?.id ?? (boundMissing ? "unknown" : "none");

  const applyAlias = useCallback(
    (nextAliasId: IdentityAliasId | null) => {
      if (props.threadId === null || props.disabled) return;
      const next = aliases.find((alias) => alias.id === nextAliasId) ?? null;
      if (boundMissing || identityAliasGrokHomeChanged(current, next)) {
        void stopThreadSession({
          environmentId: props.environmentId,
          input: { threadId: props.threadId },
        });
      }
      void updateThreadMetadata({
        environmentId: props.environmentId,
        input: { threadId: props.threadId, aliasId: nextAliasId },
      });
    },
    [
      aliases,
      boundMissing,
      current,
      props.disabled,
      props.environmentId,
      props.threadId,
      stopThreadSession,
      updateThreadMetadata,
    ],
  );

  if (
    props.threadId === null ||
    !shouldShowIdentityAliasControl({
      aliasCount: aliases.length,
      boundAliasId: props.currentAliasId,
    })
  ) {
    return null;
  }

  return (
    <Select
      value={selectValue}
      disabled={props.disabled}
      onValueChange={(value) => {
        if (value === "unknown") return;
        applyAlias(value === "none" ? null : (value as IdentityAliasId));
      }}
    >
      <ComposerSelectControl
        aria-label="Identity alias"
        className={cn("-ms-1", props.triggerClassName)}
        size={props.compact ? "compact" : "sm"}
        variant="ghost"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {current ? (
            <IdentityAliasIcon
              displayName={current.displayName}
              accentColor={current.accentColor}
            />
          ) : null}
          <SelectValue className="min-w-0 truncate">
            {current?.displayName ?? (boundMissing ? "Unknown alias" : "Identity")}
          </SelectValue>
        </span>
      </ComposerSelectControl>
      <SelectPopup align="start">
        {boundMissing ? <SelectItem value="unknown">Unknown alias</SelectItem> : null}
        <SelectItem value="none">No alias</SelectItem>
        {aliases.map((alias) => (
          <SelectItem key={alias.id} value={alias.id}>
            <span className="flex min-w-0 items-center gap-2">
              <IdentityAliasIcon displayName={alias.displayName} accentColor={alias.accentColor} />
              <span className="min-w-0 truncate">{alias.displayName}</span>
            </span>
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}
