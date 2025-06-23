import { describe, it } from 'mocha';
import { strict as assert } from 'assert';
import { MCPToolsQueryServer } from '../index.js';

describe('MCP Tools Parser', () => {
  describe('parseReadme', () => {
    it('should parse standard format entries', () => {
      const content = `
Some header text
These servers aim to demonstrate MCP features
[Git](https://github.com/modelcontextprotocol/servers/blob/main/src/git) - Tools to read, search, and manipulate Git repositories
[GitHub](https://github.com/user/repo) - Repository management and GitHub API integration
      `;

      const result = MCPToolsQueryServer.parseReadme(content);

      assert.equal(result.length, 2);
      assert.deepEqual(result[0], {
        name: 'Git',
        description: 'Tools to read, search, and manipulate Git repositories',
        category: 'reference',
        link: 'https://github.com/modelcontextprotocol/servers/blob/main/src/git',
        github: 'https://github.com/modelcontextprotocol/servers/blob/main/src/git',
        author: undefined
      });
    });

    it('should parse bold format entries', () => {
      const content = `A growing set of community-developed servers
- **[OpenAI WebSearch MCP](https://github.com/ConechoAI/openai-websearch-mcp)** - This is a Python-based MCP server that provides OpenAI \`web_search\` build-in tool.`;

      const result = MCPToolsQueryServer.parseReadme(content);

      assert.equal(result.length, 1);
      assert.deepEqual(result[0], {
        name: 'OpenAI WebSearch MCP',
        description: 'This is a Python-based MCP server that provides OpenAI `web_search` build-in tool.',
        category: 'community',
        link: 'https://github.com/ConechoAI/openai-websearch-mcp',
        github: 'https://github.com/ConechoAI/openai-websearch-mcp',
        author: undefined
      });
    });

    it('should parse entries with authors', () => {
      const content = `
A growing set of community-developed servers
[BigQuery](https://github.com/LucasHild/mcp-server-bigquery) (by LucasHild) - This server enables LLMs to inspect database schemas
      `;

      const result = MCPToolsQueryServer.parseReadme(content);

      assert.equal(result.length, 1);
      assert.deepEqual(result[0], {
        name: 'BigQuery',
        description: 'This server enables LLMs to inspect database schemas',
        category: 'community',
        link: 'https://github.com/LucasHild/mcp-server-bigquery',
        github: 'https://github.com/LucasHild/mcp-server-bigquery',
        author: 'LucasHild'
      });
    });

    it('should handle different categories correctly', () => {
      const content = `
These servers aim to demonstrate MCP features
[Memory](https://github.com/mcp/memory) - Knowledge graph-based memory

Official integrations are maintained by companies
[Slack](https://github.com/slack/mcp) - Official Slack integration

A growing set of community-developed servers
[Custom](https://github.com/user/custom) - Community server
      `;

      const result = MCPToolsQueryServer.parseReadme(content);

      assert.equal(result.length, 3);
      assert.equal(result[0].category, 'reference');
      assert.equal(result[1].category, 'official');
      assert.equal(result[2].category, 'community');
    });

    it('should clean descriptions with embedded links', () => {
      const content = `
A growing set of community-developed servers
[Server](https://github.com/user/server) - Description with [embedded link](https://example.com) and more text
      `;

      const result = MCPToolsQueryServer.parseReadme(content);

      assert.equal(result[0].description, 'Description with embedded link and more text');
    });

    it('should handle non-GitHub URLs', () => {
      const content = `
Official integrations are maintained by companies
[API Server](https://api.example.com) - External API server
      `;

      const result = MCPToolsQueryServer.parseReadme(content);

      assert.equal(result[0].link, 'https://api.example.com');
      assert.equal(result[0].github, undefined);
    });

    it('should handle list format with dash prefix', () => {
      const content = `
A growing set of community-developed servers
- [List Server](https://github.com/user/list-server) - Server in list format
      `;

      const result = MCPToolsQueryServer.parseReadme(content);

      assert.equal(result.length, 1);
      assert.equal(result[0].name, 'List Server');
    });

    it('should preserve backticks in descriptions', () => {
      const content = `
A growing set of community-developed servers
- **[Code Server](https://github.com/user/code)** - Server with \`inline code\` and \`multiple\` backticks
      `;

      const result = MCPToolsQueryServer.parseReadme(content);

      assert.equal(result[0].description, 'Server with `inline code` and `multiple` backticks');
    });

    it('should ignore lines that dont match the pattern', () => {
      const content = `
A growing set of community-developed servers
This is just text
[[Not a valid entry]]
[Incomplete entry without dash
[Valid Entry](https://github.com/user/valid) - This should be parsed
      `;

      const result = MCPToolsQueryServer.parseReadme(content);

      assert.equal(result.length, 1);
      assert.equal(result[0].name, 'Valid Entry');
    });

    it('should handle complex real-world example', () => {
      const content = `
# MCP Servers

## Reference Implementations
These servers aim to demonstrate MCP features and the TypeScript and Python SDKs.

[AWS KB Retrieval](/modelcontextprotocol/servers/blob/main/src/aws-kb-retrieval) - Retrieval from AWS Knowledge Base using Bedrock Agent Runtime

## Official Integrations
Official integrations are maintained by companies building production ready MCP servers for their platforms.

[Slack](https://github.com/slack/slack-mcp) - Channel management and messaging capabilities

## Community Servers
A growing set of community-developed and maintained servers demonstrates various applications of MCP across different domains.

- **[OpenAI WebSearch MCP](https://github.com/ConechoAI/openai-websearch-mcp)** - This is a Python-based MCP server that provides OpenAI \`web_search\` build-in tool.
[Discord](https://github.com/user/discord-mcp) (by JohnDoe) - Discord integration with full API support
      `;

      const result = MCPToolsQueryServer.parseReadme(content);

      assert.equal(result.length, 4);

      // Check each parsed entry
      const awsServer = result.find(s => s.name === 'AWS KB Retrieval');
      assert.equal(awsServer.category, 'reference');
      assert.equal(awsServer.link, undefined); // Not a full URL

      const slackServer = result.find(s => s.name === 'Slack');
      assert.equal(slackServer.category, 'official');

      const openAIServer = result.find(s => s.name === 'OpenAI WebSearch MCP');
      assert.equal(openAIServer.category, 'community');
      assert.equal(openAIServer.description, 'This is a Python-based MCP server that provides OpenAI `web_search` build-in tool.');

      const discordServer = result.find(s => s.name === 'Discord');
      assert.equal(discordServer.author, 'JohnDoe');
    });
  });
});
