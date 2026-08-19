/* Scripted fallback for the hero input. Used verbatim when the model
   call fails or runs long, so a live demo never shows an error. */

/* Signal extraction for the hero input. Each rule is a label plus a
   matcher; add a rule and the parser picks it up with no code change. */
export const signals = [
  { k:"budget",     re:/(?:under|below|less than|max(?:imum)?|up to|around|about|within)?\s*\$\s?(\d{1,3}(?:,\d{3})*|\d+)/i, fmt:m=>"budget: $"+m[1] },
  { k:"age",        re:/\b(?:he'?s|she'?s|they'?re|aged?)?\s*(\d{1,2})\s*(?:years? old|yrs?|yo)\b|\bhe'?s (\d{1,2})\b|\bshe'?s (\d{1,2})\b/i, fmt:m=>"age: "+(m[1]||m[2]||m[3]) },
  { k:"frequency",  re:/(\d+|once|twice|three times|four times)\s*(?:times?\s*)?(?:a|per|each)\s*(week|month|day)/i, fmt:m=>"frequency: "+m[1]+" per "+m[2] },
  { k:"recipient",  re:/\b(son|daughter|wife|husband|kid|child|brother|sister|friend|dad|mom|myself|nephew|niece)\b/i, fmt:m=>"recipient: "+m[1].toLowerCase() },
  { k:"level",      re:/\b(beginner|new to|just started|intermediate|advanced|competitive|serious|casual|pro)\b/i, fmt:m=>"level: "+m[1].toLowerCase() },
  { k:"fit",        re:/\b(wide|narrow|slim|tall|petite|plus size|extra wide)\b/i, fmt:m=>"fit: "+m[1].toLowerCase() },
  { k:"setting",    re:/\b(indoor|outdoor|home|gym|backyard|travel|office|trail|road)\b/i, fmt:m=>"setting: "+m[1].toLowerCase() },
  { k:"occasion",   re:/\b(gift|birthday|christmas|present|anniversary|wedding)\b/i, fmt:m=>"occasion: "+m[1].toLowerCase() },
  { k:"urgency",    re:/\b(today|tomorrow|this week|asap|urgent|by (?:friday|monday|saturday|sunday))\b/i, fmt:m=>"urgency: "+m[1].toLowerCase() },
  { k:"problem",    re:/\b(broken|worn|slipping|replace|replacement|repair|stopped working|too small|too big)\b/i, fmt:m=>"intent: replacement" }
];

export const stop = "i we my our a an the and or but for with to of need needs want wants looking look get got buy buying he she they him her his their that this is are was were it its im i'm just really very some any what which can could would should about please thanks hi hello".split(" ");
