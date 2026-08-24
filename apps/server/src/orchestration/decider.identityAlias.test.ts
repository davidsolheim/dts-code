import {
  CommandId,
  DEFAULT_PROVIDER_INTERACTION_MODE,
  EventId,
  IdentityAliasId,
  ProjectId,
  ProviderInstanceId,
  ThreadId,
  type OrchestrationEvent,
} from "@t3tools/contracts";
import { createModelSelection } from "@t3tools/shared/model";
import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as NodeServices from "@effect/platform-node/NodeServices";

import { decideOrchestrationCommand } from "./decider.ts";
import { createEmptyReadModel, projectEvent } from "./projector.ts";

const now = "2026-01-01T00:00:00.000Z";
const projectId = ProjectId.make("project-alias");
const workAliasId = IdentityAliasId.make("work");
const personalAliasId = IdentityAliasId.make("personal");

const seedProjectCreated = (
  sequence: number,
  defaultAliasId: IdentityAliasId | null = workAliasId,
): OrchestrationEvent => ({
  sequence,
  eventId: EventId.make(`evt-project-alias-${sequence}`),
  aggregateKind: "project",
  aggregateId: projectId,
  type: "project.created",
  occurredAt: now,
  commandId: CommandId.make(`cmd-project-alias-${sequence}`),
  causationEventId: null,
  correlationId: CommandId.make(`cmd-project-alias-${sequence}`),
  metadata: {},
  payload: {
    projectId,
    title: "Alias project",
    workspaceRoot: "/tmp/alias-project",
    defaultModelSelection: null,
    ...(defaultAliasId !== undefined ? { defaultAliasId } : {}),
    scripts: [],
    createdAt: now,
    updatedAt: now,
  },
});

it.layer(NodeServices.layer)("decider identity alias binding", (it) => {
  it.effect("copies project defaultAliasId onto new threads", () =>
    Effect.gen(function* () {
      const readModel = yield* projectEvent(createEmptyReadModel(now), seedProjectCreated(1));
      expect(readModel.projects[0]?.defaultAliasId).toBe(workAliasId);

      const result = yield* decideOrchestrationCommand({
        command: {
          type: "thread.create",
          commandId: CommandId.make("cmd-thread-alias-create"),
          threadId: ThreadId.make("thread-alias"),
          projectId,
          title: "Thread",
          modelSelection: createModelSelection(ProviderInstanceId.make("codex"), "gpt-5-codex"),
          interactionMode: DEFAULT_PROVIDER_INTERACTION_MODE,
          runtimeMode: "full-access",
          branch: null,
          worktreePath: null,
          createdAt: now,
        },
        readModel,
      });
      const event = Array.isArray(result) ? result[0] : result;
      expect(event.type).toBe("thread.created");
      expect((event.payload as { aliasId?: unknown }).aliasId).toBe(workAliasId);

      const withThread = yield* projectEvent(readModel, { ...event, sequence: 2 });
      expect(withThread.threads[0]?.aliasId).toBe(workAliasId);
    }),
  );

  it.effect("overrides and clears thread aliasId through meta.update", () =>
    Effect.gen(function* () {
      const withProject = yield* projectEvent(createEmptyReadModel(now), seedProjectCreated(1));
      const created = yield* decideOrchestrationCommand({
        command: {
          type: "thread.create",
          commandId: CommandId.make("cmd-thread-alias-create"),
          threadId: ThreadId.make("thread-alias"),
          projectId,
          title: "Thread",
          modelSelection: createModelSelection(ProviderInstanceId.make("codex"), "gpt-5-codex"),
          interactionMode: DEFAULT_PROVIDER_INTERACTION_MODE,
          runtimeMode: "full-access",
          branch: null,
          worktreePath: null,
          createdAt: now,
        },
        readModel: withProject,
      });
      const createdEvent = Array.isArray(created) ? created[0] : created;
      const withThread = yield* projectEvent(withProject, { ...createdEvent, sequence: 2 });

      const updated = yield* decideOrchestrationCommand({
        command: {
          type: "thread.meta.update",
          commandId: CommandId.make("cmd-thread-alias-update"),
          threadId: ThreadId.make("thread-alias"),
          aliasId: personalAliasId,
        },
        readModel: withThread,
      });
      const updatedEvent = Array.isArray(updated) ? updated[0] : updated;
      expect((updatedEvent.payload as { aliasId?: unknown }).aliasId).toBe(personalAliasId);
      const afterUpdate = yield* projectEvent(withThread, { ...updatedEvent, sequence: 3 });
      expect(afterUpdate.threads[0]?.aliasId).toBe(personalAliasId);

      const cleared = yield* decideOrchestrationCommand({
        command: {
          type: "thread.meta.update",
          commandId: CommandId.make("cmd-thread-alias-clear"),
          threadId: ThreadId.make("thread-alias"),
          aliasId: null,
        },
        readModel: afterUpdate,
      });
      const clearedEvent = Array.isArray(cleared) ? cleared[0] : cleared;
      expect((clearedEvent.payload as { aliasId?: unknown }).aliasId).toBeNull();
      const afterClear = yield* projectEvent(afterUpdate, { ...clearedEvent, sequence: 4 });
      expect(afterClear.threads[0]?.aliasId).toBeNull();
    }),
  );
});
