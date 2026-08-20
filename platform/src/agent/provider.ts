/* The whole surface a model provider gets.

   Language understanding and tool selection come from here. Orchestration,
   conversation state, which tools exist, what they do and what gets
   written down do not: those are in agent/service.ts and tools/, and they
   are the same whichever provider is configured.

   This interface is the test of the claim. If swapping a provider ever
   requires touching anything outside agent/, the boundary has leaked and
   that is the bug to fix. */

import type { ToolDef } from '../tools/schema.ts';

export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly input: Record<string, unknown>;
}

export type AgentMessage =
  | { readonly role: 'user'; readonly text: string }
  | { readonly role: 'assistant'; readonly text?: string; readonly toolCalls?: readonly ToolCall[] }
  | { readonly role: 'tool'; readonly callId: string; readonly name: string; readonly result: unknown };

export interface CompletionRequest {
  readonly system: string;
  readonly messages: readonly AgentMessage[];
  readonly tools: readonly ToolDef[];
}

export interface CompletionResult {
  readonly text: string;
  readonly toolCalls: readonly ToolCall[];
  /* 'tools' means it wants them run and the turn continues. */
  readonly stop: 'end' | 'tools';
}

export interface ModelProvider {
  readonly name: string;
  complete(request: CompletionRequest): Promise<CompletionResult>;
}
