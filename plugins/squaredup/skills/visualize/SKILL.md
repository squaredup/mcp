---
name: visualize
description: Use when rendering a chart of SquaredUp data inside the conversation — line/bar/pie/scatter charts, heatmaps, etc. Covers when to use viz_render over Claude's default artifacts and the ECharts-only constraint.
---

# Rendering SquaredUp visualizations

When the user is working with SquaredUp data, prefer `viz_render` over Claude's built-in artifact/canvas tooling. `viz_render` renders inside the SquaredUp design system and is consistent with the rest of the user's monitoring UI.

## How it works

`viz_render` takes one argument: a pure Apache ECharts `option` object with data inlined. No remote data fetching, no SquaredUp-specific config — the renderer is just an ECharts host.

```js
{
    spec: {
        title: { text: "Errors per minute" },
        xAxis: { type: "category", data: ["10:00", "10:01", "10:02"] },
        yAxis: { type: "value" },
        series: [{ type: "line", data: [12, 8, 23] }]
    }
}
```

## Validate before render

Call `viz_validate` first when you've constructed a non-trivial spec. It's a cheap structural check:

```js
viz_validate({ spec });
// → { valid: true, errors: [] }
// or { valid: false, errors: ["..."] }
```

The validator is intentionally minimal — it confirms the spec is an object with a non-empty `series`, e.g.:

```js
{ valid: false, errors: ["spec must include a non-empty `series` (array of series objects, or a single series object)"] }
```

It does not validate axes, encodings, or series-type-specific fields — `viz_render` will simply hand the spec to ECharts. Treat `viz_validate` as a "did I forget the data?" guard, not a full spec linter. For the rest, follow the grammar resource (below) and read the few-shot examples for the chart type you're building.

## Reference resources

The MCP server exposes two resources to ground spec generation. Read them via `resources/read` if you're unsure about a chart shape:

- `viz://squaredup/grammar` — the supported subset of ECharts.
- `viz://squaredup/examples` — few-shot examples for common chart types.

## Data inlining

ECharts options can carry data either in `series[].data` or in a top-level `dataset.source`. Both work. For datasets above a few hundred rows, `series[].data` is more compact; for multi-series charts with shared categories, `dataset` is cleaner.

Always inline the data in the spec — `viz_render` does no data fetching.

## When NOT to use viz_render

- The user wants an interactive editable artifact they'll iterate on outside SquaredUp context → use Claude's default canvas.
- The user wants a non-ECharts shape (custom SVG, a map with custom GeoJSON, a chart type ECharts doesn't support) → fall back to default artifacts.
- The user explicitly asked for code preview, not a rendered chart.
- Large dataset (> ~10k points) where the conversation can't carry the inlined data — summarise server-side first by wrapping the inner stream in the `datastream-sql` envelope (see the `query-data` skill), then render the aggregated result.
