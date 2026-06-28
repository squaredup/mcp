---
name: clone-workspace
description: Use when the user wants to clone, copy, or duplicate an existing SquaredUp workspace - replicating its dashboards, scopes, and KPIs under a new name, optionally with substitutions like "copy customer A as customer B". Trigger phrases include "clone the X workspace", "copy this workspace for Y", "duplicate the production workspace as staging", "make a copy of the customer A workspace for customer B", "use X as a template for a new workspace".
---

> **Region:** If more than one `squaredup-*` server is connected, ask the user which one they mean before running any tools, then use that same server for every SquaredUp tool call in the task.

# Cloning a SquaredUp workspace

Cloning lets you stand up a new workspace whose dashboards, scopes, and KPIs mirror an existing one - typically as a starting point for a sibling team, environment, or customer. Think of it as AI-powered Terraform: the AI reads the source workspace as a template and re-applies it under a new name, with optional substitutions ("copy customer A as customer B") along the way.

There's no single `workspace_clone` tool - cloning is a composition of `workspace_*` and `dashboard_clone`, with optional string substitution applied to each clone afterwards for tweaks. The recipe below is the canonical path.

**Use `dashboard_clone`, not `dashboard_get` + `dashboard_create`.** `dashboard_clone` copies a dashboard into the target workspace and clones its variables and scopes into that workspace too, remapping every tile reference - so the clone is self-contained. Rebuilding a dashboard with `dashboard_get` + `dashboard_create` only copies `content`; it leaves the new dashboard's tiles pointing at the **source** workspace's variables/scopes, which then need manual rescoping.

## Tool map

| Tool                                 | Role in a clone                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `workspace_list`                     | Confirm the new `displayName` doesn't already exist; locate the source workspace by name.                           |
| `workspace_get`                      | Read the source workspace's `description`, `type`, and `links` to carry across.                                     |
| `workspace_create`                   | Stand up the target workspace. Returns the new `id` you'll clone the dashboards into.                               |
| `dashboard_list`                     | Enumerate dashboards in the source workspace (filter the response by `workspaceId`).                                |
| `dashboard_clone`                    | Copy a dashboard into the target workspace, cloning + remapping its variables and scopes. The core of the clone.    |
| `dashboard_get` / `dashboard_update` | Only for post-clone tweaks - read the clone's content, rewrite display strings, write it back.                      |
| `scope_resolve`                      | Re-resolve any concrete `resolvedIds` if the clone targets a different set of entities (e.g. a different customer). |
| `workspace_list_source_types`        | Sanity-check that the new workspace surfaces the expected data source types once cloned.                            |

## Standard workflow

```js
// 1. Find the source workspace.
const workspaces = await workspace_list();
const source = workspaces.find((w) => w.displayName === 'Customer A');
const sourceConfig = await workspace_get({ workspaceId: source.id });

// 2. Make sure the new name is free.
if (workspaces.some((w) => w.displayName === 'Customer B')) {
    throw new Error('Workspace "Customer B" already exists.');
}

// 3. Create the target workspace, carrying across non-name config.
const { id: targetId } = await workspace_create({
    body: {
        displayName: 'Customer B',
        description: sourceConfig.description,
        type: sourceConfig.type,
        links: sourceConfig.links,
    },
});

// 4. Clone each dashboard into the target workspace. dashboard_clone carries the variables and
//    scopes across (remapped) - nothing to rescope afterwards.
const dashboards = await dashboard_list();
const sourceDashboards = dashboards.filter((d) => d.workspaceId === source.id);

for (const summary of sourceDashboards) {
    await dashboard_clone({
        dashboardId: summary.id,
        sourceWorkspaceId: source.id,
        targetWorkspaceId: targetId,
    });
    // For a tweaked clone ("customer A as customer B"), apply substitutions afterwards - see below.
}
```

Run the dashboard step **sequentially** (or with a small concurrency cap) rather than fully parallel - every clone writes to the same workspace and a flood of concurrent writes can hit rate limits or interleave with the graph indexer.

## Workflow gotcha

`workspace_get` returns null when the workspace doesn't exist _or_ the user lacks access, and `description` / `type` / `links` are all optional on the response. If `workspace_get` returns null or omits a field, proceed by creating the target with just `displayName` - you can then call `workspace_update` to carry across `links.plugins` (the only field that's actually load-bearing for data-source reachability - see next section).

## What does and doesn't get cloned

**Cloned automatically by `dashboard_clone`:**

- Dashboard layouts and every tile, including their `dataStream`, `scope`, `visualisation`, `monitor`, and `kpi` decorations. New KPI instances appear a few seconds after the dashboard is saved (the graph indexer is async - see the `kpis` skill).
- **Dashboard variables and scopes** - recreated as new entities in the target workspace, with every tile reference remapped to the new IDs. (This is the part a manual `dashboard_get` + `dashboard_create` rebuild misses, which is why you should use `dashboard_clone`.)
- Workspace `description`, `type`, and `links` (when passed through to `workspace_create`). **`links.plugins` in particular is load-bearing** - it's the list of plugin instances this workspace is allowed to query. Drop it and dashboards in the clone won't be able to reach any data sources, even though they reference valid `config-…` IDs.

**Not cloned - shared at the tenant level:**

- **Data sources** (`config-…` IDs). Dashboards in the cloned workspace will keep referencing the same `pluginConfigId` / `activePluginConfigIds` - there's nothing to copy. If the clone needs to point at a different data source (e.g. a separate AWS account), see "Applying tweaks" below.
- **Plugins** (`plugin-…` IDs). Definitions, not instances.
- **KPI types / categories** (`config-…` IDs in the KPI catalogue). Cloned KPI instances reference the same categories.

**Not cloned - needs a follow-up step:**

- Workspace permissions / access control. `workspace_create` doesn't accept ACL fields; reapply via the normal access-control flow once the workspace exists.
- Anything outside the workspace that referenced source IDs - alert routing, external bookmarks, exported reports.

## Applying tweaks ("copy customer A as customer B")

Apply tweaks **after** cloning, so the clone keeps the variables/scopes `dashboard_clone` remapped. Clone first, then read the new dashboard, rewrite, and write it back:

```js
const { dashboardId: newId } = await dashboard_clone({
    dashboardId: summary.id,
    sourceWorkspaceId: source.id,
    targetWorkspaceId: targetId,
});
const clone = await dashboard_get({ dashboardId: newId });
await dashboard_update({
    dashboardId: newId,
    body: { displayName: clone.name.replace('Customer A', 'Customer B'), content: rewrite(clone.content) },
});
```

The body of every dashboard is JSON - tile titles, descriptions, scope filters, SQL queries inside `dataSourceConfig`. The simplest tweak is a string substitution over the full content blob - but keep it to display strings, **not IDs**, or you'll undo the variable/scope remapping the clone just did:

```js
function rewrite(content) {
    const json = JSON.stringify(content).replaceAll('Customer A', 'Customer B');
    return JSON.parse(json);
}
```

Per-field substitution is cleaner when you need different mappings in different places (e.g. rewrite display names but leave SQL identifiers alone) - walk the tile array and rewrite `config.title`, `config.description`, and any `config.dataSourceConfig.sql` etc. by hand.

Two substitutions that almost always need attention:

- **Scope `resolvedIds`** - these are concrete entity node IDs from the source's data graph. If the clone is for a different customer / account, the source's IDs won't resolve in the target context. Either drop `resolvedIds` and let `resolvedTypes` / `resolvedSourceTypes` do the work, or call `scope_resolve` with the new criteria and substitute the result.
- **`pluginConfigId` / `activePluginConfigIds`** - if the new workspace should pull from a different data source (different AWS account, different Datadog org, …), look up the target's data source ID via `data_source_list` and remap. Leaving the source's `pluginConfigId` in place is the right answer if you genuinely want both workspaces to share data.

## Common mistakes

- **Forgetting to filter `dashboard_list` by `workspaceId`** - `dashboard_list` returns every dashboard in the tenant; running through the unfiltered result clones the whole tenant into the new workspace.
- **Trying to clone data sources.** They're tenant-level - the cloned dashboards will reference the same `config-…` IDs and that's normally what you want. Don't `data_source_create` unless the clone genuinely needs a _new_ connection (e.g. against a different Jira org). Three reasons cloning a data source is usually wrong even when the user asks: (a) two `config-…` instances pointing at the same upstream just doubles API traffic and rate-limit pressure on the source system; (b) credentials are encrypted tenant-side, so a "clone" can't copy the connection - it requires re-entering auth; (c) "doesn't share anything" is a higher bar than it sounds - plugin definitions, KPI categories, and the graph indexer are tenant-wide, so true isolation isn't possible within one tenant. Push back on the framing as well as the action.
- **Forgetting to remap `resolvedIds`** when the clone targets a different customer / account - dashboards will load with empty data because the entity IDs don't exist in the target's scope.
- **Running every `dashboard_create` in parallel** - race conditions with the graph indexer and rate-limit hits. Keep the per-dashboard loop sequential or capped at a small concurrency.
- **Naively re-using the same KPI category for every clone with no review.** KPI types are tenant-level - that's fine for a same-customer staging clone, but a tweaked clone may need a category whose aggregation rules match the new shape. See the `kpis` skill before adding new KPI types.
- **Skipping the "is the new name unique" check.** `workspace_create` doesn't enforce uniqueness; two workspaces called "Customer B" are a real possibility unless you check `workspace_list` first.

## When to skip this skill

- The user just wants a single dashboard duplicated - use `dashboard_clone` directly (same workspace or a different one). See the `dashboards` skill.
- The user wants a fresh empty workspace - `workspace_create` from the `workspaces` skill, no source to mirror.
- The user wants to move dashboards between existing workspaces, not duplicate them - that's a `dashboard_update` setting the new `workspaceId` (see the `dashboards` skill).
- The user wants to clone a data source - see the `integrations` skill (note that you usually don't need to, since data sources are tenant-level).
