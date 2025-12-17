import { throttling } from '@octokit/plugin-throttling';
import { Octokit } from '@octokit/rest';
import { log } from '@tigerdata/mcp-boilerplate';
import type { ServerContext } from './types.js';

export const serverInfo = {
  name: 'tiger-skills',
  version: '1.0.0',
} as const;

const MAX_SECONDARY_RETRY_TIMEOUT_IN_SECONDS = process.env
  .MAX_SECONDARY_RETRY_TIMEOUT_IN_SECONDS
  ? parseInt(process.env.MAX_SECONDARY_RETRY_TIMEOUT_IN_SECONDS, 10)
  : 5;

const ThrottledOktokit = Octokit.plugin(throttling);
const NUMBER_OF_RETRIES = process.env.GITHUB_REQUEST_RETRIES
  ? parseInt(process.env.GITHUB_REQUEST_RETRIES, 10)
  : 2;

const octokit = new ThrottledOktokit({
  auth: process.env.GITHUB_TOKEN,
  throttle: {
    onRateLimit: (
      retryAfterSeconds,
      options,
      _,
      retryCount,
    ): undefined | true => {
      log.warn(
        `Request quota exhausted for request ${options.method} ${options.url} (retryCount=${retryCount}), waiting ${retryAfterSeconds} seconds`,
      );

      if (options.request.retryCount <= NUMBER_OF_RETRIES) {
        log.info(`Retrying after ${retryAfterSeconds} seconds`);
        return true;
      }

      log.warn(`Request failed after ${NUMBER_OF_RETRIES} retries`);
    },
    onSecondaryRateLimit: (retryAfterSeconds, { url, method }): boolean => {
      const shouldRetry =
        retryAfterSeconds <= MAX_SECONDARY_RETRY_TIMEOUT_IN_SECONDS;

      log.warn('SecondaryRateLimit occurred for request', {
        method,
        url,
        retryAfterSeconds,
        shouldRetry,
      });

      return shouldRetry;
    },
  },
});

export const context: ServerContext = { octokit };
