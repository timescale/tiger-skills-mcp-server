import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';
import { log, type McpFeatureFlags } from '@tigerdata/mcp-boilerplate';
import { type LanguageModel, ToolLoopAgent, type ToolSet, tool } from 'ai';
import z from 'zod';
import { view } from '../apis/view';
import type { ServerContext, TaskComplexity } from '../types';
import { getMCPConfig } from './mcp';
import { parseModel } from './models';

const models: Record<TaskComplexity, LanguageModel> = {
  low: parseModel(process.env.LOW_TASK_MODEL || 'anthropic/claude-haiku-4-5'),
  medium: parseModel(
    process.env.MEDIUM_TASK_MODEL || 'anthropic/claude-sonnet-4-5',
  ),
  high: parseModel(process.env.HIGH_TASK_MODEL || 'anthropic/claude-opus-4-5'),
};

export const executeSubagent = async (
  prompt: string,
  complexity: TaskComplexity,
  ctx: ServerContext,
  flags: McpFeatureFlags,
): Promise<string> => {
  const cleanupFns: Array<() => Promise<void>> = [];
  const cleanup = async (): Promise<void> => {
    await Promise.allSettled(cleanupFns.map((fn) => fn()));
  };

  try {
    const skillsTool = view(ctx, flags);
    const tools: ToolSet = {
      skills_view: tool({
        description: skillsTool.config.description,
        inputSchema: z.object(skillsTool.config.inputSchema),
        title: skillsTool.config.title,
        execute: skillsTool.fn,
      }),
    };
    const mcpCfg = await getMCPConfig();
    for (const [mcpName, cfg] of Object.entries(mcpCfg)) {
      const mcp = await createMCPClient({ name: mcpName, transport: cfg });
      cleanupFns.push(() => mcp.close());
      const mcpTools = (await mcp.tools()) as ToolSet;
      for (const [toolName, tool] of Object.entries(mcpTools)) {
        const name = `mcp_${mcpName}_${toolName}`;
        if (tools[name]) {
          log.warn(`Duplicate tool name detected: ${name}`);
        }
        tools[name] = tool;
      }
    }

    const agent = new ToolLoopAgent({
      model: models[complexity],

      instructions: `
You are a subagent, assigned to complete a task. Use the tools and skills provided to you to complete the task as accurately and efficiently as possible.

If the task requires multiple steps, break it down into smaller subtasks and hand these off to a subagent. You will then act as an
orchestrator, synthesizing the results of the subagents' work to complete the high-level task.

For tasks that require consuming and summarizing large amounts of data, use tool parameters to limit the amount of data requested in a single call.
Break up the data on page/time boundaries, summarize each chunk via a subagent, and then combine the summaries into a single final summary.

Your responses should be clear, concise, and to the point. Avoid unnecessary preamble and other details, and focus on answering the task at hand.

The following skills are available, and can be read using the skills_view tool:
${(await skillsTool.fn({ skill_name: '.', path: '.' })).content}

Use the current time for all relative date/time calculations: ${new Date().toISOString()}
`.trim(),
      tools,
      experimental_telemetry: { isEnabled: true },
    });

    const result = await agent.generate({ prompt });

    return result.text;
  } finally {
    await cleanup();
  }
};
