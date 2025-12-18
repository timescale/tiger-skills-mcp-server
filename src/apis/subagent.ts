import type { ApiFactory, InferSchema } from '@tigerdata/mcp-boilerplate';
import { z } from 'zod';
import { type ServerContext, zTaskComplexity } from '../types.js';
import { executeSubagent } from '../util/subagent.js';

const inputSchema = {
  prompt: z
    .string()
    .describe(
      'The prompt to give to the subagent. This should be a clear and concise description of the task to be completed. Include any necessary context or instructions to ensure the subagent can complete the task effectively.',
    ),
  complexity: zTaskComplexity,
} as const;

const outputSchema = {
  response: z.string().describe('The result of the subagent task.'),
} as const;

type OutputSchema = InferSchema<typeof outputSchema>;

export const subagent: ApiFactory<
  ServerContext,
  typeof inputSchema,
  typeof outputSchema
> = (ctx, flags) => ({
  name: 'subagent',
  disabled: process.env.SUBAGENT_DISABLED === 'true',
  method: 'get',
  route: '/subagent',
  config: {
    title: 'Execute subagent task',
    description: 'Invokes an LLM to agentically work on a task.',
    inputSchema,
    outputSchema,
  },
  fn: async ({ prompt, complexity }): Promise<OutputSchema> => ({
    response: await executeSubagent(prompt, complexity, ctx, flags),
  }),
});
