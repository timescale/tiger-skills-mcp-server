import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceFactory } from '../../../mcp-boilerplate-node/dist/types.js';
import { ServerContext } from '../types.js';
import {
  loadSkills,
  parseSkillsFlags,
  skillsDescription,
  skillVisible,
  viewSkillContent,
} from '../util/skills.js';

export const skills: ResourceFactory<ServerContext> = (
  { octokit },
  { query },
) => {
  const flags = parseSkillsFlags(query);
  return {
    type: 'templated',
    name: 'skills',
    config: {
      title: 'Skills',
      description: skillsDescription,
    },
    uriTemplate: 'skills://{name}{?path}',
    list: async () => {
      const skills = await loadSkills(octokit);
      return {
        resources: Array.from(skills.values())
          .filter((s) => skillVisible(s.name, flags))
          .map((skill) => ({
            uri: `skills://${skill.name}?path=SKILL.md`,
            name: skill.name,
            title: skill.name,
            description: skill.description,
            mimeType: 'text/markdown',
          })),
      };
    },
    read: async (uri, { name, path }) => {
      if (Array.isArray(name) || Array.isArray(path) || !name) {
        throw new Error('Invalid parameters');
      }
      return {
        contents: [
          {
            uri: uri.href,
            text: await viewSkillContent(octokit, flags, name, path),
          },
        ],
      };
    },
  };
};
