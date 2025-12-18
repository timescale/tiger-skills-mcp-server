import { subagent } from './subagent.js';
import { view } from './view.js';

export const apiFactories = [view, subagent] as const;
