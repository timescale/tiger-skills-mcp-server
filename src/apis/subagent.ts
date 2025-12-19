import type { ApiFactory, InferSchema } from '@tigerdata/mcp-boilerplate';
import { z } from 'zod';
import type { ServerContext } from '../types.js';
import {
  executeSubagent,
  subagentInputSchema,
  subagentToolDescription,
  subagentToolTitle,
} from '../util/subagent.js';

const outputSchema = {
  response: z.string().describe('The result of the subagent task.'),
} as const;

type OutputSchema = InferSchema<typeof outputSchema>;

export const subagent: ApiFactory<
  ServerContext,
  typeof subagentInputSchema,
  typeof outputSchema
> = (ctx, flags) => ({
  name: 'subagent',
  disabled: ['true', '1'].includes(process.env.SUBAGENT_DISABLED || ''),
  method: 'get',
  route: '/subagent',
  config: {
    title: subagentToolTitle,
    description: subagentToolDescription,
    inputSchema: subagentInputSchema,
    outputSchema,
  },
  fn: async ({ prompt, complexity }): Promise<OutputSchema> => ({
    response: await executeSubagent(prompt, complexity, ctx, flags),
  }),
});
