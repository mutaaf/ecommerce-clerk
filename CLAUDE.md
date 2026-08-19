# Clerk — agentic commerce platform

Working name is a placeholder. Two things live here: the marketing site
(`site/`) and the platform itself (`platform/`). They share nothing but this file.

## Who this is for

The buyer is an ecommerce store owner doing $1M+ GMV on WooCommerce or Shopify,
in a category where choosing the right product takes knowledge. They are not
technical. They forward the platform page to a developer or agency.

## Non-negotiables

- **No em dashes.** Anywhere. Copy, comments, commit messages, docs.
- **Config drives everything.** Content lives in a data structure, never inline
  in markup. Adding a store category, a platform adapter, or a FAQ entry is one
  object, no code changes. If a change requires touching a renderer, the
  renderer is wrong.
- **DRY, SOLID, KISS.** One renderer per component, mounted wherever needed.
  Duplicate markup is a bug.
- **Never invent a metric.** No conversion percentages, time-on-site figures, or
  customer counts unless they came from a real merchant. Placeholder numbers are
  labelled as illustrative.

## Site conventions (`site/`)

### Voice
Plain, specific, in the owner's words. Name the loss, not the mechanism. "Wrong
fitment returns eating your margin", not "intent extraction". No identifiers
(`ai_session_id`, `recommendation_id`) anywhere on the merchant page. Those live
only on the platform page.

State the honest negative. The fit section has a real "probably not worth it if"
column and it stays.

### Typography rule
Claims are set in the display face (Bricolage Grotesque). Anything the system can
**prove** — IDs, money, counts, metrics — is set in mono (IBM Plex Mono). This is
load bearing, not decorative. Do not set a dollar figure in the body face.

### Visual system
Light and airy. Near white paper, white cards on layered soft shadows, 20px
radii, generous section padding. No dark sections except the single CTA block at
the end. Violet (`--intent`) is the AI side, green (`--proof`) is the money side,
and the gradient between them is the product thesis. Palette and shadows are in
`:root`; never hardcode a hex outside it.

### Page structure
The merchant page argues before it demos:
hero thesis and before/after → the losses → why it happens → the playable
conversation → what changes → fit test → dashboard → funnel simulator →
platforms → seats → 30 day pilot → FAQ → CTA.

Do not move the demo above the problem. That ordering was tested and changed
deliberately.

### Motion
Everything respects `prefers-reduced-motion`. The hero auto-cycles categories and
must stop when it scrolls out of view so the section below does not restart under
the reader.

## Platform conventions (`platform/`)

### The adapter contract
Every commerce adapter owns exactly three concerns and nothing else:
authentication, catalog normalization, and how attribution is persisted.
Retrieval, ranking, conversation, tool selection, permissions, reconciliation and
analytics are written once and shared. If platform-specific logic leaks above the
adapter, that is the bug to fix.

Interface: `authenticate` `syncCatalog` `searchProducts` `getProduct`
`getVariations` `checkInventory` `getPrice` `createCart` `addToCart`
`createCheckout` `writeAttribution` `readOrder`

### Attribution is the invoice
It is the business model, so treat it as correctness-critical, not analytics.

- WooCommerce: order meta on the order record. Straightforward.
- Shopify: cart attributes carried to the order. **Do not trust carry-over.**
  Multiple reports of attributes silently dropping, sometimes from a competing
  app overwriting them. Always reconcile server side against the order webhook.
- Magento: no loose key-value path. Service contracts mean a column on
  `sales_order`, an `extension_attributes.xml` declaration, and a plugin on the
  order repository. Ships as a Composer module.

Three attribution cases, and they must stay distinguishable in the data:
direct (cart created by the session), assisted (bought inside the window after a
recommendation), unrelated (not attributed). Under-claim rather than send an
invoice a merchant can argue with.

### The model never touches the store
It calls narrowly scoped tools. Price changes, deletes, inventory writes,
refunds, customer export and payment settings are absent from the tool schema,
not discouraged by a prompt. Transactional facts (price, stock, variants,
fitment) are always read from commerce APIs at request time and never recalled.

### Not an OpenAI wrapper
Provider choice is configuration. Swapping it must not touch the commerce
platform. If provider-specific code appears outside the agent service, reject it.

## Scope discipline

V1 answers one question: can an AI product expert measurably drive transactions.
Out of scope until that is answered: autonomous refunds, support suite, CRM,
email marketing, ERP, fulfillment, personalization, autonomous pricing, custom
model training, and any adapter beyond the two live ones.

## Before you finish

- Screenshot the page at 1440, 900 and 390 and actually look at it.
- Check keyboard focus is visible on every interactive element.
- Confirm no new hex, font or shadow was introduced outside `:root`.
- Confirm nothing new claims a number we cannot source.
