---
name: squaredup
description: Work with SquaredUp dashboards, tiles, data streams, the knowledge graph, KPIs, workspaces, integrations, alerting, sharing, scheduled reports, and users through the SquaredUp MCP server. Use for any SquaredUp task.
---

# SquaredUp

The SquaredUp MCP server serves its own skills, which give the steps and the rules for tasks that take more than one tool call.

1. Before your first SquaredUp task, call `get_skill` with no arguments to list the skills.
2. Read the skill that covers the task by calling `get_skill` with its name in `names`.
3. When a tool description tells you to read a skill, read it before you call the tool.

There is one SquaredUp MCP server for each region. If both the `squaredup-us` and `squaredup-eu` plugins are installed, ask the user which one to use, and use only that server for the task.
