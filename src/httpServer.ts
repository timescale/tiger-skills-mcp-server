#!/usr/bin/env node
import { httpServerFactory } from '@tigerdata/mcp-boilerplate';
import { apiFactories } from './apis/index.js';
import { context, serverInfo } from './serverInfo.js';
import { resourceFactories } from './resources/index.js';

export const { registerCleanupFn } = httpServerFactory({
  ...serverInfo,
  context,
  apiFactories,
  resourceFactories,
  stateful: false,
});
