#!/usr/bin/env node
import { httpServerFactory } from '@tigerdata/mcp-boilerplate';
import { apiFactories } from './apis/index.js';
import { context, serverInfo } from './serverInfo.js';
import {
  loadSkills,
  skillsDescription,
  viewSkillContent,
} from './util/skills.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';

export const { registerCleanupFn } = httpServerFactory({
  ...serverInfo,
  context,
  apiFactories,
  stateful: false,
  additionalSetup: async ({ context: { octokit }, server }) => {
    server.registerResource(
      'skills',
      new ResourceTemplate('skills://{name}{?path}', {
        list: async () => {
          const skills = await loadSkills(octokit);
          return {
            resources: Array.from(skills.values()).map((skill) => ({
              uri: `skills://${skill.name}?path=SKILL.md`,
              name: skill.name,
              title: skill.name,
              description: skill.description,
              mimeType: 'text/markdown',
            })),
          };
        },
      }),
      {
        title: 'Skill',
        description: skillsDescription,
      },
      async (uri, { name, path }) => ({
        contents: [
          {
            uri: uri.href,
            text: await viewSkillContent(
              octokit,
              name as string,
              path as string,
            ),
          },
        ],
      }),
    );
  },
});
