"use client";

import { ChevronDownIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  EnvironmentId,
  IdentityAlias,
  IdentityAliasId,
  IdentityAliasMap,
  ProviderInstanceEnvironmentVariable,
} from "@t3tools/contracts";

import { useEnvironmentSettings, useUpdateEnvironmentSettings } from "../../hooks/useSettings";
import {
  commitIdentityAliasGitAuthor,
  listIdentityAliases,
  nextIdentityAliasId,
} from "../../identityAliases";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Collapsible, CollapsibleContent } from "../ui/collapsible";
import { DraftInput } from "../ui/draft-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { IdentityAliasIcon } from "../chat/IdentityAliasIcon";
import { ProviderAccentColorPicker } from "./ProviderAccentColorPicker";
import { cn } from "../../lib/utils";

const ENVIRONMENT_VARIABLE_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

let extraEnvDraftId = 0;
const nextExtraEnvDraftId = () => `identity-alias-env-${extraEnvDraftId++}`;

type ExtraEnvDraft = {
  readonly id: string;
  readonly name: string;
  readonly value: string;
  readonly sensitive: boolean;
  readonly valueRedacted?: boolean;
};

function makeExtraEnvDraft(
  variable: ProviderInstanceEnvironmentVariable,
  index: number,
): ExtraEnvDraft {
  return {
    id: `${index}:${variable.name}`,
    name: variable.name,
    value: variable.value,
    sensitive: variable.sensitive,
    ...(variable.valueRedacted !== undefined ? { valueRedacted: variable.valueRedacted } : {}),
  };
}

function extraEnvFingerprint(
  environment: ReadonlyArray<ProviderInstanceEnvironmentVariable>,
): string {
  return JSON.stringify(environment);
}

function ExtraEnvEditor(props: {
  readonly aliasId: IdentityAliasId;
  readonly environment: ReadonlyArray<ProviderInstanceEnvironmentVariable>;
  readonly onChange: (environment: ReadonlyArray<ProviderInstanceEnvironmentVariable>) => void;
}) {
  const [rows, setRows] = useState<ReadonlyArray<ExtraEnvDraft>>(() =>
    props.environment.map(makeExtraEnvDraft),
  );
  const [tableActive, setTableActive] = useState(false);
  const environmentRef = useRef(props.environment);
  environmentRef.current = props.environment;
  const fingerprint = extraEnvFingerprint(props.environment);

  useEffect(() => {
    if (tableActive) return;
    setRows(environmentRef.current.map(makeExtraEnvDraft));
  }, [props.aliasId, fingerprint, tableActive]);

  const publishRows = (nextRows: ReadonlyArray<ExtraEnvDraft>) => {
    const published: ProviderInstanceEnvironmentVariable[] = [];
    for (const row of nextRows) {
      const name = row.name.trim();
      if (!ENVIRONMENT_VARIABLE_NAME_PATTERN.test(name)) {
        if (
          name.length > 0 ||
          row.value.length > 0 ||
          row.sensitive !== true ||
          row.valueRedacted !== undefined
        ) {
          return;
        }
        continue;
      }
      const { id: _id, ...rest } = row;
      published.push({ ...rest, name });
    }
    props.onChange(published);
  };

  const updateVariable = (id: string, patch: Partial<Omit<ExtraEnvDraft, "id">>) => {
    const nextRows = rows.map((row) =>
      row.id === id
        ? {
            ...row,
            ...patch,
            ...(patch.value !== undefined ? { valueRedacted: false } : {}),
          }
        : row,
    );
    setRows(nextRows);
    publishRows(nextRows);
  };

  const removeVariable = (id: string) => {
    const nextRows = rows.filter((row) => row.id !== id);
    setRows(nextRows);
    publishRows(nextRows);
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-foreground">Extra environment</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={() =>
            setRows([
              ...rows,
              {
                id: nextExtraEnvDraftId(),
                name: "",
                value: "",
                sensitive: true,
              },
            ])
          }
        >
          <PlusIcon className="size-3" />
          Add
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Escape hatch for extra spawn variables. Prefer GROK_HOME, GH_CONFIG_DIR, and git author
        above. Sensitive values are stored separately and are not returned after saving.
      </p>
      {rows.length === 0 ? null : (
        <div
          className="overflow-hidden rounded-md border border-border/70"
          onFocusCapture={() => setTableActive(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setTableActive(false);
            }
          }}
        >
          <Table>
            <TableHeader className="bg-muted/25 text-[11px] text-muted-foreground">
              <TableRow className="hover:bg-transparent">
                <TableHead>Variable</TableHead>
                <TableHead>Value</TableHead>
                <TableHead className="w-20">Sensitive</TableHead>
                <TableHead className="w-12 text-right">
                  <span className="sr-only">Options</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((variable, index) => (
                <TableRow key={variable.id}>
                  <TableCell>
                    <DraftInput
                      value={variable.name}
                      onCommit={(name) => updateVariable(variable.id, { name: name.trim() })}
                      placeholder="VARIABLE_NAME"
                      spellCheck={false}
                      aria-label={`Environment variable name ${index + 1}`}
                    />
                  </TableCell>
                  <TableCell>
                    <DraftInput
                      value={variable.valueRedacted ? "" : variable.value}
                      onCommit={(value) => {
                        if (variable.valueRedacted && value.length === 0) return;
                        updateVariable(variable.id, { value });
                      }}
                      type={variable.sensitive ? "password" : undefined}
                      autoComplete="off"
                      placeholder={
                        variable.valueRedacted
                          ? "Stored secret - enter a new value to replace"
                          : "Value"
                      }
                      spellCheck={false}
                      aria-label={`Environment variable value ${index + 1}`}
                    />
                  </TableCell>
                  <TableCell className="w-20">
                    <div className="flex h-8 items-center justify-center">
                      <Checkbox
                        checked={variable.sensitive}
                        onCheckedChange={(checked) => {
                          const sensitive = Boolean(checked);
                          updateVariable(variable.id, {
                            sensitive,
                            ...(sensitive && variable.valueRedacted === undefined
                              ? {}
                              : { valueRedacted: sensitive ? variable.valueRedacted : false }),
                          });
                        }}
                        aria-label={`Mark environment variable ${variable.name || index + 1} as sensitive`}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="w-12 text-right">
                    <Button
                      type="button"
                      size="icon-micro"
                      variant="ghost"
                      aria-label={`Remove ${variable.name || "variable"}`}
                      onClick={() => removeVariable(variable.id)}
                    >
                      <XIcon className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function GitAuthorFields(props: {
  readonly alias: IdentityAlias;
  readonly onChange: (alias: IdentityAlias) => void;
}) {
  const [draft, setDraft] = useState({
    name: props.alias.gitAuthor?.name ?? "",
    email: props.alias.gitAuthor?.email ?? "",
  });

  const commit = (next: { readonly name: string; readonly email: string }) => {
    setDraft(next);
    props.onChange({
      ...props.alias,
      gitAuthor: commitIdentityAliasGitAuthor(next),
    });
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="text-xs font-medium text-foreground">Git author name</span>
        <DraftInput
          className="mt-1.5"
          value={draft.name}
          onCommit={(name) => commit({ name, email: draft.email })}
          placeholder="Work Bot"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-foreground">Git author email</span>
        <DraftInput
          className="mt-1.5"
          value={draft.email}
          onCommit={(email) => commit({ name: draft.name, email })}
          placeholder="work@example.com"
        />
      </label>
    </div>
  );
}

function IdentityAliasCard(props: {
  readonly alias: IdentityAlias;
  readonly onChange: (alias: IdentityAlias) => void;
  readonly onDelete: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const alias = props.alias;

  return (
    <div className="rounded-xl transition-colors hover:bg-muted/20">
      <div className="px-3 py-3 sm:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <IdentityAliasIcon
              displayName={alias.displayName}
              accentColor={alias.accentColor}
              className="size-5 text-[10px]"
            />
            <h3 className="truncate text-sm font-medium text-foreground">{alias.displayName}</h3>
            <code className="truncate rounded bg-muted/60 px-1 py-0.5 text-[10px] text-muted-foreground">
              {alias.id}
            </code>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              size="compact"
              variant="ghost-muted"
              onClick={() => setIsExpanded((open) => !open)}
              aria-label={`Toggle ${alias.displayName} details`}
            >
              <ChevronDownIcon
                className={cn("size-3.5 transition-transform", isExpanded && "rotate-180")}
              />
            </Button>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="icon-micro"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={props.onDelete}
                    aria-label={`Delete identity alias ${alias.displayName}`}
                  >
                    <Trash2Icon className="size-3" />
                  </Button>
                }
              />
              <TooltipPopup side="top">Delete alias</TooltipPopup>
            </Tooltip>
          </div>
        </div>
      </div>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <div className="space-y-5 px-3 pb-4 pt-2 sm:px-4">
            <label className="block">
              <span className="text-xs font-medium text-foreground">Display name</span>
              <DraftInput
                className="mt-1.5"
                value={alias.displayName}
                onCommit={(displayName) => {
                  const next = displayName.trim();
                  if (next.length === 0) return;
                  props.onChange({ ...alias, displayName: next });
                }}
                placeholder="Work"
              />
            </label>
            <ProviderAccentColorPicker
              displayName={alias.displayName}
              value={alias.accentColor ?? ""}
              onCommit={(accentColor) =>
                props.onChange(
                  accentColor.length > 0
                    ? { ...alias, accentColor }
                    : { ...alias, accentColor: undefined },
                )
              }
              commitDelayMs={120}
              description="Used on the thread chip and composer picker."
            />
            <label className="block">
              <span className="text-xs font-medium text-foreground">GROK_HOME</span>
              <DraftInput
                className="mt-1.5"
                value={alias.grokHome}
                onCommit={(grokHome) => props.onChange({ ...alias, grokHome })}
                placeholder="~/.grok-work"
                spellCheck={false}
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                Log in once with `GROK_HOME=... grok login`. Leave empty for the Grok CLI default.
              </span>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-foreground">GH_CONFIG_DIR</span>
              <DraftInput
                className="mt-1.5"
                value={alias.ghConfigDir}
                onCommit={(ghConfigDir) => props.onChange({ ...alias, ghConfigDir })}
                placeholder="~/.config/gh-work"
                spellCheck={false}
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                Log in once with `GH_CONFIG_DIR=... gh auth login`. Git author below is not GitHub
                auth.
              </span>
            </label>
            <GitAuthorFields alias={alias} onChange={props.onChange} />
            <ExtraEnvEditor
              aliasId={alias.id}
              environment={alias.extraEnv ?? []}
              onChange={(extraEnv) => {
                const cleaned = extraEnv.filter((row) =>
                  ENVIRONMENT_VARIABLE_NAME_PATTERN.test(row.name),
                );
                props.onChange(
                  cleaned.length > 0
                    ? { ...alias, extraEnv: cleaned }
                    : { ...alias, extraEnv: undefined },
                );
              }}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function IdentityAliasesSection(props: {
  readonly environmentId: EnvironmentId;
  readonly readOnly?: boolean;
}) {
  const settings = useEnvironmentSettings(props.environmentId);
  const updateSettings = useUpdateEnvironmentSettings(props.environmentId);
  const aliases = useMemo(
    () => listIdentityAliases(settings.identityAliases),
    [settings.identityAliases],
  );

  const writeAliases = (identityAliases: IdentityAliasMap) => {
    updateSettings({ identityAliases });
  };

  const addAlias = () => {
    const existing = new Set(Object.keys(settings.identityAliases ?? {}));
    const id = nextIdentityAliasId("Alias", existing);
    if (id === null) return;
    writeAliases({
      ...settings.identityAliases,
      [id]: {
        id,
        displayName: "Alias",
        grokHome: "",
        ghConfigDir: "",
      },
    });
  };

  const updateAlias = (alias: IdentityAlias) => {
    writeAliases({
      ...settings.identityAliases,
      [alias.id]: alias,
    });
  };

  const deleteAlias = (aliasId: IdentityAliasId) => {
    const next = { ...settings.identityAliases };
    delete next[aliasId];
    writeAliases(next);
  };

  return (
    <div
      inert={props.readOnly}
      aria-disabled={props.readOnly || undefined}
      className={props.readOnly ? "space-y-1 opacity-50 select-none" : "space-y-1"}
    >
      {aliases.length === 0 ? (
        <p className="px-1 text-xs text-muted-foreground">
          Named identities overlay GROK_HOME, GH_CONFIG_DIR, and git author on Grok, GitHub, git
          commits, and integrated terminals. Login stays on the server host.
        </p>
      ) : (
        aliases.map((alias) => (
          <IdentityAliasCard
            key={alias.id}
            alias={alias}
            onChange={updateAlias}
            onDelete={() => deleteAlias(alias.id)}
          />
        ))
      )}
      {!props.readOnly ? (
        <div className="px-1 pt-1">
          <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={addAlias}>
            <PlusIcon className="size-3" />
            Add identity alias
          </Button>
        </div>
      ) : null}
    </div>
  );
}
