---
name: users
description: Use when the user wants to invite, list, or remove people on the SquaredUp tenant. Trigger phrases include "invite alice@acme.com", "add a user", "who has access to this account", "list our users", "remove bob@acme.com", "revoke someone's access".
---

> **Region:** If more than one `squaredup-*` server is connected, ask the user which one they mean before running any tools, then use that same server for every SquaredUp tool call in the task.

# Managing tenant users

Invite, list, and remove people on the current SquaredUp tenant. The tenant is fixed by your session - these tools always act on it.

## Tools

| Tool          | Purpose                                                            |
| ------------- | ------------------------------------------------------------------ |
| `user_list`   | List everyone with access to the tenant (email, name, last login). |
| `user_invite` | Invite someone by email - creates the user if new and emails them. |
| `user_remove` | Remove someone's access to the tenant by email.                    |

## Inviting

```js
user_invite({ email: 'alice@acme.com' });
```

- Idempotent - inviting someone who already has access is a no-op, not an error.
- Inviting only adds the person to the tenant; it grants no specific permission. To give them access to a workspace or dashboard, follow up with `access_control_set` (see the `permissions` skill) - or just pass their email straight to `access_control_set`, which invites them for you.
- Seed group membership on invite with `user_invite({ email, groupIds: ['group-...'] })`.

## Removing

```js
user_remove({ email: 'bob@acme.com' });
```

- Removes access to _this_ tenant only; it doesn't delete the person's platform account (they may belong to other tenants).
- You can't remove yourself, and you can't remove the last remaining admin - both return an error.

## Common mistakes

- **Inviting to grant dashboard access.** Inviting ≠ granting permission. Set permissions with `access_control_set`.
- **Guessing user IDs.** Users are addressed by email throughout, not by a `user-…` id.
