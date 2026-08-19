/* The identifiers that make an order auditable. They are minted at the
   moment the thing happens and are never re-derived later, which is what
   lets a merchant open a billed order and read the conversation. */

export type MerchantId       = string & { readonly __brand: 'MerchantId' };
export type SessionId        = string & { readonly __brand: 'SessionId' };
export type ConversationId   = string & { readonly __brand: 'ConversationId' };
export type RecommendationId = string & { readonly __brand: 'RecommendationId' };
export type CartId           = string & { readonly __brand: 'CartId' };
export type OrderId          = string & { readonly __brand: 'OrderId' };
export type ProductId        = string & { readonly __brand: 'ProductId' };
export type VariationId      = string & { readonly __brand: 'VariationId' };

export const asMerchantId       = (s: string) => s as MerchantId;
export const asSessionId        = (s: string) => s as SessionId;
export const asConversationId   = (s: string) => s as ConversationId;
export const asRecommendationId = (s: string) => s as RecommendationId;
export const asCartId           = (s: string) => s as CartId;
export const asOrderId          = (s: string) => s as OrderId;
export const asProductId        = (s: string) => s as ProductId;
export const asVariationId      = (s: string) => s as VariationId;

/* Injectable so tests are deterministic and so a service can swap in a
   database sequence or a ULID without touching anything that mints ids. */
export interface IdFactory {
  session(): SessionId;
  conversation(): ConversationId;
  recommendation(): RecommendationId;
}

export function prefixedIds(random: () => string): IdFactory {
  return {
    session:        () => asSessionId('ais_' + random()),
    conversation:   () => asConversationId('cnv_' + random()),
    recommendation: () => asRecommendationId('rec_' + random())
  };
}
