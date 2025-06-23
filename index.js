import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

export class MCPToolsQueryServer {
  #server;
  #servers = [];
  #lastFetch = 0;
  #CACHE_DURATION = 3600000; // 1 hour cache

  constructor() {
    this.#server = new Server(
      {
        name: 'mcp-servers-search',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          prompts: {}
        },
      }
    );

    this.#setupHandlers();
  }

  #setupHandlers() {
    this.#server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_servers',
          description: 'List all available MCP servers with optional filtering',
          inputSchema: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                enum: ['reference', 'official', 'community', 'all'],
                description: 'Filter servers by category (default: all)',
                default: 'all'
              },
              search: {
                type: 'string',
                description: 'Search servers by name or description'
              },
              limit: {
                type: 'number',
                description: 'Limit the number of results (default: 20)',
                default: 20,
                minimum: 1,
                maximum: 100
              }
            }
          }
        },
        {
          name: 'get_server_details',
          description: 'Get detailed information about a specific MCP server',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'The name of the MCP server to get details for'
              }
            },
            required: ['name']
          }
        },
        {
          name: 'search_servers_by_feature',
          description: 'Search for MCP servers that provide specific features or capabilities',
          inputSchema: {
            type: 'object',
            properties: {
              feature: {
                type: 'string',
                description: 'The feature or capability to search for (e.g., "database", "api", "file", "blockchain")'
              },
              limit: {
                type: 'number',
                description: 'Limit the number of results (default: 10)',
                default: 10,
                minimum: 1,
                maximum: 50
              }
            },
            required: ['feature']
          }
        },
        {
          name: 'get_random_servers',
          description: 'Get a random selection of MCP servers for discovery',
          inputSchema: {
            type: 'object',
            properties: {
              count: {
                type: 'number',
                description: 'Number of random servers to return (default: 5)',
                default: 5,
                minimum: 1,
                maximum: 20
              },
              category: {
                type: 'string',
                enum: ['reference', 'official', 'community', 'all'],
                description: 'Filter random servers by category (default: all)',
                default: 'all'
              }
            }
          }
        },
        {
          name: 'refresh_server_list',
          description: 'Force refresh the cached list of MCP servers from GitHub',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ],
    }));

    this.#server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        // Ensure we have data
        if (this.#servers.length === 0 || Date.now() - this.#lastFetch > this.#CACHE_DURATION) {
          await this.#fetchServers();
        }

        const handlers = {
          'list_servers': () => this.#listServers(request.params.arguments),
          'get_server_details': () => this.#getServerDetails(request.params.arguments),
          'search_servers_by_feature': () => this.#searchServersByFeature(request.params.arguments),
          'get_random_servers': () => this.#getRandomServers(request.params.arguments),
          'refresh_server_list': () => this.#refreshServerList()
        };

        const handler = handlers[request.params.name];
        if (!handler) {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
        }

        return await handler();
      } catch (error) {
        if (error instanceof McpError) throw error;
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool: ${error?.message ?? 'Unknown error'}`
        );
      }
    });

    this.#server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: 'mcp-servers-search',
          description: `MCP Server Search is a tool to find and explore MCP servers.`,
          arguments: [
            {
              name: 'keywords',
              description: 'Keywords to search for MCP servers, e.g. "database", "api", "file", "blockchain"',
              required: true
            },
            {
              name: 'mcp_client',
              description: 'MCP client library, e.g. Claude Desktop',
            }
          ]
        }
      ]
    }));

    this.#server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      if (request.params.name === "mcp-servers-search") {
        const {
          keywords,
          mcp_client = 'Claude Desktop'
        } = request.params.arguments;
        return {
          description: "Example prompt",
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: `
              Search for MCP servers with "${keywords}" keywords.
              Once found a few options, offer to show how to install and configure a MCP server for "${mcp_client}" client.
              `.split('\n').map(line => line.trim()).filter(Boolean).join('\n')
            }
          }]
        };
      }

      throw new Error("Unknown prompt");
    })
  }

  async #fetchServers() {
    try {
      const response = await fetch('https://raw.githubusercontent.com/modelcontextprotocol/servers/main/README.md');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const content = await response.text();

      this.#servers = MCPToolsQueryServer.parseReadme(content);
      this.#lastFetch = Date.now();
      console.warn(`Fetched ${this.#servers.length} servers from README.md`);
    } catch (error) {
      throw new Error(`Failed to fetch server list: ${error?.message ?? 'Unknown error'}`);
    }
  }

  static parseReadme(content) {
    const servers = [];
    const lines = content.split('\n');

    let currentCategory = null;

    for (const line of lines) {
      // Detect category sections
      if (line.includes('These servers aim to demonstrate MCP features')) {
        currentCategory = 'reference';
      } else if (line.includes('Official integrations are maintained by companies')) {
        currentCategory = 'official';
      } else if (line.includes('A growing set of community-developed')) {
        currentCategory = 'community';
      }

      // Parse server entries
      if (currentCategory && (line.includes('[') && line.includes('](')) && !line.startsWith('[[')) {
        let name, link, description, author;

        // Try different patterns
        // Pattern 1: - **[Name](link)** - description
        let match = line.match(/^-?\s*\*\*\[([^\]]+)\]\(([^)]+)\)\*\*\s*-\s*(.+)/);

        // Pattern 2: [Name](link) (by Author) - description
        if (!match) {
          match = line.match(/^-?\s*\[([^\]]+)\]\(([^)]+)\)\s*\(by ([^)]+)\)\s*-\s*(.+)/);
          if (match) {
            [, name, link, author, description] = match;
          }
        }

        // Pattern 3: [Name](link) - description
        if (!match) {
          match = line.match(/^-?\s*\[([^\]]+)\]\(([^)]+)\)\s*-\s*(.+)/);
          if (match) {
            [, name, link, description] = match;
          }
        }

        // If pattern 1 matched, extract values
        if (match && !name) {
          [, name, link, description] = match;
        }

        if (match && name && link && description) {
          // Clean description
          const cleanDescription = description
            .replace(/\[[^\]]+\]\([^)]+\)/g, (match) => {
              const linkText = match.match(/\[([^\]]+)\]/);
              return linkText?.[1] ?? '';
            })
            .trim();

          servers.push({
            name,
            description: cleanDescription,
            category: currentCategory,
            link: link.startsWith('http') ? link : undefined,
            github: link.includes('github.com') ? link : undefined,
            author
          });
        }
      }
    }

    return servers;
  }

  async #listServers({ category = 'all', search, limit = 20 } = {}) {
    let filtered = this.#servers;

    // Filter by category
    if (category !== 'all') {
      filtered = filtered.filter(s => s.category === category);
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(searchLower) ||
        s.description.toLowerCase().includes(searchLower) ||
        s.author?.toLowerCase().includes(searchLower)
      );
    }

    // Apply limit
    const results = filtered.slice(0, limit);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            total: filtered.length,
            showing: results.length,
            servers: results
          }, null, 2)
        }
      ]
    };
  }

  async #getServerDetails({ name }) {
    const server = this.#servers.find(s =>
      s.name.toLowerCase() === name.toLowerCase()
    );

    if (!server) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Server "${name}" not found`
      );
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(server, null, 2)
        }
      ]
    };
  }

  async #searchServersByFeature({ feature, limit = 10 }) {
    const featureLower = feature.toLowerCase();
    const results = this.#servers
      .filter(s =>
        s.description.toLowerCase().includes(featureLower) ||
        s.name.toLowerCase().includes(featureLower)
      )
      .slice(0, limit);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            feature,
            found: results.length,
            servers: results
          }, null, 2)
        }
      ]
    };
  }

  async #getRandomServers({ count = 5, category = 'all' } = {}) {
    let pool = this.#servers;
    if (category !== 'all') {
      pool = pool.filter(s => s.category === category);
    }

    // Shuffle using Fisher-Yates algorithm
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const results = shuffled.slice(0, Math.min(count, shuffled.length));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            count: results.length,
            servers: results
          }, null, 2)
        }
      ]
    };
  }

  async #refreshServerList() {
    await this.#fetchServers();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Server list refreshed successfully',
            totalServers: this.#servers.length,
            lastFetch: new Date(this.#lastFetch).toISOString()
          }, null, 2)
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.#server.connect(transport);
    console.warn('MCP Tools Query Server running on stdio');
  }
}
