# SquaredUp (US)

Connect Antigravity to your [SquaredUp](https://squaredup.com) organization in the US region. Your agent can explore and read dashboards, query data streams and the knowledge graph, work with KPIs, and manage workspaces, integrations, alerting, notification channels, permissions, scheduled reports, and users.

If your organization is hosted in the EU region, install `squaredup-eu` instead.

## Before you start

- You need a SquaredUp subscription and a SquaredUp account in the US region.
- A SquaredUp admin must turn on MCP access for your organization.

## What's included

- **The SquaredUp MCP server** for the US region (`https://mcp.squaredup.com/mcp`). It signs in with your SquaredUp account in the browser, so there are no API keys to manage.
- **Built-in guidance** - the server's `get_skill` tool walks your agent through SquaredUp tasks such as reading dashboards, querying data, and building tiles. The plugin's `squaredup` skill tells your agent to use it.

## Sign in

The plugin installs enabled. The first time Antigravity connects to the server, it asks you to sign in. If it doesn't:

- **Antigravity App:** open **Customizations** > **Installed**, and under **MCP Servers** select **Authenticate** next to the SquaredUp server.
- **Antigravity CLI:** run `/plugin`, expand `squaredup-us` under **Installed**, and choose **Sign in**.

Sign in with your SquaredUp account and choose your organization if asked.

## Try it

- "List my SquaredUp workspaces and summarize what each one monitors"
- "Find a service in my SquaredUp knowledge graph and show what it depends on"
- "Build a SquaredUp dashboard that charts data from one of my integrations"

## Help

- [SquaredUp MCP documentation](https://docs.squaredup.com/ai-features/squaredup-mcp)
- [Contact SquaredUp support](https://docs.squaredup.com/submit-ticket)
