#!/usr/bin/env node
import { MCPToolsQueryServer } from './index.js'

// Self-executing async function for top-level await
(async () => {
  try {
    const server = new MCPToolsQueryServer();
    await server.run();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
