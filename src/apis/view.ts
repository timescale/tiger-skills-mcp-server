import type { ApiFactory, InferSchema } from '@tigerdata/mcp-boilerplate';
import { z } from 'zod';
import type { ServerContext } from '../types.js';
import {
  listSkills,
  parseSkillsFlags,
  skillsDescription,
  skillsInputSchema,
  viewSkillContent,
} from '../util/skills.js';

const outputSchema = {
  content: z.string().describe('The content of the file or directory listing.'),
} as const;

type OutputSchema = InferSchema<typeof outputSchema>;

export const view: ApiFactory<
  ServerContext,
  typeof skillsInputSchema,
  typeof outputSchema
> = ({ octokit }, { query }) => ({
  name: 'view',
  method: 'get',
  route: '/view',
  config: {
    title: 'View Skill',
    description: skillsDescription,
    inputSchema: skillsInputSchema,
    outputSchema,
  },
  fn: async ({ skill_name, path: passedPath }): Promise<OutputSchema> => {
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
