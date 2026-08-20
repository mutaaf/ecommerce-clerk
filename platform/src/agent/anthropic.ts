/* The Anthropic provider.

   This is the only file in the platform that imports a model SDK. It maps
   our neutral shapes onto the Messages API and maps the answer back. It
   holds no commerce logic, decides nothing about attribution, and knows
   nothing about what the tools do. Swapping providers means writing one
   more file beside this one. */

import Anthropic from '@anthropic-ai/sdk';
import type { ModelProvider, CompletionRequest, CompletionResult, ToolCall, AgentMessage } from './provider.ts';

export interface AnthropicOptions {
  readonly model?: string;
  readonly maxTokens?: number;
  /* Depth of reasoning per turn. A shopping conversation is not a hard
     reasoning problem and it is waiting on a person, so it runs low. */
  readonly effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  readonly client?: Anthropic;
}

/* Consecutive tool results belong in one user turn. Splitting them across
   several teaches the model to stop asking for parallel calls, so the
   grouping is done here rather than in the loop. */
function toMessages(messages: readonly AgentMessage[]): Anthropic.Beta.BetaMessageParam[] {
  const out: Anthropic.Beta.BetaMessageParam[] = [];
  let pendingResults: any[] = [];

  const flush = () => {
    if (!pendingResults.length) return;
    out.push({ role: 'user', content: pendingResults });
    pendingResults = [];
  };

  for (const m of messages) {
    if (m.role === 'tool') {
      pendingResults.push({
        type: 'tool_result',
        tool_use_id: m.callId,
        content: JSON.stringify(m.result)
      });
      continue;
    }
    flush();
    if (m.role === 'user') {
      out.push({ role: 'user', content: m.text });
    } else {
      const content: any[] = [];
      if (m.text) content.push({ type: 'text', text: m.text });
      for (const c of m.toolCalls ?? []) {
        content.push({ type: 'tool_use', id: c.id, name: c.name, input: c.input });
      }
      if (content.length) out.push({ role: 'assistant', content });
    }
  }
  flush();
  return out;
}

export function anthropicProvider(options: AnthropicOptions = {}): ModelProvider {
  const client = options.client ?? new Anthropic();
  const model = options.model ?? 'claude-opus-5';

  return {
    name: `anthropic:${model}`,

    async complete(request: CompletionRequest): Promise<CompletionResult> {
      const response = await client.beta.messages.create({
        model,
        max_tokens: options.maxTokens ?? 8000,
        system: request.system,
        messages: toMessages(request.messages),
        tools: request.tools.map(t => ({
          name: t.name,
          description: t.description,
          input_schema: t.input as any,
          /* The input is guaranteed to validate, so the tool layer is
             validating a merchant's data rather than the model's JSON. */
          strict: true
        })),
        /* Thinking stays on. With it disabled this model will occasionally
           write a tool call into its visible text instead of calling the
           tool, which in a loop like ours means a cart that never gets
           built and a reply that reads like a stage direction. Depth is
           controlled with effort instead. */
        output_config: { effort: options.effort ?? 'low' },
        /* If a request is declined on policy grounds, answer it on another
           model rather than leaving a customer looking at nothing. */
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default'
      } as any);

      const text = response.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('')
        .trim();

      const toolCalls: ToolCall[] = response.content
        .filter((b: any) => b.type === 'tool_use')
        .map((b: any) => ({ id: b.id, name: b.name, input: (b.input ?? {}) as Record<string, unknown> }));

      if (response.stop_reason === 'refusal') {
        return { text: text || 'I cannot help with that one.', toolCalls: [], stop: 'end' };
      }

      return {
        text,
        toolCalls,
        stop: response.stop_reason === 'tool_use' ? 'tools' : 'end'
      };
    }
  };
}
