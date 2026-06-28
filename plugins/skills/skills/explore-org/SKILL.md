---
name: explore-org
description: Use whenever the user asks what's in their SquaredUp tenant, what integrations are connected, what data is available, or what workspaces and dashboards exist - and at the start of any "show me…", "find…", or "build…" SquaredUp task that doesn't already name a specific dashboard, tile, or stream ID. SquaredUp tenants are heterogeneous, so always discover the tenant's shape before deeper queries; guessing IDs or assuming a stock layout fails.
---

> **Region:** If more than one `squaredup-*` server is connected, ask the user which one they mean before running any tools, then use that same server for every SquaredUp tool call in the task.

# Exploring a SquaredUp tenant

Goal: build a mental map of what's available before doing real work. SquaredUp tenants are heterogeneous - what's queryable depends entirely on which integrations have been configured and how the tenant has been organized.

## Order of discovery

1. **Workspaces** - `workspace_list`. The top-level grouping unit. A tenant typically has 1-N workspaces representing teams, products, environments, or business areas. The user's question almost always implicitly targets one workspace; match by name early.

2. **Data sources** - `data_source_list`. Configured plugin instances (e.g. one row per connected AWS account, Datadog org, GitHub org). Each row's `plugin` field points to the plugin definition. This is the answer to "what integrations are connected?".

3. **Plugins** - `plugin_list` only if you need to know what _types_ of integration could be configured. Plugins are definitions; data sources are instances of those definitions. Most tasks do not need this.

4. **What contributes to a workspace** - `workspace_list_source_types` for a specific workspace tells you which data source types (e.g. AWS, Datadog) feed entities into it. Useful to scope queries without enumerating every entity.

5. **Existing dashboards** - `dashboard_list`. Often the fastest path from a vague question to concrete IDs: if there's a dashboard called "Production Errors", the user almost certainly means that workspace + scope. See the `dashboards` skill for how to mine an existing dashboard.

## Common ambiguity to resolve early

- **Multiple data sources of the same type.** If there are 3 AWS data sources, "show me EC2 instances" is ambiguous. Either ask the user, or pass all of them as `activePluginConfigIds` to `data_stream_query` and let SquaredUp aggregate. (`data_stream_query` also needs a `workspaceId` - the sources must be linked to that workspace.)

- **Workspace vs cross-workspace queries.** Most user questions implicitly target one workspace. Match team/product names to a workspace before running graph queries - graph queries that span all workspaces can return huge result sets.

## When to skip this skill

If the user asks a very specific question with explicit IDs or names ("get tile `1` from dashboard `dash-yHLAPmsNyGkUPe8ZdDxE`", "query the EC2 inventory stream"), go straight to the relevant tool - don't enumerate the tenant first.
