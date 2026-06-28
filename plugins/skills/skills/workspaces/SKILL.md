---
name: workspaces
description: Use when the user wants to set up, rename, inspect, or manage SquaredUp workspaces - creating a new workspace for a team, reading a workspace's full settings, updating display names or descriptions. Trigger phrases include "create a workspace", "rename my workspace", "show me the X workspace's settings", "set up a workspace for the QA team", "update the workspace description".
---

> **Region:** If more than one `squaredup-*` server is connected, ask the user which one they mean before running any tools, then use that same server for every SquaredUp tool call in the task.

# Managing SquaredUp workspaces

Workspaces are the top-level grouping unit inside a SquaredUp tenant. Each workspace typically represents a team, product, environment, or business area, and groups its own dashboards, KPIs, and scope. Most read-side discovery (just listing what exists) is covered by the `explore-org` skill - this skill is for the write-side operations and the deeper config inspection of individual workspaces.

## Tool map

| Tool               | What it does                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| `workspace_list`   | List all workspaces in the tenant - id, displayName, type. Returns the workspaces visible to the caller. |
| `workspace_get`    | Full single-workspace read - name, description, type, links. Returns null if not found / no access.      |
| `workspace_create` | Create a new workspace. Body must include `displayName`; other fields optional.                          |
| `workspace_update` | Update an existing workspace. Full overwrite - read with `workspace_get` first.                          |

## Standard workflow: create a workspace

```js
workspace_create({
    body: {
        displayName: 'QA Environment',
        description: 'Quality assurance team and tests',
    },
});
// → { id: "space-..." }
```

The new workspace's id is returned in the response. Optional fields like `description`, `type`, and `links` can be passed alongside `displayName`. The schema is open (`passthrough`) so the API accepts any additional fields the user provides.

## Standard workflow: update a workspace (rename, description, etc.)

`workspace_update` is a **full overwrite**, not a patch. Always:

1. `workspace_get(workspaceId)` - read the current body.
2. Mutate the field the user asked for.
3. `workspace_update({ workspaceId, body: <mutated body> })`.

```js
const current = await workspace_get({ workspaceId: 'space-abc123' });
const updated = { ...current, displayName: 'QA Environment (renamed)' };
await workspace_update({ workspaceId: 'space-abc123', body: updated });
```

## Standard workflow: inspect a workspace's full config

`workspace_get(workspaceId)` returns the full config - description, type (the user-facing workspace type, e.g. `team`, `application`, `environment`), `links`, and `alertingRules`. Use this when the user asks _"what's in the X workspace's settings"_ rather than _"what's inside the X workspace"_ (which would be `dashboard_list` filtered by `workspaceId` - see `dashboards`).

## Common mistakes

- Calling `workspace_update` with a partial body - it's a full overwrite. `workspace_get` first, mutate, then update. Sending only the changed field will wipe everything else.
- Confusing "the workspace exists" (returned by `workspace_list`) with "I can read its config" (`workspace_get` may return `null` for access-controlled workspaces).
- Reaching for `workspace_get` when the user actually wants the _contents_ of the workspace - that's `dashboard_list` filtered by `workspaceId`.
- Creating a duplicate workspace by skipping `workspace_list` first - if uniqueness matters, confirm no workspace with the same `displayName` exists before `workspace_create`.

## When to skip this skill

- The user wants to list workspaces alongside other tenant resources (data sources, dashboards) → `explore-org`.
- The user wants the dashboards / tiles / KPIs _inside_ a workspace → `dashboards` / `kpis`.
- The user wants to duplicate an existing workspace as a template for a new one → `clone-workspace`.
- The user wants to manage who can access a workspace → `permissions`.
- The user is performing graph traversal that starts from a workspace node → `query-graph` (workspaces are `type: 'space'` graph vertices).
