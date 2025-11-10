import { Octokit } from '@octokit/rest';
import { z } from 'zod';

export const zSkillType = z.enum([
  'local',
  'local_collection',
  'github',
  'github_collection',
]);

export type SkillType = z.infer<typeof zSkillType>;

export const zLocalSkillCfg = z.object({
  type: z.literal('local'),
  path: z.string(),
});
export type LocalSkillCfg = z.infer<typeof zLocalSkillCfg>;

export const zLocalCollectionSkillCfg = z.object({
  type: z.literal('local_collection'),
  path: z.string(),
});
export type LocalCollectionSkillCfg = z.infer<typeof zLocalCollectionSkillCfg>;

export const zGitHubSkillCfg = z.object({
  type: z.literal('github'),
  repo: z.string(),
  path: z.string().optional(),
});
export type GitHubSkillCfg = z.infer<typeof zGitHubSkillCfg>;

export const zGitHubCollectionSkillCfg = z.object({
  type: z.literal('github_collection'),
  repo: z.string(),
  path: z.string().optional(),
});
export type GitHubCollectionSkillCfg = z.infer<
  typeof zGitHubCollectionSkillCfg
>;

export const zSkillCfg = z.discriminatedUnion('type', [
  zLocalSkillCfg,
  zLocalCollectionSkillCfg,
  zGitHubSkillCfg,
  zGitHubCollectionSkillCfg,
]);
export type SkillCfg = z.infer<typeof zSkillCfg>;

export const zSkillCfgMap = z.record(zSkillCfg);
export type SkillCfgMap = z.infer<typeof zSkillCfgMap>;

export const zSkillMatter = z.object({
  name: z.string().trim().min(1),
  description: z.string(),
});
export type SkillMatter = z.infer<typeof zSkillMatter>;

export const zLocalSkill = zSkillMatter.extend(zLocalSkillCfg.shape);
export type LocalSkill = z.infer<typeof zLocalSkill>;

export const zGitHubSkill = zSkillMatter.extend(zGitHubSkillCfg.shape);
export type GitHubSkill = z.infer<typeof zGitHubSkill>;

export const zSkill = z.discriminatedUnion('type', [zLocalSkill, zGitHubSkill]);
export type Skill = z.infer<typeof zSkill>;

export const zSkillMap = z.record(zSkill);
export type SkillMap = z.infer<typeof zSkillMap>;

export interface ServerContext extends Record<string, unknown> {
  octokit: Octokit;
  org: string;
}
