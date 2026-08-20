/* THE COMMERCE TOOL LAYER

   The agent gets verbs, not access. It never issues a query against a
   store: it calls these, each one validated, scoped to one merchant, and
   logged with the session that invoked it.

   Two things about this list are load bearing.

   First, what is absent. Price changes, deletes, inventory writes,
   customer export, payment settings and refunds are not guarded here,
   discouraged in a prompt, or gated behind a flag. They do not exist, so
   there is no path to them regardless of what a customer types into the
   chat. contract/adapter.ts exports FORBIDDEN_OPERATIONS and a test
   asserts none of them ever appear.

   Second, recommending is its own verb. Searching is retrieval and has no
   consequences; putting specific products in front of a customer is an
   act that gets written down, with a position and a reason, because that
   record is what an invoice is later argued from. Making the agent say
   which products it is actually putting forward, and why, is the
   difference between an attribution we can show a merchant and one we
   inferred from a query log. */

export interface ToolDef {
  readonly name: string;
  readonly description: string;
  readonly input: {
    readonly type: 'object';
    readonly properties: Record<string, unknown>;
    readonly required: readonly string[];
    readonly additionalProperties: false;
  };
}

const str = (description: string) => ({ type: 'string', description });
const int = (description: string, minimum = 1, maximum = 10) =>
  ({ type: 'integer', description, minimum, maximum });

export const TOOLS: readonly ToolDef[] = [
  {
    name: 'search_products',
    description:
      'Search the merchant catalog. Returns candidates with prices and stock read live from the store at this moment. ' +
      'Use the signals argument for anything the customer told you about their situation: fit, size, use, level, or something to avoid. ' +
      'Searching shows you nothing to the customer. Use recommend_products when you have decided what to put forward.',
    input: {
      type: 'object',
      properties: {
        query: str('What the customer is shopping for, in their own words'),
        signals: {
          type: 'array',
          description: 'What you understood about their situation',
          items: {
            type: 'object',
            properties: {
              key: str('fit, size, use, level, occasion, or avoid'),
              value: str('the value in the customer’s own terms')
            },
            required: ['key', 'value'],
            additionalProperties: false
          }
        },
        max_price: str('Upper limit as a decimal string, for example "120.00". Omit if they did not give one'),
        in_stock_only: { type: 'boolean', description: 'Exclude anything not in stock. Usually true' },
        limit: int('How many candidates to return', 1, 10)
      },
      required: ['query'],
      additionalProperties: false
    }
  },
  {
    name: 'get_product',
    description: 'Full detail for one product, with price and stock read live.',
    input: {
      type: 'object',
      properties: { product_id: str('Product id from a search result') },
      required: ['product_id'],
      additionalProperties: false
    }
  },
  {
    name: 'get_variations',
    description: 'Every variation of a product with its own price and stock. Use this before promising a size or a fit.',
    input: {
      type: 'object',
      properties: { product_id: str('Product id from a search result') },
      required: ['product_id'],
      additionalProperties: false
    }
  },
  {
    name: 'check_inventory',
    description: 'Whether a specific product or variation is in stock right now. Never assert stock you have not checked.',
    input: {
      type: 'object',
      properties: {
        product_id: str('Product id'),
        variation_id: str('Variation id, if the customer chose one')
      },
      required: ['product_id'],
      additionalProperties: false
    }
  },
  {
    name: 'get_price',
    description: 'The current price of a product or variation. Never state a price from memory.',
    input: {
      type: 'object',
      properties: {
        product_id: str('Product id'),
        variation_id: str('Variation id, if the customer chose one')
      },
      required: ['product_id'],
      additionalProperties: false
    }
  },
  {
    name: 'compare_products',
    description: 'Two or more products side by side, with live prices, stock and the attributes that differ between them.',
    input: {
      type: 'object',
      properties: {
        product_ids: { type: 'array', description: 'Two or more product ids', items: { type: 'string' } }
      },
      required: ['product_ids'],
      additionalProperties: false
    }
  },
  {
    name: 'recommend_products',
    description:
      'Put specific products in front of the customer, in the order you want them shown. ' +
      'Give the reason each one fits their situation: that reason is recorded and the merchant can read it later, ' +
      'so write it for them, not for the customer. Call this before you describe products in your reply.',
    input: {
      type: 'object',
      properties: {
        recommendations: {
          type: 'array',
          description: 'In the order you want them shown, best first',
          items: {
            type: 'object',
            properties: {
              product_id: str('Product id'),
              variation_id: str('Variation id, if you are recommending a specific one'),
              reason: str('Why this one fits what the customer told you')
            },
            required: ['product_id', 'reason'],
            additionalProperties: false
          }
        }
      },
      required: ['recommendations'],
      additionalProperties: false
    }
  },
  {
    name: 'create_cart',
    description: 'Open a cart on the merchant store for this conversation. Call once, before adding anything.',
    input: { type: 'object', properties: {}, required: [], additionalProperties: false }
  },
  {
    name: 'add_to_cart',
    description: 'Add a product to the cart. Check stock first. Adding is the only write this system ever makes to a store.',
    input: {
      type: 'object',
      properties: {
        product_id: str('Product id'),
        variation_id: str('Variation id, when the product has variations'),
        quantity: int('How many', 1, 20)
      },
      required: ['product_id', 'quantity'],
      additionalProperties: false
    }
  },
  {
    name: 'create_checkout',
    description: 'Hand the cart to the merchant’s own checkout and return the link. Their payments, their fulfillment.',
    input: { type: 'object', properties: {}, required: [], additionalProperties: false }
  }
];

export const TOOL_NAMES: readonly string[] = TOOLS.map(t => t.name);
