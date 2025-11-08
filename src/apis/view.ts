import { ApiFactory } from '@tigerdata/mcp-boilerplate';
import { z } from 'zod';
import { ServerContext } from '../types.js';
import { listSkills, viewSkillContent } from '../util/skills.js';

const inputSchema = {
  skill_name: z
    .string()
    .describe(
      'The name of the skill to browse. Pass "." to list all available skills.',
    ),
  path: z
    .string()
    .describe(
      'The path within the skill to view. If empty, will view the SKILL.md file. Pass "." to view the root directory.',
    ),
} as const;

const outputSchema = {
  content: z
    .string()
    .describe(
      'The content of the file or directory listing at the specified path.',
    ),
} as const;

export const view: ApiFactory<
  ServerContext,
  typeof inputSchema,
  typeof outputSchema
> = ({ octokit, org }) => ({
  name: 'view',
  method: 'get',
  route: '/view',
  config: {
    title: 'View Skill',
    description: `
Browse the content of a skill file or directory.

Begin by reading the SKILL.md file at the root of the skill repository to understand its purpose and usage.
Each markdown document may use relative links to reference other files within the skill directory.
Follow these links to explore additional documentation, code samples, or resources provided by the skill author.
If you need to explore other files or directories within the skill, specify the desired path using the \`path\` parameter.
`.trim(),
    inputSchema,
    outputSchema,
  },
  fn: async ({ skill_name, path: passedPath }) => {
    if (!skill_name || skill_name === '.') {
      return {
        content: await listSkills(octokit),
      };
    }
    return {
      content: await viewSkillContent(octokit, skill_name, passedPath),
    };
  },
});
