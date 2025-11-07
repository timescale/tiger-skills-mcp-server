# Tiger Skills MCP Server

Emulate Claude Skills with any LLM via a [Model Context Protocol](https://modelcontextprotocol.io/introduction) (MCP) server.

## Development

Cloning and running the server locally.

```bash
git clone git@github.com:timescale/tiger-skills-mcp-server.git
```

### Building

Run `npm i` to install dependencies and build the project. Use `npm run watch` to rebuild on changes.

You will need a GitHub token with the correct scopes. Here is a direct link to [create such a new token](https://github.com/settings/tokens/new?scopes=repo,read:org,read:user,user:email&description=tiger-skills-mcp-server).

Create a `.env` file based on the `.env.sample` file.

```bash
cp .env.sample .env
```

Then update the `GITHUB_TOKEN` value in `.env`.

### Testing

The MCP Inspector is a very handy to exercise the MCP server from a web-based UI.

```bash
npx @modelcontextprotocol/inspector
```

| Field          | Value           |
| -------------- | --------------- |
| Transport Type | `STDIO`         |
| Command        | `node`          |
| Arguments      | `dist/index.js` |

#### Testing in Claude Desktop

Create/edit the file `~/Library/Application Support/Claude/claude_desktop_config.json` to add an entry like the following, making sure to use the absolute path to your local `tiger-skills-mcp-server` project, and use a valid GitHub token.

```json
{
  "mcpServers": {
    "tiger-skills": {
      "command": "node",
      "args": ["/absolute/path/to/tiger-skills-mcp-server/dist/index.js", "stdio"],
      "env": {
        "GITHUB_TOKEN": "ghp_whatever",
        "GITHUB_ORG": "timescale"
      }
    }
  }
}
```
