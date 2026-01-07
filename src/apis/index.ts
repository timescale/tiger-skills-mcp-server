import { createViewSkillToolFactory } from '@tigerdata/mcp-boilerplate/skills';
import { subagent } from './subagent.js';

export const viewFactory = createViewSkillToolFactory({
  appendSkillsListToDescription: true,
});

export const apiFactories = [viewFactory, subagent] as const;
