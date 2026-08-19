/* Everything the merchant page argues, in the order it argues it. */

/* what the search box throws away */
export const loss = {
  sentence: "My son just joined a competitive team. He's 9, plays point guard indoors three times a week, has wide feet, and I want to stay under $100.",
  attrs: ["age 9","point guard","indoor","3x per week","competitive","wide feet","under $100","first pair"],
  keyword: "basketball shoes",
  badLabel: "What your search box keeps",
  goodLabel: "What the conversation keeps",
  badNote: "Everything else is discarded before your catalog ever sees it.",
  goodNote: "All of it reaches the catalog, so the recommendation can actually be right."
};

/* Named in the owner's words, not ours. `stat` is the consequence. */
export const pains = [
  { t:"They ask, then they leave", p:"Somebody types a real question into your search box, gets 340 results sorted by nothing, and closes the tab. You never find out what they wanted." },
  { t:"The same five questions, forever", p:"Will this fit my car. Is this okay for sensitive skin. How much do I need. Your team answers these all day, and nights and weekends nobody answers them at all." },
  { t:"Returns you could have prevented", p:"Wrong size, wrong fitment, wrong product for the job. Every one of those was a question that did not get asked before checkout." },
  { t:"You know the answer, the site does not", p:"You could sell this customer in ninety seconds standing in a shop. Your website has no way to do what you do." },
  { t:"Traffic that never converts", p:"You pay for the visit either way. The gap between a visitor and an order is usually one question nobody was there to answer." },
  { t:"No idea why people buy", p:"Analytics tells you what they clicked. It cannot tell you they were shopping for a nine year old with wide feet on a budget." }
];

/* The fit test, as a test the owner can actually take rather than two
   lists they nod at. Every signal carries the reason it matters, and the
   strong ones say so, because the arithmetic behind the verdict should be
   as checkable as the arithmetic on the invoice.

   The second column is the honest half and it stays. Three of its entries
   are enough on their own: a store that ticks one of those is a store we
   would rather turn away now than take a month from. */
export const fit = {
  for: {
    t:"Signs it works on your store", pill:"tick what is true",
    items:[
      { t:"Customers ask you questions before they buy", strong:true,
        d:"Email, chat, DMs, the phone. Every one of those was a sale waiting on somebody being free to answer." },
      { t:"Wrong choices come back as returns", strong:true,
        d:"Wrong size, wrong fitment, wrong product for the job. You pay the shipping twice and you lose the sale anyway." },
      { t:"Picking the right one means knowing something", strong:true,
        d:"Compatibility, sizing, skill level, what goes with what. If a customer cannot work it out on their own, most of them do not." },
      { t:"You sell variants, sizes, fitment or compatibility",
        d:"The more ways there are to get it wrong, the more a good salesperson is worth to you." },
      { t:"Your catalog is big enough that browsing is a chore",
        d:"Four hundred results sorted by nothing is not a shopping experience, it is a filing cabinet." },
      { t:"You do at least a few hundred orders a month",
        d:"Below that there are too few conversations in thirty days to tell you anything you can trust." },
      { t:"You pay for traffic that does not convert",
        d:"You already bought the visit. The gap between it and an order is usually one question." }
    ]
  },

  against: {
    t:"Signs it does not", pill:"the honest half",
    items:[
      { t:"You sell one product with one option", hard:true,
        d:"There is nothing to help anybody choose between." },
      { t:"People arrive knowing the exact SKU they want", hard:true,
        d:"They do not need a salesperson. They need a search box that works, and that is a cheaper problem." },
      { t:"Price is the only thing anyone compares", hard:true,
        d:"No conversation changes who is cheapest." },
      { t:"You are pre launch with no orders yet",
        d:"There is nothing to attribute, so you would be paying us in time for a number we cannot produce." },
      { t:"You can still reply to every customer yourself",
        d:"Then you already have the thing we are selling, and yours is better than ours. Come back when you cannot keep up." }
    ],
    note:"The top three are enough on their own. If one of them is you, we will say so on the first call rather than sell you a pilot that cannot work."
  },

  /* Two strong signals, or one strong and two supporting, is the bar.
     Anything in the honest half marked hard overrules the whole thing. */
  verdicts: {
    none: { k:"start", t:"Tick what is true about your store",
      p:"Nothing here is sent anywhere. It runs in your browser, we never see it, and there is no form at the end of it." },
    no: { k:"no", t:"Probably not worth your time",
      p:"We would rather say that now than take a month of it. If the catalog grows, or what you sell starts needing explaining, come back and run this again." },
    maybe: { k:"maybe", t:"Worth a conversation, not a promise",
      p:"That is thinner than we would want before either of us spends a month on it. Tell us which one it is and we will say honestly whether it is enough." },
    yes: { k:"yes", t:"This is the shape of store it works for",
      p:"Those are the whole thesis. Thirty days costs you about two and a half hours and no money, so the only way left to find out is to run it.",
      cta:{ label:"Start my 30 days", href:"#start" } }
  }
};

export const gets = [
  { t:"More of your visitors buy", p:"The ones who would have bounced at the search results get an answer instead. Same traffic, same ad spend, more orders out the other end." },
  { t:"Fewer returns", p:"It confirms fitment, size and suitability before the cart, in the same conversation. The wrong-product return is the one you stop paying for first." },
  { t:"Your team stops repeating itself", p:"The questions your staff answer forty times a week get answered at 2am, correctly, from your real stock. They handle the ones that actually need a person." },
  { t:"You see why people buy", p:"Not what they clicked. What they were trying to solve, in their words, and which of those reasons turn into orders. That changes what you stock." },
  { t:"Nothing about your store changes", p:"Same platform, same checkout, same payments, same fulfillment. It sits on top and hands finished carts to the setup you already run." },
  { t:"You only pay out of sales it made", p:"No setup fee, no monthly fee. One percent of the orders we can show you came from a conversation, and you can open any one of them and read it." }
];

export const board = [
  { k:"AI attributed revenue", v:47218, pre:"$", hero:true, d:"Last 30 days, orders traced to a conversation" },
  { k:"AI orders", v:384 },
  { k:"Shopping sessions", v:4821 },
  { k:"AI conversion rate", v:7.96, suf:"%", dec:2 },
  { k:"Average AI order", v:123, pre:"$" },
  { k:"Add to carts", v:1104 },
  { k:"Your fee this month", v:472.18, pre:"$", dec:2, d:"1% of attributed revenue" }
];

export const intents = [
  { l:"shoes under $100", n:1201, cv:"14.1%" },
  { l:"youth basketball shoes", n:1422, cv:"11.2%" },
  { l:"guard shoes, lightweight", n:812, cv:"12.4%" },
  { l:"wide foot basketball shoes", n:618, cv:"9.8%" },
  { l:"beginner basketball shoes", n:412, cv:"6.7%" }
];

/* The 30 day pilot, in the owner's words. Every week says what we do,
   what it costs them in time, and the thing they can go and check
   themselves at the end of it. Adding a week is one object. */
export const pilot = {
  weeks: [
    { n:"Week 1", days:"Days 1 to 7", t:"It goes on your store",
      we:[
        "We install the plugin and connect it with credentials that can only read",
        "It reads your catalog: products, variants, sizes, fitment, stock and prices",
        "We sit with you and learn how you would want a good salesperson to sell it",
        "None of this is visible to your customers yet"
      ],
      you:{ time:"about an hour", items:[
        "One call about your catalog and how you sell it",
        "A store login and API credentials"
      ]},
      ends:"You ask it for something the way a customer would, and it comes back with things you actually have, in the right size, at today's price." },

    { n:"Week 2", days:"Days 8 to 14", t:"It starts talking to customers",
      we:[
        "The assistant goes live in your branding, on the pages you pick",
        "You choose what share of your traffic sees it, starting small",
        "We read the first real conversations with you and correct what it gets wrong",
        "It can answer and recommend, but it cannot build a cart yet"
      ],
      you:{ time:"about half an hour", items:[
        "Tell us where it appears and how much traffic sees it",
        "Tell us anything it must never say or recommend"
      ]},
      ends:"Real customers are asking it real questions on your site, and you can read every one of them." },

    { n:"Week 3", days:"Days 15 to 21", t:"It starts building carts",
      we:[
        "It builds carts and hands them to the checkout you already run",
        "Every order it touched carries a trail written onto the order itself",
        "We check that trail against your own order data rather than trusting it",
        "Your payments, shipping and fulfillment do not change"
      ],
      you:{ time:"nothing, unless you want to", items:[
        "Change anything you did not like in week two"
      ]},
      ends:"An order lands in your store that came out of a conversation, and you can open it and read the conversation." },

    { n:"Week 4", days:"Days 22 to 30", t:"You check the arithmetic",
      we:[
        "The dashboard opens: orders and dollars, not sessions and tokens",
        "Every attributed order opens onto the conversation that produced it",
        "Orders it built and orders it only influenced are counted separately",
        "Your first invoice: one percent of what we can show you it sold"
      ],
      you:{ time:"about an hour", items:[
        "Go through the attributed orders with us",
        "Argue with any of them"
      ]},
      ends:"You know what it earned you, and you have already challenged the number rather than been handed it." }
  ],

  /* The whole ask, in one line each. Set in mono because every one of
     these is a fact the merchant can hold us to. */
  commitment: {
    t:"Across the whole thirty days, this is the entire ask. Everything else is on us.",
    facts:[
      { v:"2.5 hours", k:"your time, the three calls above added up" },
      { v:"read only", k:"what we get on your catalog" },
      { v:"carts only", k:"the only thing we ever write to your store" },
      { v:"$0", k:"to start, and to stop" }
    ]
  }
};

/* How day 30 goes, both ways. The second card is the honest one and it
   stays. Rendered by the same list card as everything else. */
export const outcomes = [
  { t:"It sold, and you keep it", ok:true, pill:"the good case", items:[
    "You pay one percent of the orders we showed you the conversation for",
    "That rate is locked for as long as you stay",
    "Nothing about your store had to change to get there",
    "You cancel whenever you want, without a call"
  ]},
  { t:"It sold nothing, and you stop", ok:false, pill:"the honest case", items:[
    "You owe nothing, because there is nothing to take a percentage of",
    "We switch it off and you uninstall the plugin",
    "Your credentials are revoked and your catalog data is deleted",
    "You are out roughly two and a half hours"
  ]}
];

export const faqHome = [
  { q:"Is this just another chatbot widget?", a:"A support chatbot answers questions about your policies. This one sells: it reads your live catalog, narrows to specific products you actually have in stock, and builds the cart. If it sells nothing you pay nothing, which is not a deal a chatbot vendor will offer you." },
  { q:"How long does this take to set up?", a:"An install and about an hour of your time to talk through your catalog and how you would want a good salesperson to sell it. You are not writing scripts, building flows, or training anything." },
  { q:"Do I have to change platforms?", a:"No. WooCommerce or Shopify keeps handling products, inventory, pricing, orders, payments and fulfillment. We add a layer above it and never write to your store outside of carts." },
  { q:"Which platforms are supported?", a:"WooCommerce and Shopify are live today, Magento and BigCommerce are in build, and anything else runs on the generic adapter, which needs only a catalog we can read and a cart we can hand off to. If your store can do those two things, it can run this." },
  { q:"Do my customers need a ChatGPT account?", a:"No. The experience is embedded in your site under your branding. The customer just visits your store as they always have." },
  { q:"What if nobody uses it?", a:"Then we do not get paid. There is no setup fee and no monthly fee, so the cost of finding out is your time and a plugin install." },
  { q:"Can it recommend something I do not sell?", a:"It can only see and recommend from your live catalog, with real stock and real prices coming from your store rather than from the model. You can also exclude products or whole categories from it." },
  { q:"How do I know the revenue is really yours?", a:"Every session, recommendation, cart and order carries an ID written at the time it happened. Open any billed order in the dashboard and read the conversation that produced it." },
  { q:"What do you need from me to start?", a:"A plugin install, API credentials scoped to the capabilities listed on the platform page, and about an hour to talk through your catalog and how you would want a good salesperson to sell it." }
];
