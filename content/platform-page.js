/* Everything the platform page documents, for the developer or agency
   the merchant forwards it to. */

/* ---------- technical view ---------- */
export const surfaces = [
  { tag:"Shipping now", ok:true, t:"Product A · AI Storefront",
    p:"A merchant branded product expert embedded in the store. We control the UX, the conversation, the model choice, the retrieval, the cart and the measurement, which is exactly why it goes first: it is the fastest honest answer to whether conversational commerce increases revenue.",
    items:["Customer never leaves your site","No ChatGPT or Claude account needed","Your branding, your checkout","Full control of experimentation and analytics"] },
  { tag:"Phase 3", ok:false, t:"Product B · AI Distribution",
    p:"The same commerce engine pointed outward, exposing catalog and transaction capability to external agents. Strategically larger, but we do not control those platforms, so it follows proof rather than leading it.",
    items:["ChatGPT, Claude and future assistants","Shopping agents and AI operating systems","One merchant integration, many channels","Distribution fee on externally originated orders"] }
];

export const arch = [
  { n:"Customer", d:"on the merchant website" },
  { n:"AI Storefront widget", d:"JavaScript embed, merchant branded", ours:true },
  { n:"API gateway", d:"auth, rate limiting, merchant scoping", ours:true },
  { split:[
    { n:"Agent service", d:"orchestration, tool selection, conversation state", ours:true },
    { n:"LLM provider", d:"replaceable: OpenAI, Anthropic, next" }
  ]},
  { n:"Commerce service", d:"search · catalog · cart · attribution", ours:true },
  { n:"Commerce adapter", d:"one interface: WooCommerce · Shopify · Magento · BigCommerce · generic", ours:true },
  { n:"Your store", d:"system of record: products, orders, payments, fulfillment" }
];

export const ownership = [
  { t:"Replaceable infrastructure", ok:false, pill:"swappable",
    items:["Language understanding","Reasoning over retrieved data","Conversational phrasing","Tool selection"] },
  { t:"What we own", ok:true, pill:"the product",
    items:["Commerce orchestration","Product retrieval and ranking","Merchant integrations and catalog normalization","Business rules and permissions","Transaction flows","Attribution and analytics","Experimentation","Agent distribution"] }
];

export const tools = [
  { t:"Product tools", items:["search_products()","get_product()","get_variations()","compare_products()","check_inventory()","get_price()"] },
  { t:"Shopping tools", items:["create_cart()","add_to_cart()","remove_from_cart()","update_quantity()","apply_coupon()","create_checkout()"] },
  { t:"Knowledge tools", items:["search_store_policy()","get_shipping_information()","get_return_policy()","get_product_knowledge()"], soon:["get_order()","track_order()","request_return()","recommend_bundle()","find_substitute()"] }
];

export const safety = [
  { t:"How it works", ok:true, pill:"deterministic",
    items:["Understand intent from the conversation","Retrieve from merchant data via commerce APIs","Reason only over what was retrieved","Recommend with the reason recorded"] },
  { t:"What it never does", ok:false, pill:"blocked",
    items:["State a price from memory","Assert stock it did not check","Invent a variant or a size","Describe a product you do not carry","Promise a policy it cannot cite"] }
];

export const chain = [
  { i:"Step 1", t:"Intent", p:"The customer describes the situation in their own words and the session opens.", c:"merchant_id · ai_session_id · conversation_id" },
  { i:"Step 2", t:"Recommendation", p:"The agent queries the live catalog and puts specific SKUs forward, with position and reason recorded.", c:"recommendation_id · product_id · position · reason" },
  { i:"Step 3", t:"Cart", p:"A real cart on your own platform, carrying the session that created it.", c:"cart_id · ai_session_id" },
  { i:"Step 4", t:"Order", p:"Merchant checkout, merchant processor. The order record carries the trail into the database.", c:"ai_attributed = true · attribution_source", end:true }
];

export const rules = [
  { t:"Direct AI conversion", verdict:"Attributed", kind:"y",
    flow:["AI recommends product A","Customer adds A through the AI experience","Customer purchases A"],
    p:"The unambiguous case. The cart itself was created by the session." },
  { t:"AI assisted conversion", verdict:"Potentially attributed", kind:"m",
    flow:["AI recommends product A","Customer opens the normal product page","Customer buys A inside the attribution window"],
    p:"Governed by a stated window and visible in the dashboard as assisted, separated from direct so you can judge it yourself." },
  { t:"Unrelated purchase", verdict:"Not attributed", kind:"n",
    flow:["AI recommends product A","Customer returns later in a separate session","Customer buys product Z"],
    p:"Not attributed automatically. We would rather under claim than send an invoice a merchant can argue with." }
];

export const guards = [
  { t:"Exposed to the agent", pill:"allowed", ok:true,
    items:["Search products","Retrieve details and variations","Retrieve pricing","Check inventory","Create a cart","Modify a cart","Create a checkout"] },
  { t:"Never exposed", pill:"restricted", ok:false,
    items:["Change prices","Delete products","Modify inventory","Export customer data","Change payment settings","Issue refunds","Any write outside a cart"] }
];

export const stack = [
  { t:"Services", items:["Merchant website + JS widget","API gateway","Agent service → LLM API","Commerce service","Platform connectors"] },
  { t:"Data", items:["Postgres: merchants, sessions, conversations","Postgres: recommendations, attribution, orders","Redis: sessions, caching, rate limiting","Events: impression, recommendation, product_click","Events: add_to_cart, checkout, purchase"] }
];

export const notbuilding = [
  { t:"Not in V1", pill:"out of scope", ok:false,
    items:["Autonomous refunds","Customer service suite","CRM and email marketing","ERP and fulfillment","Sophisticated personalization","Autonomous pricing","Five ecommerce integrations","Custom model training"] },
  { t:"V1 answers one question", pill:"in scope", ok:true,
    items:["Can an AI product expert measurably drive transactions","Does a conversation convert better than a search session","What does attribution need to look like to be trusted","What does onboarding actually take"] }
];

export const flywheel = ["More merchants","More products","More conversations","More intent data","More transactions","Better recommendations","Higher merchant revenue"];

export const moat = [
  { t:"Integrations", p:"Deep connections into merchant commerce systems, normalized across platforms. Slow to build, slow to displace." },
  { t:"Attribution", p:"Trusted measurement of AI generated revenue. Once a merchant bills against your numbers, your numbers are the system of record." },
  { t:"Outcome data", p:"Intent joined to transaction. Knowing which recommendations convert for which reasons is the asset the model providers do not have." }
];

export const weeks = [
  { n:"Week 1", t:"Commerce foundation", items:["Connector + merchant auth","Catalog ingestion","Search, variants, pricing","Live inventory","Normalized commerce API"], g:"Ask for basketball shoes under $100 for a child and get real products from your store." },
  { n:"Week 2", t:"AI storefront", items:["Embeddable widget","Your branding","Conversation sessions","Agent orchestrator","Comparison + product cards"], g:"A customer can hold an intelligent shopping conversation against your real catalog." },
  { n:"Week 3", t:"Commerce", items:["Create and modify cart","Checkout handoff","Session attribution","Recommendation attribution","Order attribution"], g:"A conversation produces a real order in your store with the trail attached." },
  { n:"Week 4", t:"Merchant product", items:["Onboarding","Dashboard","Funnel analytics","AI GMV","Fee calculation"], g:"You can see exactly what the AI earned, and check the arithmetic yourself." }
];

/* Targets for the build, not results. Nothing here has happened yet and
   the page says so where it renders them. */
export const miles = [
  { b:"30 days", s:"first merchant live, one attributed transaction" },
  { b:"60 days", s:"three to five merchants, repeat transactions" },
  { b:"90 days", s:"ten merchants, $100K cumulative attributed GMV" }
];

export const faqTech = [
  { q:"Which model do you use?", a:"Whichever performs best for the task at the time, and it is a configuration choice rather than an architectural one. The agent service holds orchestration and tool selection so the provider can change without touching the commerce platform." },
  { q:"Is this just ChatGPT embedded in my website?", a:"A model may power parts of the reasoning, but the platform controls retrieval, commerce tools, permissions, transactions, attribution and analytics. The model is one replaceable component of the system." },
  { q:"How much of this is platform specific?", a:"Three concerns and nothing else: auth, catalog normalization, and how attribution is persisted. Everything above that is written once. The adapter interface on the platform page is the full surface area, so you can judge the claim rather than take it." },
  { q:"We are on a custom or headless stack. Does that rule us out?", a:"No. The generic adapter reads your catalog from your own endpoints or a scheduled product feed, and hands the finished cart back as a deep link into your checkout. Attribution rides along on the handoff and is reconciled server side against your order webhook or export." },
  { q:"What stops the agent from hallucinating a price?", a:"Prices, stock, variants and compatibility are only ever read from commerce APIs at request time. The model reasons over retrieved data and is not asked to recall product facts." },
  { q:"What does the widget cost in page performance?", a:"It loads asynchronously after your page and does not block rendering. Catalog reads are cached and served from our side rather than hammering your store on every keystroke." },
  { q:"What happens to the data?", a:"Conversations and attribution belong to the merchant relationship and are visible in the dashboard. Aggregate intent patterns are what improve recommendations over time, which is exactly the asset that makes later recommendations better." }
]
