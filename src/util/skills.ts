import { log } from '@tigerdata/mcp-boilerplate';
import {
  GitHubSkill,
  LocalSkill,
  Skill,
  SkillCfgMap,
  SkillMap,
  SkillMatter,
  zSkillCfgMap,
  zSkillMatter,
} from '../types.js';
import { readdir, readFile, stat } from 'fs/promises';
import matter from 'gray-matter';
import YAML from 'yaml';
import { Octokit } from '@octokit/rest';
import { encode } from '@toon-format/toon';
import path from 'path';

let skillCfgMap: SkillCfgMap | null = null;
export const getSkillConfig = async (): Promise<SkillCfgMap> => {
  if (skillCfgMap) return skillCfgMap;

  const data = await readFile(
    process.env.SKILLS_FILE || './skills.yaml',
    'utf-8',
  );
  skillCfgMap = zSkillCfgMap.parse(YAML.parse(data));

  return skillCfgMap;
};

const parseSkillFile = async (
  fileContent: string,
): Promise<{
  matter: SkillMatter;
  content: string;
}> => {
  const { data, content } = matter(fileContent);
  const skillMatter = zSkillMatter.parse(data);
  return {
    matter: skillMatter,
    content,
  };
};

// skill name/path -> content
let skillContentCache: Map<string, string> = new Map();

let skillMap: Promise<Map<string, Skill>> | null = null;
export const loadSkills = async (
  octokit: Octokit,
  force = false,
): Promise<Map<string, Skill>> => {
  if (skillMap && !force) return skillMap;
  skillMap = doLoadSkills(octokit);
  return skillMap;
};

const doLoadSkills = async (octokit: Octokit): Promise<Map<string, Skill>> => {
  const skillCfgs = await getSkillConfig();

  skillContentCache.clear();
  const skills = new Map<string, Skill>();

  const loadLocalPath = async (path: string) => {
    const skillPath = `${path}/SKILL.md`;
    try {
      const fileContent = await readFile(skillPath, 'utf-8');
      const {
        matter: { name, description },
        content,
      } = await parseSkillFile(fileContent);
      const existing = skills.get(name);
      if (existing) {
        log.warn(
          `Skill with name "${name}" already loaded from path "${existing.path}". Skipping duplicate at path "${path}".`,
          { existing, duplicate: { path, name, description } },
        );
        return;
      }
      skills.set(name, {
        type: 'local',
        path,
        name,
        description,
      } satisfies LocalSkill);
      skillContentCache.set(`${name}/SKILL.md`, content);
    } catch (err) {
      log.error(`Failed to load skill at path: ${skillPath}`, err as Error);
    }
  };

  const loadGitHubPath = async (owner: string, repo: string, path: string) => {
    const skillPath = `${path}/SKILL.md`;
    try {
      const skillFileResponse = await octokit.repos.getContent({
        owner,
        repo,
        path: skillPath,
      });
      if (
        Array.isArray(skillFileResponse.data) ||
        skillFileResponse.data.type !== 'file'
      ) {
        log.error(`Expected SKILL.md to be a file`, null, {
          owner,
          repo,
          path: skillPath,
        });
        return;
      }
      const fileContent = Buffer.from(
        skillFileResponse.data.content,
        'base64',
      ).toString('utf-8');
      const {
        matter: { name, description },
        content,
      } = await parseSkillFile(fileContent);
      const existing = skills.get(name);
      if (existing) {
        log.warn(
          `Skill with name "${name}" already loaded from path "${existing.path}". Skipping duplicate at GitHub path "${path}".`,
          { existing, duplicate: { path, name, description } },
        );
        return;
      }
      skills.set(name, {
        type: 'github',
        repo: `${owner}/${repo}`,
        path,
        name,
        description,
      } satisfies GitHubSkill);
      skillContentCache.set(`${name}/SKILL.md`, content);
    } catch (err) {
      log.error(
        `Failed to load skill at GitHub path: ${owner}/${repo}/${skillPath}`,
        err as Error,
      );
    }
  };

  for (const [name, cfg] of Object.entries(skillCfgs)) {
    switch (cfg.type) {
      case 'local': {
        await loadLocalPath(cfg.path);
        break;
      }
      case 'local_collection': {
        const dirEntries = await readdir(cfg.path, { withFileTypes: true });
        for (const entry of dirEntries) {
          if (!entry.isDirectory()) continue;
          await loadLocalPath(`${cfg.path}/${entry.name}`);
        }
        break;
      }
      case 'github': {
        const [owner, repo] = cfg.repo.split('/');
        await loadGitHubPath(owner, repo, cfg.path || '.');
        break;
      }
      case 'github_collection': {
        const [owner, repo] = cfg.repo.split('/');
        const rootPath = cfg.path
          ? cfg.path.replace(/(^\.?\/+)|(^\.$)|(\/\.$)/g, '')
          : '';
        const dirResponse = await octokit.repos.getContent({
          owner,
          repo,
          path: rootPath,
        });
        if (!Array.isArray(dirResponse.data)) {
          log.error(
            `Expected github_collection repo path to be a directory`,
            null,
            { name, owner, repo, path: cfg.path || '.' },
          );
          break;
        }
        for (const entry of dirResponse.data) {
          if (entry.type !== 'dir') {
            log.debug(`Skipping non-directory entry in github_collection`, {
              owner,
              repo,
              path: entry.path,
              type: entry.type,
            });
            continue;
          }
          await loadGitHubPath(owner, repo, entry.path);
        }
        break;
      }
      default: {
        // @ts-expect-error exhaustive check
        throw new Error(`Unhandled skill config type: ${cfg.type}`);
      }
    }
  }
  return skills;
};

export const resolveSkill = async (
  octokit: Octokit,
  skillName: string,
  force = false,
): Promise<Skill | null> => {
  const skills = await loadSkills(octokit, force);
  return skills.get(skillName) || null;
};

export const listSkills = async (
  octokit: Octokit,
  force = false,
): Promise<string> => {
  const skills = await loadSkills(octokit, force);
  return `<available_skills>
${encode(
  [...skills.values()].map((s) => ({
    name: s.name,
    description: s.description,
  })),
  { delimiter: '\t' },
)}
</available_skills>`;
};

export const viewSkillContent = async (
  octokit: Octokit,
  name: string,
  passedPath?: string,
): Promise<string> => {
  const skill = await resolveSkill(octokit, name);
  if (!skill) {
    throw new Error(`Skill not found: ${name}`);
  }

  switch (skill.type) {
    case 'local': {
      const target = path.join(skill.path, passedPath || 'SKILL.md');
      const s = await stat(target);
      if (s.isDirectory()) {
        const entries = await readdir(target, {
          withFileTypes: true,
        });
        return entries
          .map((entry) => {
            return `${entry.isDirectory() ? '📁' : '📄'} ${entry.name}`;
          })
          .join('\n');
      } else if (s.isFile()) {
        return await readFile(target, 'utf-8');
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
        return `Directory listing for ${name}/${passedPath}:\n${listing}`;
      }
      if (response.data.type !== 'file') {
        throw new Error(`Unsupported content type: ${response.data.type}`);
      }
      return Buffer.from(response.data.content, 'base64').toString('utf-8');
    }
    default: {
      // @ts-expect-error exhaustive check
      throw new Error(`Unhandled skill type: ${skill.type}`);
    }
  }
};
