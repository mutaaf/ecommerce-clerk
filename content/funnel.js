/* The funnel simulator. Knobs are the four numbers a merchant already
   knows; every stage derives from the knobs above it. */

/* Funnel simulator. Each knob is min/max/default/step plus a formatter.
   `funnel` derives each stage from the knobs above it. */
export const knobs = [
  { id:"sessions", label:"Monthly store sessions", min:2000, max:400000, step:1000, val:60000, fmt:v=>v.toLocaleString() },
  { id:"engage",   label:"Share who open the assistant", min:2, max:40, step:1, val:12, fmt:v=>v+"%" },
  { id:"convert",  label:"Of those, share who buy", min:1, max:25, step:1, val:8, fmt:v=>v+"%" },
  { id:"aov",      label:"Average order value", min:20, max:600, step:5, val:120, fmt:v=>"$"+v }
];

export const funnel = [
  { k:"Store sessions",     from:k=>k.sessions,                          c:"stage-1" },
  { k:"Open the assistant", from:k=>k.sessions*k.engage/100,             c:"stage-2" },
  { k:"Get a recommendation", from:k=>k.sessions*k.engage/100*0.78,      c:"stage-3" },
  { k:"Add to cart",        from:k=>k.sessions*k.engage/100*k.convert/100*1.6, c:"stage-4" },
  { k:"Order",              from:k=>k.sessions*k.engage/100*k.convert/100,     c:"stage-5" }
];
