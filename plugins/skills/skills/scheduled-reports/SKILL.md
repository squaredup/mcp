---
name: scheduled-reports
description: Use when the user wants a dashboard emailed on a recurring schedule (digest / scheduled report), e.g. "email the ops dashboard every Monday at 9am", "send a weekly report to the Slack channel", "pause the scheduled report", "stop the daily digest". For health-triggered alerts use the alerting skill instead.
---

> **Region:** If more than one `squaredup-*` server is connected, ask the user which one they mean before running any tools, then use that same server for every SquaredUp tool call in the task.

# Scheduling dashboard reports

Email a dashboard snapshot to notification channels on a recurring schedule (a "scheduled report" / digest). This is the _time-based_ delivery path - for health-triggered alerts use the `alerting` skill instead.

## Prerequisites

1. A dashboard to send (`dashboard_list` → `dash-…`).
2. One or more notification channels to deliver to (`channel_list` → `channel-…`; create with `channel_create`, see the `notifications` skill).

## Tools

| Tool                      | Purpose                                             |
| ------------------------- | --------------------------------------------------- |
| `scheduled_report_list`   | List a workspace's scheduled reports.               |
| `scheduled_report_get`    | Read one report.                                    |
| `scheduled_report_create` | Schedule a new report.                              |
| `scheduled_report_update` | Pause/resume, reschedule, or replace configuration. |
| `scheduled_report_delete` | Delete a report.                                    |

## Creating

```js
scheduled_report_create({
    workspaceId: 'space-...',
    dashboardId: 'dash-...',
    channels: ['channel-...'],
    title: 'Weekly Ops Summary',
    message: 'Last week at a glance.',
    schedule: {
        freq: 'WEEKLY',
        byDay: ['MO'],
        start: { year: 2026, month: 6, day: 15, hour: 9, minute: 0 },
        timezone: 'Europe/London',
    },
});
```

- `start` is the _first_ send, in local time of `timezone`, and **must be in the future** - a past start is rejected.
- `freq` is `DAILY` / `WEEKLY` / `MONTHLY` / `YEARLY`; `interval` repeats every N periods (e.g. `WEEKLY` + `interval: 2` = fortnightly); `byDay` picks weekdays for `WEEKLY`.
- `theme` defaults to `dark`; set `useSharedDashboardLinks: true` so recipients without a licence can open the dashboard.

## Pausing / resuming

```js
scheduled_report_update({ workspaceId, reportId: 'task-...', status: 'disabled' }); // pause
scheduled_report_update({ workspaceId, reportId: 'task-...', status: 'scheduled' }); // resume
```

## Common mistakes

- **No channel.** A report needs at least one channel; create one first.
- **Editing configuration partially.** `configuration` is replaced wholesale, not merged - read the current one with `scheduled_report_get` and pass the full object back. To only pause or reschedule, use `status` / `schedule`, which leave the configuration untouched.
- **Confusing with alerts.** Scheduled reports send on a clock; alerting rules send when a monitor changes health.
