---
name: notifications
description: Use when the user wants to set up, list, update, or troubleshoot notification destinations (Slack, Email, Microsoft Teams, ServiceNow, webhooks, Zapier). Trigger phrases include "add a Slack channel", "set up email alerts to ops@", "why is the Teams channel failing", "list our notification channels", "change the webhook URL", "delete the Zapier integration".
---

> **Region:** If more than one `squaredup-*` server is connected, ask the user which one they mean before running any tools, then use that same server for every SquaredUp tool call in the task.

# Managing notification channels

Notification channels are the _destinations_ where SquaredUp delivers alerts - Slack, Email, Microsoft Teams, ServiceNow, generic webhooks, Zapier. Each channel is a configured endpoint plus its delivery credentials. A channel by itself doesn't deliver anything; it gets attached to monitors or rules which decide _when_ to fire.

This skill is for managing the channels themselves - adding, removing, updating, troubleshooting. Wiring a channel to a specific monitor is a separate concern - use the `alerting_rule_*` tools (see the `alerting` skill).

## Tool map

| Tool             | What it does                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| `channel_list`   | List all channels in the tenant - id, displayName, type, enabled, and a `failed` flag.         |
| `channel_get`    | Full read of one channel, including its `config` and `status`.                                 |
| `channel_create` | Create a new channel. Requires `displayName`, `channelType`, and a `config` matching the type. |
| `channel_update` | Update an existing channel. Partial body supported.                                            |
| `channel_delete` | Remove a channel. Any monitor rules pointing at it silently no-op until reconfigured.          |

## Channel types and config shape

`channelType` is one of (config field names match the backend validator exactly - don't paraphrase them):

- `SlackAPI` - bot-token Slack. Config: `{ token, channel }`.
- `SlackWebHook` - incoming-webhook Slack. Config: `{ url }` (the Slack webhook URL - _not_ `webhookUrl`). Optional `queryArgs`.
- `Teams` - Microsoft Teams webhook. Config: `{ url }`. Optional `queryArgs`.
- `Custom` - generic JSON webhook. Config: `{ url, bodyTemplate }`. Optional `queryArgs`. `bodyTemplate` is a templated JSON body - supports variables like `{{name}}`, `{{newState}}`, `{{link}}`.
- `ServiceNow` - incident creation. Config: `{ username, password, url }` (instance URL, e.g. `https://mycompany.service-now.com/`).
- `Email` - direct delivery. Config: `{ emailAddresses: string[] }` (_not_ `recipients`).
- `Zapier` - Zapier catch-hook. No config required.

The backend validates and returns a clear 400 if anything's missing - let the error propagate rather than guessing.

## Standard workflow: add a channel

```js
channel_create({
    body: {
        displayName: 'Prod alerts → #ops',
        channelType: 'SlackWebHook',
        config: { url: 'https://hooks.slack.com/services/...' },
    },
});
// → { id: 'channel-...', enabled: true, status: { failed: false, ... } }
```

`enabled` defaults to true. `status` is system-managed - don't set it on create.

## Standard workflow: rotate or change config

```js
channel_update({
    channelId: 'channel-abc123',
    body: { config: { url: 'https://hooks.slack.com/services/<new>' } },
});
```

Partial body is OK - fields you don't include are left alone. The tool auto-includes the existing channel type when only `config` is changing, so you don't need to fetch and re-send it.

## Standard workflow: diagnose a failing channel

If `channel_list` shows `failed: true`, `channel_get` returns `status` with `failed`, `failureDate`, and `failureReason`. Surface `failureReason` verbatim to the user - it's usually enough to point at the fix (expired webhook, revoked Slack token, ServiceNow credential change).

## Common mistakes

- **Setting `status` or `hidden`.** Both are platform-managed and aren't part of the channel tools' input - leave them out.
- **Setting up a channel and expecting alerts to start.** Channels are destinations only. A monitor needs an alerting rule pointing at the channel - create one with `alerting_rule_create` (see the `alerting` skill).
- **Guessing `config` fields.** Each type has a specific schema. If unsure of values, ask the user rather than improvising.
- **Confusing channels with users.** Channels deliver to a destination (a Slack channel, a shared inbox). They don't grant a _person_ access - that's `permissions`.

## When to skip this skill

- The user wants to share a _dashboard view_ via a public link - that's `sharing`.
- The user wants to manage who can see a workspace or dashboard - that's `permissions`.
- The user wants to know what triggers an alert (the rule, not the destination) - no MCP tool for that yet; clarify the limitation.
