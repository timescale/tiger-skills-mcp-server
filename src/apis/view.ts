import { ApiFactory } from '@tigerdata/mcp-boilerplate';
import { z } from 'zod';
import { ServerContext } from '../types.js';
import {
  listSkills,
  parseSkillsFlags,
  skillsDescription,
  viewSkillContent,
} from '../util/skills.js';

const inputSchema = {
  skill_name: z
    .string()
    .describe(
      'The name of the skill to browse, or `.` to list all available skills.',
    ),
  path: z.string().describe(
    `
A relative path to a file or directory within the skill to view.
If empty, will view the \`SKILL.md\` file by default.
Use \`.\` to list the root directory of the skill.
`.trim(),
  ),
} as const;

const outputSchema = {
  content: z.string().describe('The content of the file or directory listing.'),
} as const;

export const view: ApiFactory<
  ServerContext,
  typeof inputSchema,
  typeof outputSchema
> = ({ octokit, org }, { query }) => ({
  name: 'view',
  method: 'get',
  route: '/view',
  config: {
    title: 'View Skill',
    description: skillsDescription,
    inputSchema,
    outputSchema,
  },
  fn: async ({ skill_name, path: passedPath }) => {
    const flags = parseSkillsFlags(query);
    if (!skill_name || skill_name === '.') {
      return {
        content: await listSkills(octokit, flags),
      };
    }
    return {
      content: await viewSkillContent(octokit, flags, skill_name, passedPath),
    };
  },
});
