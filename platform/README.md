# platform

The commerce layer. No build step: these are `.ts` files run directly by
Node's type stripping, so `node --test platform/test` is the whole toolchain.

## What is here, and why in this order

Reconciliation was written first, before any conversation code, because
attribution is the invoice. Everything under `src/attribution/` decides
money and is treated as correctness critical rather than as analytics.

```
src/contract/      money.ts     integer minor units, fees round down
                   ids.ts       the identifiers that make an order auditable
                   adapter.ts   THE CONTRACT: 12 methods, 3 concerns

src/attribution/   ledger.ts    our own record of what a session did
                   cases.ts     direct | assisted | unrelated, kept apart
                   policy.ts    the window and the take rate, in one place
                   reconcile.ts the decision, from the order and the ledger
                   trace.ts     order id -> session -> conversation
                   invoice.ts   the sum, with the cases still separable

src/catalog/       store.ts     the retrieval copy, and why it is never quoted
                   search.ts    ranking, written once, above the adapter
                   sync.ts      fills the shelf from any adapter

src/tools/         schema.ts    the verbs the agent gets, and what is absent
                   registry.ts  binds them to one merchant, records what matters

src/agent/         provider.ts  the whole surface a model provider gets
                   prompt.ts    what it is for, in the merchant's words
                   service.ts   the loop: ours, not an SDK's
                   scripted.ts  a provider that cannot surprise a test
                   anthropic.ts the only file that imports a model SDK

src/adapters/woocommerce/
                   client.ts        1. auth and credential scoping
                   normalize.ts     2. catalog normalization
                   attribution.ts   3. how attribution is persisted here
                   index.ts         implements CommerceAdapter, nothing more
```

## Three properties, and how each is held

**A stale price never reaches a customer.** The catalog is a cache used to
decide *which* products are worth looking at. Search returns candidate
ids, not products, so a stale price has no route to anybody: the tool
layer re-reads price and stock from the commerce API before a product is
described. `tools.test.ts` proves it by poisoning the cache and asserting
the store's answer comes back.

**The model has no path to a destructive operation.** Not guarded, not
discouraged: absent. `FORBIDDEN_OPERATIONS` in the contract is asserted
against the tool schema, and a tool name that does not exist is answered
rather than attempted. A product id the merchant does not carry is refused
before a request leaves the platform, so a model cannot invent a SKU and
get real data back.

**Recommending is an act, not a side effect.** Searching records nothing.
`recommend_products` is a separate verb that writes the position and the
reason, because that row is what an invoice is later argued from.
Inferring recommendations from a query log would over claim, and the whole
attribution model is built to under claim.

## Not an OpenAI wrapper, stated as an interface

`agent/provider.ts` is the entire surface a model provider gets: complete
a request, given a system prompt, a transcript and tool definitions.
The loop, the conversation state, which tools exist and what gets written
down are all above it and identical whichever provider is configured.

The loop is deliberately ours rather than an SDK helper's. If orchestration
lived inside a provider SDK, swapping providers would mean rewriting
orchestration, and the claim would be false. `conversation.test.ts` runs
the entire product on `scripted.ts`, which is the proof: those tests are
about the commerce platform, not about a model's mood on the day.

## Watching it work

```
node platform/demo.ts                              # scripted, no key, no network
ANTHROPIC_API_KEY=... node platform/demo.ts --live # same platform, real model
```

Catalog sync, one customer sentence, the verbs the agent chose, the cart,
the order, reconciliation with its evidence, the trace a merchant reads,
and the invoice line.

## The adapter contract

Three concerns per adapter and nothing else: authentication, catalog
normalization, and how attribution is persisted. Retrieval, ranking,
conversation, tool selection, permissions, reconciliation and analytics are
written once, above the adapter, and are identical on every platform.

`ADAPTER_METHODS` and `FORBIDDEN_OPERATIONS` in `contract/adapter.ts` are
exported as data so `test/contract.test.ts` can assert both the surface an
adapter must have and the operations it must not grow. Price changes,
deletes, inventory writes, customer export, payment settings and refunds
are absent, not discouraged.

## Reconciliation

Two records, neither trusted alone:

| | order stamp | our ledger | outcome |
|---|---|---|---|
| both agree | yes | yes | direct |
| stamp dropped by the store | no | yes | **direct**, the ledger is ours to keep |
| stamp we cannot corroborate | yes | no | **unrelated**, we will not bill it |
| no cart, recommended item bought in the window | either | yes | assisted |
| everything else | | | unrelated |

The asymmetry is deliberate. WooCommerce order meta is reliable; Shopify
cart attributes are not, and reconciling server side against the order
webhook is the only way a merchant does not lose revenue to a competing app
overwriting a field. In the other direction we under claim: an order we
cannot walk back to a conversation is not billed, because a merchant would
be right to argue with it.

Only the lines that can be pointed at are billed, never the order total. A
customer who adds socks at checkout did not buy the socks from us.

## Running it

```
npm test                       # node --test platform/test
node --test platform/test/reconcile.test.ts
```

## Not built yet

Conversation, agent orchestration, tool schema, the Shopify adapter, the
dashboard. V1 answers one question: can an AI product expert measurably
drive transactions. Everything not required to answer it is out of scope.
