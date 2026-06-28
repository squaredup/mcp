---
name: alerting
description: Use when the user wants alerts delivered when monitors go unhealthy - wiring monitors to notification channels. These are "Notification Rules" in the UI. Trigger phrases include "alert ops on Slack when the prod monitor fails", "notify me when this workspace goes unhealthy", "set up an alerting rule", "stop/pause alerts for this workspace", "who gets alerted when a dashboard breaks". Distinct from `notifications`, which sets up the channel (destination) itself.
---

> **Region:** If more than one `squaredup-*` server is connected, ask the user which one they mean before running any tools, then use that same server for every SquaredUp tool call in the task.

# Alerting rules (notification rules)

An **alerting rule** is the wiring that says: _"when these monitors go unhealthy, send an alert to these channels."_ In the SquaredUp UI these are called **Notification Rules** (Settings → Notifications).

Three distinct concepts are easy to confuse - keep them straight:

| Concept           | What it is                                                                    | Tools                             |
| ----------------- | ----------------------------------------------------------------------------- | --------------------------------- |
| **Monitor**       | The watcher on a tile that produces a health state (success/warning/error)    | _(configured on tiles)_           |
| **Channel**       | A notification _destination_ (Slack #ops, email to ops@…). Does nothing alone | `channel_*` (see `notifications`) |
| **Alerting rule** | The _subscription_: which monitors → which channels, plus how often           | `alerting_rule_*`                 |

A channel with no rule pointing at it is silent. A rule is what makes a monitor failure actually reach Slack/email.

## Tool map

| Tool                   | What it does                                                     |
| ---------------------- | ---------------------------------------------------------------- |
| `alerting_rule_list`   | List rules (pass `workspaceId` for one workspace, omit for all). |
| `alerting_rule_get`    | Read one rule by ID.                                             |
| `alerting_rule_create` | Add a rule to a workspace - wire monitors to channels.           |
| `alerting_rule_update` | Change a rule (channels, monitors, renotify) or pause/resume it. |
| `alerting_rule_delete` | Remove a rule.                                                   |

## Where rules live

Rules are stored **on the workspace** (`workspace.alertingRules`), not as standalone entities, and each has an `arule-…` ID. The underlying store is a full array, but the tools read-modify-write it for you: `alerting_rule_create/update/delete` each preserve the other rules on the workspace automatically. You do **not** need to read the list first; that's handled internally. (`workspace_get` also returns `alertingRules` if you want to inspect them.)

## Standard workflow: alert ops when a workspace goes unhealthy

1. Make sure a channel exists (`channel_list`; if not, `channel_create` - see `notifications`).
2. Create the rule:

```js
await alerting_rule_create({
    workspaceId: 'space-abc123',
    channels: ['channel-slackops'],
    // monitors omitted → defaults to workspace rollup health (one alert when the workspace as a whole breaks)
});
```

That's the least-noisy setup. To alert on **every** failing tile, pass `monitors`:

```js
await alerting_rule_create({
    workspaceId: 'space-abc123',
    channels: ['channel-slackops', 'channel-oncall-email'],
    monitors: { rollupHealth: false, dashboardRollupHealth: false, includeAllTiles: true },
    renotify: { enabled: true, states: ['error'], intervalMins: 60, backoff: 'exponential', maxCount: 5 },
});
```

`channels` takes bare `channel-…` IDs, or objects when you want a preview image: `{ id: 'channel-slackops', includePreviewImage: true, previewImageTheme: 'dark' }`. Editing a rule's channels with `alerting_rule_update` preserves the preview settings of channels already on the rule, so adding one channel won't wipe another's preview image.

## The monitor selector

`monitors` (a `WorkspaceMonitorSelector`) chooses what trips the rule:

- `rollupHealth` - fire when the **whole workspace's** rolled-up health changes. Lowest noise.
- `dashboardRollupHealth` - fire when **any dashboard's** rolled-up health changes.
- `includeAllTiles` - fire when **any individual tile** monitor changes. Highest fidelity, most noise.
- `dashboards` - optional per-dashboard / per-tile overrides, keyed by dashboard ID:

```js
monitors: {
    rollupHealth: false,
    dashboardRollupHealth: false,
    includeAllTiles: true,
    dashboards: {
        'dash-experiments': { includeAllTiles: false }, // mute a noisy dashboard
        'dash-prod': { tiles: { 'tile-uuid': { include: true } } } // or target specific tiles
    }
}
```

Tile-level config overrides dashboard-level, which overrides workspace-level.

## Pausing vs deleting

- **Pause** (`alerting_rule_update` with `paused: true`) - keeps the rule but stops alerts. Reversible. Prefer this for "mute for now".
- **Delete** (`alerting_rule_delete`) - removes it entirely.

## Acting on several rules at once

To pause, resume, or delete **every** rule on a workspace (e.g. "mute all alerts for this workspace"), pass `ruleIds` rather than calling the tool once per rule:

```js
const rules = await alerting_rule_list({ workspaceId: 'space-abc123' });
const ids = rules.map((r) => r.rule.id);
await alerting_rule_update({ workspaceId: 'space-abc123', ruleIds: ids, paused: true }); // mute all
await alerting_rule_delete({ workspaceId: 'space-abc123', ruleIds: ids }); // or remove all
```

`ruleIds` applies the change in a **single** read-modify-write, so it's both faster and free of the race you'd hit firing many single-rule calls in parallel.

## Renotify has no "forever"

`renotify.maxCount` caps how many reminders are sent (default 5), then it goes quiet even if still unhealthy. There is no infinite option - if the user wants "keep nagging until fixed", set a deliberately high `maxCount` and tell them it's a ceiling, not truly unlimited.

## Common mistakes

- **Creating a channel and assuming alerts now flow.** A channel is just a destination - you also need an alerting rule pointing monitors at it. This is the step that's easy to forget.
- **Expecting alerts with no monitors configured.** A rule fires on monitor health changes. If the targeted tiles have no monitor set up, nothing happens - monitors are configured on the tiles themselves (not yet via MCP; direct the user to the tile editor in the UI). When a rule targets specific tiles/dashboards, say plainly that it only fires once those tiles have monitors.
- **Overlapping rules cause duplicate alerts.** A workspace-wide `includeAllTiles` rule already covers every tile, so adding a dashboard- or tile-scoped rule on top means the same incident notifies twice (or thrice). Before adding a narrower rule, check existing rules with `alerting_rule_list` and flag the overlap.
- **Hunting for a named monitor/dashboard that may not exist.** If the user names a monitor ("the prod-health monitor") and a quick `dashboard_list` / `workspace_list` lookup doesn't find it, **ask which dashboard/tile they mean** rather than launching an exhaustive tenant-wide search.
- **Setting `includeAllTiles: true` on a large workspace without renotify/backoff thought** - can be very noisy. Default to `rollupHealth` unless the user wants per-tile alerts.

## When to use a different skill

- The user wants to add/inspect the **destination** itself (Slack/email/Teams) - that's `notifications` (`channel_*`).
- The user wants a **scheduled** dashboard report (e.g. "email this dashboard every Monday") - that's a scheduled task, not an alerting rule (not yet exposed via MCP).
- The user wants to set the health **threshold** on a tile (the monitor itself) - configured on the tile (not yet exposed via MCP).
