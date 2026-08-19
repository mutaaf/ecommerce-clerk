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

src/adapters/woocommerce/
                   client.ts        1. auth and credential scoping
                   normalize.ts     2. catalog normalization
                   attribution.ts   3. how attribution is persisted here
                   index.ts         implements CommerceAdapter, nothing more
```

There is no conversation code, no agent, no tool schema. That is the point
of the order: the thing that decides an invoice exists and is tested before
anything that talks.

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
