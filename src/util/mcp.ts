import { readFile } from 'node:fs/promises';
import {
  experimental_createMCPClient as createMCPClient,
  type experimental_MCPClient as MCPClient,
} from '@ai-sdk/mcp';
import { log } from '@tigerdata/mcp-boilerplate';
import YAML from 'yaml';
import { z } from 'zod';

export const zMCPConfig = z.object({
  type: z.literal('http'),
  url: z.string(),
  headers: z.record(z.string()).optional(),
});
export type MCPConfig = z.infer<typeof zMCPConfig>;

export const zMCPConfigMap = z.record(zMCPConfig);
export type MCPConfigMap = z.infer<typeof zMCPConfigMap>;

const TTL = process.env.MCP_TTL
  ? parseInt(process.env.MCP_TTL, 10)
  : 5 * 60 * 1000;

let lastFetch = 0;
let mcpCfgMap: MCPConfigMap | null = null;
export const getMCPConfig = async (): Promise<MCPConfigMap> => {
  if (mcpCfgMap && Date.now() - lastFetch < TTL) return mcpCfgMap;

  try {
    const data = await readFile(process.env.MCP_FILE || './mcp.yaml', 'utf-8');
    mcpCfgMap = zMCPConfigMap.parse(YAML.parse(data));
    lastFetch = Date.now();

    return mcpCfgMap;
  } catch (error) {
    log.error('Failed to read MCP config file', error as Error);
    return {};
  }
};

export const getMCPClient = async (name: string): Promise<MCPClient> => {
  const mcp = await getMCPConfig();
  const config = mcp[name];
  if (!config) throw new Error(`MCP client "${name}" not found in config`);

  return createMCPClient({ name, transport: config });
};
