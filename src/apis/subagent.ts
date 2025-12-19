import type { ApiFactory, InferSchema } from '@tigerdata/mcp-boilerplate';
import { z } from 'zod';
import type { ServerContext } from '../types.js';
import { executeSubagent, subagentInputSchema } from '../util/subagent.js';

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
  disabled: process.env.SUBAGENT_DISABLED === 'true',
  method: 'get',
  route: '/subagent',
  config: {
    title: 'Execute subagent task',
    description: 'Invoke an agent work on a task.',
    inputSchema: subagentInputSchema,
    outputSchema,
  },
  fn: async ({ prompt, complexity }): Promise<OutputSchema> => ({
    response: await executeSubagent(prompt, complexity, ctx, flags),
  }),
});
