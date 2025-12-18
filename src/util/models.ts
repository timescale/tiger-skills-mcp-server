import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import z from 'zod';

export const zModelProvider = z.enum(['openai', 'anthropic']);

export const parseModel = (providerAndModel: string): LanguageModel => {
  const [providerRaw, model] = providerAndModel.split('/');
  if (!model) {
    throw new Error(`Invalid provider/model: ${providerAndModel}`);
  }
  const provider = zModelProvider.parse(providerRaw);
  switch (provider) {
    case 'openai':
      return openai(model);
    case 'anthropic':
      return anthropic(model);
    default:
      // @ts-expect-error exhaustive check
      throw new Error(`Unknown provider: ${provider.toString()}`);
  }
};
