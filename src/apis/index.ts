import { createViewSkillToolFactory } from '@tigerdata/mcp-boilerplate/skills';
import { subagent } from './subagent.js';

// The listing is not appended to the view tool's description: the agents
// that use this server render the list in their own prompts (Eon fetches it
// with `view` at skill_name "." on every run), and the server's own subagent
// gets it in its instructions. Appending it as well sent the list twice per
// model request.
export const viewFactory = createViewSkillToolFactory({
  appendSkillsListToDescription: false,
});

export const apiFactories = [viewFactory, subagent] as const;
