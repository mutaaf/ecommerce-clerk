/* A provider that does exactly what it is told.

   It exists so the loop, the tool layer and attribution can be tested
   without a network or a key, and so a demo can be run offline. Every
   test in platform/test that exercises a conversation runs on this, which
   means those tests are about the commerce platform rather than about a
   model's mood on the day. */

import type { ModelProvider, CompletionRequest, CompletionResult, ToolCall } from './provider.ts';

export function say(text: string): CompletionResult {
  return { text, toolCalls: [], stop: 'end' };
}

export function callTools(text: string, ...calls: readonly { name: string; input: Record<string, unknown> }[]): CompletionResult {
  return {
    text,
    toolCalls: calls.map((c, i): ToolCall => ({ id: `call_${i + 1}`, name: c.name, input: c.input })),
    stop: 'tools'
  };
}

export interface ScriptedProvider extends ModelProvider {
  /* What the loop actually asked for, so a test can assert the tool
     definitions and the transcript it was given. */
  readonly seen: readonly CompletionRequest[];
}

export function scriptedProvider(steps: readonly CompletionResult[]): ScriptedProvider {
  const seen: CompletionRequest[] = [];
  let i = 0;
  return {
    name: 'scripted',
    seen,
    async complete(request) {
      seen.push(request);
      const step = steps[i++];
      if (!step) return say('I have run out of script.');
      return step;
    }
  };
}
