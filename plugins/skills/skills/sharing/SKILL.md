---
name: sharing
description: Use when the user wants to share a SquaredUp dashboard via a public link, restrict that share to specific people, or stop sharing. Trigger phrases include "share this dashboard with the customer", "make a public link for the demo dashboard", "stop sharing X", "require sign-in for the share", "who can view this share", "share the prod overview with ops@".
---

> **Region:** If more than one `squaredup-*` server is connected, ask the user which one they mean before running any tools, then use that same server for every SquaredUp tool call in the task.

# Sharing SquaredUp dashboards

Open-access sharing makes a dashboard viewable via a public link, optionally gated by sign-in or restricted to specific people. The common use case is sending a customer-facing or stakeholder-facing dashboard to people who aren't full SquaredUp users.

A share is scoped to a single dashboard. Sharing a workspace means sharing each of its dashboards individually (or, more typically, picking the one "summary" dashboard).

## Tool map

| Tool                 | What it does                                                               |
| -------------------- | -------------------------------------------------------------------------- |
| `open_access_list`   | List all shares in the tenant - id, targetId, workspaceId, enabled.        |
| `open_access_get`    | Full read of one share including all `properties`.                         |
| `open_access_create` | Create a new share for a dashboard. Requires `targetId` and `workspaceId`. |
| `open_access_update` | Update a share's `properties`.                                             |
| `open_access_delete` | Delete a share. The public link stops working immediately.                 |

## Share properties

The `properties` block controls how the share behaves:

- `enabled` - defaults to true on create. Set false to temporarily disable without deleting.
- `requireAuthentication` - if true, viewers must sign in. The share acts as an invite rather than a public link.
- `restrictToUsers` - list of user IDs allowed to view (only meaningful when `requireAuthentication` is true).
- `allowExtendedSession` - extend the viewer session beyond the default timeout.
- `lockDashboardVariable` - prevents the viewer from changing dashboard variables.

## Standard workflow: share a dashboard publicly

```js
open_access_create({
    body: {
        targetId: 'dash-abc123',
        workspaceId: 'space-abc123',
        properties: { enabled: true },
    },
});
// → { id: 'openacc-...', targetId: 'dash-abc123', webUrl: 'https://<app>/openaccess/...', ... }
```

Surface the `webUrl` field to the user - it's the ready-to-share public link. Don't try to build the URL yourself from `id`; the viewer route uses a stripped form of the share ID and constructing it manually is a footgun.

## Standard workflow: share with sign-in required

```js
open_access_create({
    body: {
        targetId: 'dash-abc123',
        workspaceId: 'space-abc123',
        properties: {
            enabled: true,
            requireAuthentication: true,
            restrictToUsers: ['customer@acme.com'],
        },
    },
});
```

`restrictToUsers` only takes effect when `requireAuthentication` is true.

## Standard workflow: stop sharing

When the user says "stop sharing X":

1. `open_access_list` and filter to shares where `targetId === '<dashboard id>'` (a dashboard can have multiple shares).
2. `open_access_delete` each one - or `open_access_update` with `properties: { enabled: false }` if they may want to re-enable later.

## Common mistakes

- **Forgetting `workspaceId`.** Required even though it looks redundant once you have a dashboard ID - the share is scoped through the containing workspace.
- **Treating sharing as access control.** Sharing makes a dashboard reachable by a link; it doesn't grant SquaredUp tenant membership or workspace access. For per-user permission on workspaces and dashboards, see `permissions`.
- **Trying to set the `hidden` property.** Platform-only - the API rejects client attempts.
- **Auto-creating duplicate shares.** Multiple shares per dashboard are valid but rarely what the user wants. Check `open_access_list` first; if one exists, ask whether to update it or add another.

## When to skip this skill

- The user wants to grant a _SquaredUp user_ access to a workspace or dashboard - that's `permissions`.
- The user wants to deliver alerts to an email or Slack channel - that's `notifications`.
- The user wants to share an entire workspace (not just one dashboard) - no workspace-level share exists; loop through `dashboard_list` filtered by `workspaceId` and share each.
