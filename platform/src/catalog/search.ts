/* Retrieval and ranking. Written once, above the adapter, so it is the
   same on every platform.

   It ranks on what the customer actually said. A signal that names an
   attribute the merchant carries (wide feet against a Width attribute) is
   worth more than a word that happens to appear in a description, because
   it is the thing that makes the recommendation right rather than
   plausible. Every candidate carries the reasons it ranked, which is what
   later gets written down as the reason a product was recommended. */

import type { Product } from '../contract/adapter.ts';
import type { ProductId } from '../contract/ids.ts';
import type { Money } from '../contract/money.ts';
import type { CatalogEntry } from './store.ts';

/* What the conversation understood, in the shape retrieval can use. */
export interface Signal {
  readonly key: string;     /* fit, size, use, level, avoid */
  readonly value: string;
}

export interface Query {
  readonly text?: string;
  readonly signals?: readonly Signal[];
  readonly categories?: readonly string[];
  readonly minPrice?: Money;
  readonly maxPrice?: Money;
  readonly inStockOnly?: boolean;
  readonly limit?: number;
}

export interface Candidate {
  readonly productId: ProductId;
  readonly score: number;
  readonly matched: readonly string[];
}

const WEIGHT = {
  attribute: 5,    /* the customer named something the merchant models */
  category:  3,
  title:     3,
  avoid:    -8,    /* asked not to have it: push it down hard, do not hide it */
  inBudget:  2,
  description: 1
};

const STOP = new Set(['the','and','for','with','a','an','of','my','is','are','to','in','on','it','i','need','want','looking','some','any','that','this']);

const words = (s: string): string[] =>
  s.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));

const attributeValues = (p: Product): string[] =>
  Object.values(p.attributes).flat().map(v => v.toLowerCase());

function scoreOne(p: Product, q: Query): { score: number; matched: string[] } {
  let score = 0;
  const matched: string[] = [];

  const title = p.title.toLowerCase();
  const cats = p.categories.map(c => c.toLowerCase());
  const attrs = attributeValues(p);
  const desc = p.description.toLowerCase();

  for (const term of words(q.text ?? '')) {
    if (title.includes(term)) { score += WEIGHT.title; matched.push(`title: ${term}`); }
    else if (cats.some(c => c.includes(term))) { score += WEIGHT.category; matched.push(`category: ${term}`); }
    else if (attrs.some(a => a.includes(term))) { score += WEIGHT.attribute; matched.push(`${term}`); }
    else if (desc.includes(term)) { score += WEIGHT.description; }
  }

  for (const sig of q.signals ?? []) {
    const value = sig.value.toLowerCase();
    if (sig.key === 'avoid') {
      if (title.includes(value) || attrs.some(a => a.includes(value)) || desc.includes(value)) {
        score += WEIGHT.avoid;
        matched.push(`contains ${value}, which they asked to avoid`);
      }
      continue;
    }
    /* The merchant models this attribute and the value matches: the
       strongest signal there is, because it is fitment rather than prose. */
    const named = p.attributes[sig.key.toLowerCase()];
    if (named && named.some(v => v.toLowerCase() === value)) {
      score += WEIGHT.attribute;
      matched.push(`${sig.key}: ${sig.value}`);
    } else if (attrs.some(a => a === value)) {
      score += WEIGHT.attribute;
      matched.push(`${sig.key}: ${sig.value}`);
    } else if (title.includes(value) || cats.some(c => c.includes(value))) {
      score += WEIGHT.category;
      matched.push(`${sig.key}: ${sig.value}`);
    }
  }

  /* Price is a hint here, never a quote. The tool layer reads the real
     one before this product is shown to anybody. */
  if (q.maxPrice && p.price.amount <= q.maxPrice.amount) {
    score += WEIGHT.inBudget;
    matched.push('within the stated budget');
  }

  return { score, matched };
}

export function rank(entries: readonly CatalogEntry[], q: Query): readonly Candidate[] {
  const limit = q.limit ?? 5;

  return entries
    .filter(e => {
      const p = e.product;
      if (q.inStockOnly && !p.inStock) return false;
      if (q.categories?.length &&
          !q.categories.some(c => p.categories.some(pc => pc.toLowerCase() === c.toLowerCase()))) return false;
      /* Over budget is out. Under a stated minimum is not: a cheaper thing
         that fits is a good answer, and the customer can say no. */
      if (q.maxPrice && p.price.amount > q.maxPrice.amount * 1.15) return false;
      return true;
    })
    .map(e => ({ productId: e.product.id, ...scoreOne(e.product, q) }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score || a.productId.localeCompare(b.productId))
    .slice(0, limit);
}
