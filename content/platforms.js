/* Commerce platforms and the adapter contract every one of them
   implements. Adding a platform is one object. */

/* Adapters. status: "live" ships today, "build" is in progress,
   "generic" is the catch all for any other stack. Flip a status and
   the tabs, dots and detail card all follow. */
export const platforms = [
  { id:"woo", name:"WooCommerce", status:"live", badge:"WooCommerce",
    blurb:"Installed as a plugin, so nothing sits between you and a working install. Your catalog stays exactly where it is.",
    rows:[
      ["Install","WordPress plugin, activated from your admin"],
      ["Auth","Scoped REST credentials, read only on catalog"],
      ["Catalog","Products, variations, stock and pricing read live"],
      ["Cart","Native WooCommerce cart, your existing checkout"],
      ["Attribution","IDs written as order meta on the order record"]
    ] },
  { id:"shopify", name:"Shopify", status:"live", badge:"Shopify",
    blurb:"Installed as an embedded app, with the storefront widget added through a theme app extension. No theme surgery required.",
    rows:[
      ["Install","Embedded app plus theme app extension"],
      ["Auth","OAuth, scoped access, read only on catalog"],
      ["Catalog","Products, variants, inventory and pricing via Admin and Storefront APIs"],
      ["Cart","Storefront API cart, your existing Shopify checkout"],
      ["Attribution","Cart attributes carried onto the order, reconciled server side against the order webhook"]
    ] },
  { id:"magento", name:"Magento / Adobe Commerce", status:"build", badge:"Magento",
    blurb:"Ships as a Composer module, because Magento persists custom data through service contracts rather than loose key-value pairs. That makes attribution more work to build and more durable once it is there.",
    rows:[
      ["Install","Composer module, installed like any other extension"],
      ["Auth","Integration token with scoped ACL, read only on catalog"],
      ["Catalog","Products, configurable options, stock and pricing via REST and GraphQL"],
      ["Cart","Guest cart through the quote API, handed to your existing checkout"],
      ["Attribution","IDs persisted as order extension attributes declared by the module"]
    ] },
  { id:"bigcommerce", name:"BigCommerce", status:"build", badge:"BigCommerce",
    blurb:"Single click app install with a storefront script. Server side cart creation means the handoff into your checkout is a redirect rather than a rebuild.",
    rows:[
      ["Install","App install plus a storefront script"],
      ["Auth","OAuth API account, read only on catalog"],
      ["Catalog","Catalog API for products, variants, stock and pricing"],
      ["Cart","Server side cart, redirected into your existing checkout"],
      ["Attribution","IDs written to cart and order metafields"]
    ] },
  { id:"generic", name:"Any other store", status:"generic", badge:"Custom",
    blurb:"Custom, headless or in house. If your store can expose a catalog and accept a cart, it can run this. The intelligence layer does not care what is underneath it.",
    rows:[
      ["Install","A script tag on your site, plus API access or a product feed"],
      ["Auth","An API key you issue, scoped to reads"],
      ["Catalog","Your own REST or GraphQL endpoints, or a scheduled product feed"],
      ["Cart","Deep link into your cart or checkout with the selected items"],
      ["Attribution","Session ID passed on handoff, reconciled against your order webhook or export"]
    ] }
];

/* What every adapter must implement. This is the agnosticism claim,
   stated as a contract rather than a promise. */
export const adapterContract = {
  owns: ["Authentication and credential scoping","Catalog normalization into the common product shape","How attribution is persisted on that platform"],
  shared: ["Intent extraction","Retrieval and ranking","Conversation and tool selection","Permissions","Attribution reconciliation","Dashboard and analytics"],
  methods: ["authenticate()","syncCatalog()","searchProducts()","getProduct()","getVariations()","checkInventory()","getPrice()","createCart()","addToCart()","createCheckout()","writeAttribution()","readOrder()"]
};
