/* The agent service: orchestration, tool selection and conversation state.

   The loop lives here rather than inside a provider SDK, which is the
   whole point. Every tool call goes through the tool layer, so every one
   of them is validated, scoped to a merchant and written down. */

import type { ModelProvider, AgentMessage, ToolCall } from './provider.ts';
import type { ToolKit } from '../tools/registry.ts';
import type { AttributionLedger } from '../attribution/ledger.ts';
import type { MerchantId, SessionId, ConversationId, CartId } from '../contract/ids.ts';
import { systemPrompt, type StoreBrief } from './prompt.ts';

export interface ConversationOptions {
  readonly provider: ModelProvider;
  readonly tools: ToolKit;
  readonly ledger: AttributionLedger;
  readonly merchantId: MerchantId;
  readonly sessionId: SessionId;
  readonly conversationId: ConversationId;
  readonly visitorRef: string | null;
  readonly brief: StoreBrief;
  /* Find, check the variants, put them forward, open a cart, add, hand
     over: six rounds is a good turn, not a runaway. The limit is set
     above that, so it catches a loop rather than a thorough answer. */
  readonly maxToolRounds?: number;
}

export interface Turn {
  readonly reply: string;
  readonly toolCalls: readonly { name: string; input: unknown }[];
  readonly rounds: number;
  readonly cartId: CartId | null;
  readonly hitRoundLimit: boolean;
}

export class ShoppingConversation {
  readonly #o: ConversationOptions;
  readonly #messages: AgentMessage[] = [];
  #opened = false;

  constructor(options: ConversationOptions) {
    this.#o = options;
  }

  get transcript(): readonly AgentMessage[] { return this.#messages; }

  /* A widget showing nothing is worse than a widget showing less. If a
     turn ends with no words at all, fall back to the last thing that was
     actually said rather than rendering an empty bubble. */
  #lastSaidSomething(): string {
    for (let i = this.#messages.length - 1; i >= 0; i--) {
      const m = this.#messages[i];
      if (m.role === 'assistant' && m.text) return m.text;
    }
    return 'Let me look at that again. Tell me a bit more about what you need it for.';
  }

  async say(text: string): Promise<Turn> {
    /* The session opens at the first thing a customer says, which is the
       moment intent exists to attribute anything to. */
    if (!this.#opened) {
      await this.#o.ledger.openSession({
        sessionId: this.#o.sessionId,
        merchantId: this.#o.merchantId,
        conversationId: this.#o.conversationId,
        visitorRef: this.#o.visitorRef,
        startedAt: new Date()
      });
      this.#opened = true;
    }

    this.#messages.push({ role: 'user', text });

    const limit = this.#o.maxToolRounds ?? 8;
    const used: { name: string; input: unknown }[] = [];
    let rounds = 0;

    for (;;) {
      const result = await this.#o.provider.complete({
        system: systemPrompt(this.#o.brief),
        messages: this.#messages,
        tools: this.#o.tools.defs
      });

      this.#messages.push({
        role: 'assistant',
        text: result.text || undefined,
        toolCalls: result.toolCalls.length ? result.toolCalls : undefined
      });

      if (result.stop !== 'tools' || !result.toolCalls.length) {
        return {
          reply: result.text,
          toolCalls: used,
          rounds,
          cartId: this.#o.tools.cartId(),
          hitRoundLimit: false
        };
      }

      rounds += 1;
      /* Parallel calls come back in one turn and are answered in one turn:
         splitting them teaches the model to stop asking for them. */
      const results = await Promise.all(
        result.toolCalls.map(async (call: ToolCall) => ({
          call,
          output: await this.#o.tools.call(call.name, call.input)
        }))
      );
      for (const { call, output } of results) {
        used.push({ name: call.name, input: call.input });
        this.#messages.push({ role: 'tool', callId: call.id, name: call.name, result: output });
      }

      if (rounds >= limit) {
        /* Offered no tools, so the only thing left to do is answer. */
        const closing = await this.#o.provider.complete({
          system: systemPrompt(this.#o.brief) +
            '\n\nAnswer now with what you already know. Do not call any more tools.',
          messages: this.#messages,
          tools: []
        });
        this.#messages.push({ role: 'assistant', text: closing.text });
        return {
          reply: closing.text || this.#lastSaidSomething(),
          toolCalls: used,
          rounds,
          cartId: this.#o.tools.cartId(),
          hitRoundLimit: true
        };
      }
    }
  }
}
