import { ApiFactory } from '@tigerdata/mcp-boilerplate';
import { z } from 'zod';
import path from 'path';
import { ServerContext } from '../types.js';
import { loadSkills, resolveSkill } from '../util/skills.js';
import { readdir, readFile, stat } from 'fs/promises';
import { encode } from '@toon-format/toon';

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
      const skills = await loadSkills(octokit);
      return {
        content: `<available_skills>
${encode(
  [...skills.values()].map((s) => ({
    name: s.name,
    description: s.description,
  })),
  { delimiter: '\t' },
)}
</available_skills>`,
      };
    }
    const skill = await resolveSkill(octokit, skill_name);
    if (!skill) {
      throw new Error(`Skill not found: ${skill_name}`);
    }

    switch (skill.type) {
      case 'local': {
        const target = path.join(skill.path, passedPath || 'SKILL.md');
        const s = await stat(target);
        if (s.isDirectory()) {
          const entries = await readdir(target, {
            withFileTypes: true,
          });
          const listing = entries
            .map((entry) => {
              return `${entry.isDirectory() ? '📁' : '📄'} ${entry.name}`;
            })
            .join('\n');
          return {
            content: listing,
          };
        } else if (s.isFile()) {
          const fileContent = await readFile(target, 'utf-8');
          return {
            content: fileContent,
          };
        } else {
          throw new Error(`Unsupported file type at path: ${target}`);
        }
      }
      case 'github': {
        const [owner, repo] = skill.repo.split('/');
        const target = `${skill.path || '.'}/${passedPath || 'SKILL.md'}`
          .replace(/\/+/g, '/')
          .replace(/(^\.?\/+)|(^\.$)|(\/\.$)/g, '');
        const response = await octokit.repos.getContent({
          owner,
          repo,
          path: target,
        });
        if (Array.isArray(response.data)) {
          // Directory listing
          const listing = response.data
            .map((entry) => {
              return `${entry.type === 'dir' ? '📁' : '📄'} ${entry.name}`;
            })
            .join('\n');
          return {
            content: `Directory listing for ${skill_name}/${passedPath}:\n${listing}`,
          };
        }
        if (response.data.type !== 'file') {
          throw new Error(`Unsupported content type: ${response.data.type}`);
        }
        return {
          content: Buffer.from(response.data.content, 'base64').toString(
            'utf-8',
          ),
        };
      }
      default: {
        // @ts-expect-error exhaustive check
        throw new Error(`Unhandled skill type: ${skill.type}`);
      }
    }
  },
});
