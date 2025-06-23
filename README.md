# MCP Servers Search

An MCP (Model Context Protocol) server that provides tools for querying and discovering available MCP servers from the official [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) repository.

**547 MCP servers as of June 2025.**

## Features

- **List Servers**: Browse all available MCP servers with filtering by category
- **Search**: Find servers by name, description, or author
- **Feature Search**: Discover servers that provide specific capabilities
- **Random Discovery**: Get random server suggestions for exploration
- **Caching**: Efficient caching to minimize GitHub API calls

## Installation

### Using npm
```bash
npm install -g @atonomus/mcp-servers-search
```

### From source
```bash
git clone https://github.com/atonomus/mcp-servers-search.git
cd mcp-servers-search
npm install
```

## Usage

### Standalone
```bash
# Run directly with npx
npx @atonomus/mcp-servers-search

# Or if installed globally
mcp-servers-search
```

### With Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "servers-search": {
      "command": "npx",
      "args": ["@atonomus/mcp-servers-search"]
    }
  }
}
```

## Available Tools

### 1. list_servers
List all available MCP servers with optional filtering.

**Parameters:**
- `category` (optional): Filter by category - "reference", "official", "community", or "all" (default)
- `search` (optional): Search servers by name or description
- `limit` (optional): Maximum number of results (default: 20)

**Example:**
```json
{
  "name": "list_servers",
  "arguments": {
    "category": "official",
    "search": "database",
    "limit": 10
  }
}
```

### 2. get_server_details
Get detailed information about a specific MCP server.

**Parameters:**
- `name` (required): The name of the MCP server

**Example:**
```json
{
  "name": "get_server_details",
  "arguments": {
    "name": "GitHub"
  }
}
```

### 3. search_servers_by_feature
Search for servers that provide specific features or capabilities.

**Parameters:**
- `feature` (required): The feature to search for (e.g., "database", "api", "blockchain")
- `limit` (optional): Maximum number of results (default: 10)

**Example:**
```json
{
  "name": "search_servers_by_feature",
  "arguments": {
    "feature": "blockchain",
    "limit": 5
  }
}
```

### 4. get_random_servers
Get a random selection of MCP servers for discovery.

**Parameters:**
- `count` (optional): Number of random servers (default: 5)
- `category` (optional): Filter by category (default: "all")

**Example:**
```json
{
  "name": "get_random_servers",
  "arguments": {
    "count": 3,
    "category": "community"
  }
}
```

### 5. refresh_server_list
Force refresh the cached list of MCP servers from GitHub.

**Example:**
```json
{
  "name": "refresh_server_list",
  "arguments": {}
}
```

## Development

### Setup
```bash
# Install dependencies
npm install

# Run normally
npm start

# Run tests
npm test
```

### Testing

The project includes a comprehensive Mocha test suite that tests the README parsing functionality. The tests cover:

- Standard format entries: `[Name](link) - description`
- Bold format entries: `**[Name](link)** - description`
- List format entries: `- [Name](link) - description`
- Author extraction: `(by AuthorName)`
- Category detection (reference, official, community)
- Description cleaning (removing embedded links)
- Special character handling (preserving backticks)

Run tests with:
```bash
npm test
```

## Examples

### Using with Claude Desktop

Once configured, you can ask Claude:

- "What MCP servers are available for database operations?"
- "Show me all official MCP servers"
- "Find MCP servers related to AI or machine learning"
- "Give me 5 random community servers to explore"
- "Tell me more about the GitHub MCP server"

### Programmatic Usage

```javascript
// Example of using the server programmatically
import { MCPToolsQueryServer } from '@atonomus/mcp-servers-search';

const server = new MCPToolsQueryServer();
await server.run();
```

## Caching

The server caches the list of available MCP servers for 1 hour to minimize API calls to GitHub. You can force a refresh using the `refresh_server_list` tool.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT - see LICENSE file for details

## Acknowledgments

- Built on the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- Data sourced from the official [MCP Servers Repository](https://github.com/modelcontextprotocol/servers)
