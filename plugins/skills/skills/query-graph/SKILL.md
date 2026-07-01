---
name: query-graph
description: Use when you need to traverse the SquaredUp entity graph with Gremlin - finding entities by type/source/property, walking relationships ("what is connected to X"), or discovering which entities to scope a data stream query to.
---

> **Region:** If more than one `squaredup-*` server is connected, ask the user which one they mean before running any tools, then use that same server for every SquaredUp tool call in the task.

# Querying the SquaredUp entity graph

The `graph_query` tool accepts Gremlin against the tenant's entity graph. Tenant scoping is automatic - never include tenant filters in the query.

## Schema essentials

- **Vertex label** is always `obj` (single label across the whole graph). Use `.has('type', ...)` to filter by entity kind, not `.hasLabel(...)`.
- **`type` property** carries the canonical entity type. Common values: `host`, `container`, `kpi`, `space` (workspaces are graph nodes too with type `space`).
- **`sourceType` property** is multi-valued (e.g. `['INFRASTRUCTURE_HOST_ENTITY', 'HOST']` or `'Microsoft.Windows.Computer'`). Gremlin's `has` matches any value in the array, so `.has('sourceType', 'AWS::EC2::Instance')` works whether the value is single- or multi-valued.
- **Edge labels**: `is` (membership/identity), `tags` (tagging), `monitors` (monitor → target).
- **Source props** present on most vertices: `sourceId`, `sourceName`, `sourceInstance`, `sourceAccount`, `sourceType`.

## Patterns

**Find all hosts:**

```gremlin
g.V().has('type', 'host').limit(50)
```

**Find entities of a specific source type:**

```gremlin
g.V().has('sourceType', 'AWS::EC2::Instance').limit(20)
```

**What is connected to a known entity:**

```gremlin
g.V().hasId('node-4tfDTNWMNFf9Hdygh53vwWB4pLY5iK6WYB-4cp3PAvZbuEoJr0V3iX7').both().dedup().limit(50)
```

**Find entities in a workspace:**

For the common case, prefer `scope_resolve` with `workspaceIds` - it's purpose-built and faster. Reach for Gremlin only when you need a non-membership traversal off the workspace node:

```gremlin
g.V().hasId('space-4cp3PAvZbuEoJr0V3iX7').both().dedup().limit(100)
```

Use `.hasId(...)` for vertex IDs, not `.has('id', ...)` - `id` is the Gremlin built-in identifier, not a regular property.

## Always limit

Tenants can have hundreds of thousands of nodes. Always finish with `.limit(N)`. Start with 10-50 while exploring; only widen if the user explicitly asks for "all".

## Bindings

For values that come from user input (names, IDs, types), use parameter bindings rather than string-concatenating into the query:

```js
{
    query: "g.V().has('type', t).limit(n)",
    bindings: { t: "host", n: 25 }
}
```

## Choosing graph_query vs other tools

- Need rows of metric/log/event data → `data_stream_query` (graph queries can't return stream data).
- Need to know which entities match a saved scope → `scope_resolve` (cheaper, purpose-built).
- Need an ad-hoc traversal or property filter → `graph_query`.
- Need "what's connected to my alert" → `graph_query` with `.both()` from the known node.

## Common mistakes

- Filtering on label - `.hasLabel('host')` silently returns nothing because every vertex shares the label `obj`. Use `.has('type', 'host')` instead.
- Forgetting `.limit(N)` - runs against the whole tenant graph; on a real tenant that can mean tens of thousands of rows back through the LLM context.
- `sourceType` case mismatch - values are case-sensitive (`AWS::EC2::Instance` is not `aws::ec2::instance`). When in doubt, fetch one example vertex first and read the exact value.
- Adding a tenant filter - tenant scoping is automatic. An explicit tenant clause is wrong, not redundant: it will narrow against an internal field you don't control and return nothing.
- String-concatenating user input into the query - use `bindings` (see above).
