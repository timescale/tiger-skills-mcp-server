#!/usr/bin/env node
import { httpServerFactory } from '@tigerdata/mcp-boilerplate';
import { apiFactories } from './apis/index.js';
import { context, serverInfo } from './serverInfo.js';
import { listSkills, viewSkillContent } from './util/skills.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';

export const { registerCleanupFn } = httpServerFactory({
  ...serverInfo,
  context,
  apiFactories,
  stateful: false,
  additionalSetup: async ({ context, server }) => {
    server.registerResource(
      'skills',
      'root://skills',
      {
        title: 'Skills',
        description: 'The list of available skills.',
      },
      async (uri) => ({
        contents: [
          {
            uri: uri.href,
            text: await listSkills(context.octokit),
          },
        ],
      }),
    );

    server.registerResource(
      'skill',
      new ResourceTemplate('skills://{skill_name}{?path}', {
        list: undefined,
      }),
      {
        title: 'Skill',
        description:
          'View the content of a specific skill file or directory. Pass "." as the `path` to list the root content of a skill. The main skill document is located at the `path` "SKILL.md".',
      },
      async (uri, { skill_name, path }) => ({
        contents: [
          {
            uri: uri.href,
            text: await viewSkillContent(
              context.octokit,
              skill_name as string,
              path as string,
            ),
          },
        ],
      }),
    );
  },
});
