---
name: integrations
description: Use when the user wants to connect a new integration, configure a data source, inspect plugin or data source settings, or update integration credentials. Covers both plugins (integration *types*) and data sources (configured *instances* of plugins). Trigger phrases include "connect my AWS account", "add a Datadog integration", "what's the config for the X data source", "update the Dynatrace credentials", "what integrations can I connect", "list my configured integrations".
---

# Managing SquaredUp integrations

SquaredUp connects to external systems (AWS, Datadog, Jira, Dynatrace, etc.) through **plugins** and **data sources**. The distinction matters:

- A **plugin** is a *definition* — the connector code that knows how to talk to a particular external system. Plugins are catalog entries.
- A **data source** is an *instance* — a configured deployment of a plugin against a specific account, org, or environment. You can have multiple data sources of the same plugin (e.g. three different AWS accounts).

`plugin_list` returns the catalog of available connector types; `data_source_list` returns the integrations actually configured in the tenant. These are often confused — reach for the right one.

## Tool map

| Tool                  | What it does                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `plugin_list`         | List all plugin *types* available in the tenant — id, displayName, version, category.                       |
| `plugin_get`          | Inspect a plugin definition — capabilities, version, on-prem flag, keywords. Useful before configuring.     |
| `data_source_list`    | List configured integration *instances* — id, displayName, plugin, isDraft.                                 |
| `data_source_get`     | Full read of a configured data source including its connection config.                                      |
| `data_source_create`  | Create a new data source. Body requires `displayName`, `plugin` (plugin id), and `config` (plugin-specific).|
| `data_source_update`  | Update an existing data source. Full overwrite — read with `data_source_get` first.                         |

## Standard workflow: connect a new integration

When the user says *"connect a new AWS account"* or *"add a Datadog integration"*:

1. **`plugin_list`** — find the plugin definition for the integration type. Match by `displayName` or `category`.
2. **`plugin_get`** on that plugin — confirms capabilities and whether it's on-prem-only.
3. **(Recommended)** `data_source_list` and find an existing instance of the same plugin, then `data_source_get` it to see the working `config` shape. Copy that shape as a template — plugin-specific config fields aren't published as a centralised schema, so a working example is the most reliable source.
4. **`data_source_create({ body: { displayName, plugin, config } })`** — supply the user-specific credentials and endpoints.
5. Wait briefly for ingest to kick off (a few minutes for most plugins), then `data_source_get` on the new id to confirm `isDraft: false` and no errors.

```js
data_source_create({
    body: {
        displayName: "AWS Production",
        plugin: "plugin-aws",
        config: { /* plugin-specific connection settings */ }
    }
})
```

## Standard workflow: inspect an existing integration

`data_source_get(dataSourceId)` returns the full config including connection settings (values may be masked for secrets). Use this when the user asks *"what's configured for the X data source"*, or to use an existing instance as a template for a new one of the same plugin type.

## Standard workflow: update an integration

`data_source_update` is a **full overwrite**, not a patch. Same pattern as `workspace_update`:

1. `data_source_get(dataSourceId)` — read the current body.
2. Mutate the field the user asked for (e.g. rotating an API key, changing the `displayName`).
3. `data_source_update({ dataSourceId, body: <mutated body> })`.

## Common mistakes

- **Confusing `plugin_list` (catalog of *types*) with `data_source_list` (actually-configured *instances*)**. If the user says *"what's my Datadog setup?"*, they want `data_source_list` filtered to Datadog, not `plugin_list`.
- Calling `data_source_update` with a partial body — full overwrite. `data_source_get` first, mutate, write back.
- Trying to `data_source_create` without first looking at an existing instance of the same plugin to copy the `config` shape from — plugin-specific fields aren't centrally documented; a working example is the safest template.
- Assuming a new data source is queryable immediately after `data_source_create` — ingest is async. Wait briefly then `data_source_get` to confirm health.
- Treating `displayName` as unique — when multiple data sources of the same plugin exist (e.g. three Dynatrace instances), ask which one rather than guessing.

## When to skip this skill

- The user wants to list integrations alongside other tenant resources (workspaces, dashboards) → `explore-org`.
- The user wants to *query data* from an already-configured integration → `query-data`.
- The user wants to inspect what entities a data source has ingested → `query-graph` with a filter like `.has('sourceConfigId', '<dataSourceId>')`.
