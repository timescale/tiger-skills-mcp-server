import type { Octokit } from '@octokit/rest';
import { z } from 'zod';

export interface ServerContext extends Record<string, unknown> {
  octokit: Octokit;
}

export const zTaskComplexity = z.enum(['low', 'medium', 'high']);
export type TaskComplexity = z.infer<typeof zTaskComplexity>;
