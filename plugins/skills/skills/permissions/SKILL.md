---
name: permissions
description: Use when the user wants to manage who can access a SquaredUp workspace, dashboard, or other entity - granting, revoking, listing, or checking permissions. Trigger phrases include "who has access to the QA workspace", "give sue admin on the prod workspace", "revoke bob's access", "what can I do on this dashboard", "lock down the workspace to admins only".
---

> **Region:** If more than one `squaredup-*` server is connected, ask the user which one they mean before running any tools, then use that same server for every SquaredUp tool call in the task.

# Managing SquaredUp permissions

Access control in SquaredUp is per-entity: each workspace, dashboard, scope, or other ACL'd entity has its own access control list (ACL) of who can do what. An ACL is a list of access control entries (ACEs), each `{ subjectId, permission }`.

A subject is a **user's email address** or a **group** (`group-...` ID, from `group_list`). Users are keyed by email - there is no `user-...` subject (passing one is rejected). Granting a new email **invites them** (creates the user record and sends an invitation email), so mention that side effect when you grant by email. Permissions are:

- `RO` - read-only.
- `RW` - read-write.
- `AD` - admin.

This is distinct from `sharing`, which controls public-link access for people who aren't tenant users.

## Tool map

| Tool                   | What it does                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| `access_control_list`  | Read the full ACL for an entity - who has what.                                                  |
| `access_control_set`   | **Replace** the entire ACL with a new list. Destructive - read first, modify, write back.        |
| `access_control_check` | Return the effective permissions the current user has on an entity, including group inheritance. |
| `group_list`           | List the tenant's groups (incl. Everyone, Administrators) with their `group-…` IDs.              |

## The set-is-destructive model

`access_control_set` replaces the entire ACL. There is no per-entry add/remove tool - to grant or revoke a single ACE, you have to read the current ACL, modify the list, and write the full new list back. This intentionally matches the platform API and avoids the lost-update class of bugs a PATCH-style API would introduce.

Two backend rules to know before writing an ACL:

- **An ACL can never be emptied.** The backend requires at least one ACE, so once an entity has an explicit ACL there is no way back to the "no ACL" state - you can only replace the list, not delete it.
- **The first write is a one-way door.** While an entity has no ACL, anyone in the tenant may set one. Once an ACL exists, only subjects with `AD` _on that ACL_ (or tenant admins) may change it. So when creating the first ACL on an entity, **always include an `AD` entry** (the requesting user or an admin group) - an ACL like `[Everyone: RO]` alone means only tenant admins can ever modify or fix it.

## How dashboard access is actually evaluated

Dashboard API routes don't evaluate the dashboard's own ACL - they map the dashboard to its **workspace** and check permissions there (`accessControlDashboardMiddleware`). In practice:

- To change who can **view or edit a dashboard**, set the ACL on its `space-…` workspace, not on the `dash-…` id. An ACE added to a dashboard is recorded but doesn't change who can open it.
- A dashboard-level ACE still has one effect: it gates who may further modify _that dashboard's ACL_ (see the one-way-door rule above).

## Standard workflow: grant access

```js
const current = await access_control_list({ entityId: 'space-abc123' });
const aces = [
    ...current.map(({ subjectId, permissions }) => ({ subjectId, permission: permissions[0] })),
    { subjectId: 'sue@acme.com', permission: 'AD' },
];
await access_control_set({ entityId: 'space-abc123', aces });
```

Note the asymmetry: `access_control_list` returns `permissions: ['RO']` (an array of length 1); the `access_control_set` input takes `permission: 'RO'` (a single value). The MCP layer handles the wrapping.

## Standard workflow: grant a group (e.g. Everyone)

Group subjects need the group's `group-…` ID - resolve it with `group_list` (the built-in Everyone group has `name: 'everyone'`). Target the workspace - that's what dashboard access is evaluated against - and if the current ACL is empty, include an `AD` entry alongside the grant so the ACL stays editable:

```js
const everyoneId = (await group_list()).find((g) => g.name === 'everyone')?.id;
const current = await access_control_list({ entityId: 'space-abc123' });
const aces = [
    ...current.map(({ subjectId, permissions }) => ({ subjectId, permission: permissions[0] })),
    ...(current.length === 0 ? [{ subjectId: requestingUserEmail, permission: 'AD' }] : []),
    { subjectId: everyoneId, permission: 'RO' },
];
await access_control_set({ entityId: 'space-abc123', aces });
```

## Standard workflow: revoke access

Same shape, but filter the subject out:

```js
const current = await access_control_list({ entityId: 'space-abc123' });
const aces = current
    .filter((a) => a.subjectId !== 'sue@acme.com')
    .map(({ subjectId, permissions }) => ({ subjectId, permission: permissions[0] }));
await access_control_set({ entityId: 'space-abc123', aces });
```

## Standard workflow: "can the current user edit this?"

```js
const { permissions } = await access_control_check({ entityId: 'dash-abc123' });
// permissions: ['RW']  → yes
// permissions: ['RO']  → read-only
// permissions: []      → no access at all
```

`access_control_check` computes the effective permissions including group memberships - it's the right read for "what can this user do?". `access_control_list` returns the raw ACL only, which won't reveal access inherited through groups.

## Common mistakes

- **Calling `access_control_set` with only the new entry.** Wipes everyone else's access. Always read, modify, write the full list.
- **Setting an ACL on a `dash-…` id to control who can see it.** Dashboard access is evaluated against the workspace ACL - grant on the `space-…` id instead.
- **Writing a first ACL with no `AD` entry.** Locks all future ACL changes to tenant admins only, and there's no way to delete the ACL afterwards. Include the requesting user (or an admin group) with `AD`.
- **Trying to set tenant-level perms like `canCreateWorkspace`.** Only basic perms (`RO`/`RW`/`AD`) are settable here. Tenant perms are set by system defaults.
- **Using a `user-...` ID as a subject.** There is no `user-...` subject - grant the person by **email**, and resolve group ids via `group_list` rather than guessing.
- **Confusing this with `sharing`.** ACL controls signed-in user access. `sharing` controls public-link access. They're independent - a workspace can be both ACL'd and shared.
- **Forgetting groups.** A user may not appear in `access_control_list` directly but still have access via group membership. Use `access_control_check` to answer "what can this user do?", not the raw ACL.

## When to skip this skill

- The user wants a public link to a single dashboard - that's `sharing`.
- The user wants to know what entities they can see across the tenant - `access_control_check` works per-entity; no tenant-wide tool yet.
- The user wants to deliver an alert _to a user_ - alerts go to channels, not users directly. See `notifications`.
