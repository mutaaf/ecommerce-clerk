/* One entry per store category. Drives the hero headline, the before
   and after panels and the full conversation panel. */

/* Each demo drives the h1 AND the panel. The h1 is the customer's
   opening sentence, so switching intents rewrites the headline. */
/* One per store category. `pain` is the merchant-facing reason this
   category needs it. Adding a category is one entry, nothing else. */
export const demos = [
  { chip:"Sporting goods", store:"Sideline Sports Co.", order:"$104.00", items:1,
    pain:"Parents buying for a kid they cannot measure",
    turns:[
    { who:"c", text:"My son just joined a competitive team. He's 9, plays point guard indoors, has wide feet, and I need to stay under $120." },
    { who:"a", text:"Indoor guard shoe, wide fit, room to grow. Let me check what's in stock in his size.",
      parse:["sport: basketball","age: 9","position: guard","fit: wide","budget: under $120"] },
    { who:"a", text:"Three that fit. The first is my pick, lightest of the three and cut for quick guards.",
      products:[
        {n:"Ryse Court Low",m:"Youth 4W · in stock",p:"$104",c:"proof",i:"01",best:true},
        {n:"Anchor Pro 2",m:"Youth 4W · in stock",p:"$118",c:"intent",i:"02"},
        {n:"Baseline GT",m:"Youth 4 · 2 left",p:"$89",c:"flag",i:"03"} ] },
    { who:"c", text:"What's the difference between the first two?" },
    { who:"a", text:"The Anchor sits higher with more cushioning, better for a forward taking contact. The Ryse is 60g lighter with a flatter outsole, which is what a guard changing direction wants." },
    { who:"c", text:"The first one, wide, size 4." },
    { who:"a", text:"Added. Ryse Court Low, youth 4 wide. Free shipping starts at $100 so you're covered.",
      cart:{line:"Ryse Court Low · 4W",price:"$104.00",ship:"Free",total:"$104.00"} }
  ]},

  { chip:"Auto parts", store:"Rowan Auto Parts", order:"$187.40", items:2,
    pain:"Wrong fitment returns eating your margin",
    turns:[
    { who:"c", text:"I need front brake pads for a 2014 Silverado 1500, 4WD. It's my work truck so I tow a lot." },
    { who:"a", text:"Towing changes the answer here. The 4WD and the 6-lug versus 8-lug matter for this year, so let me confirm fitment before I recommend anything.",
      parse:["year: 2014","vehicle: Silverado 1500","drive: 4WD","use: towing"] },
    { who:"a", text:"Confirmed fitment for yoursetup. For towing I'd skip the ceramic economy set, it fades under load.",
      products:[
        {n:"Severe Duty Semi-Met Pads",m:"verified fit · in stock",p:"$118",c:"proof",i:"01",best:true},
        {n:"Ceramic Street Pads",m:"verified fit · in stock",p:"$74",c:"intent",i:"02"},
        {n:"Front Rotor Pair",m:"pairs with either set",p:"$69",c:"flag",i:"03"} ] },
    { who:"c", text:"Do I need the rotors too?" },
    { who:"a", text:"Only if yours are below spec or you feel a pulse in the pedal. If they've never been turned at 90k miles, most shops replace rather than resurface." },
    { who:"c", text:"Add the severe duty pads and the rotors." },
    { who:"a", text:"Added, both verified against your truck. Nothing in this cart can be a wrong-fit return.",
      cart:{line:"Pads + front rotor pair",price:"$187.00",ship:"Free",total:"$187.40"} }
  ]},

  { chip:"Beauty & skincare", store:"Lumen Skin", order:"$96.00", items:2,
    pain:"Customers guessing at their own skin type",
    turns:[
    { who:"c", text:"My skin is oily in the T-zone but flaky on my cheeks, and everything with fragrance makes me red. I have no idea what to buy." },
    { who:"a", text:"That's combination skin with a sensitivity flag, which rules out a lot of what's popular right now. I'll keep everything fragrance free.",
      parse:["type: combination","concern: sensitivity","avoid: fragrance","stage: first routine"] },
    { who:"a", text:"Start with two, not five. Adding one product at a time is how you find out what your skin actually reacts to.",
      products:[
        {n:"Barrier Gel Cleanser",m:"fragrance free · in stock",p:"$28",c:"proof",i:"01",best:true},
        {n:"Lightweight Ceramide Cream",m:"fragrance free · in stock",p:"$68",c:"intent",i:"02"},
        {n:"10% Niacinamide Serum",m:"add later, not now",p:"$34",c:"flag",i:"03"} ] },
    { who:"c", text:"Why not the serum too?" },
    { who:"a", text:"Because if something stings you won't know which product did it. Give these two three weeks, then add the serum. It'll still be here." },
    { who:"c", text:"That's actually helpful. Both please." },
    { who:"a", text:"Added. Cleanser and moisturiser, both fragrance free.",
      cart:{line:"Cleanser + ceramide cream",price:"$96.00",ship:"Free",total:"$96.00"} }
  ]},

  { chip:"Home improvement", store:"Beckett Hardware", order:"$142.85", items:3,
    pain:"How much do I need, asked forty times a day",
    turns:[
    { who:"c", text:"Painting my living room, roughly 14 by 18 with 9 foot ceilings. One accent wall in a dark navy over beige. How much do I need?" },
    { who:"a", text:"About 576 square feet of wall. Dark over light needs primer or you'll be doing four coats.",
      parse:["room: 14x18","ceiling: 9ft","coverage: ~576 sq ft","note: dark over light"] },
    { who:"a", text:"Two gallons for the main walls, one quart plus primer for the accent. That's sized to your room, not a guess.",
      products:[
        {n:"Interior Eggshell, 2 gal",m:"tinted to order",p:"$96",c:"proof",i:"01",best:true},
        {n:"Bonding Primer, 1 qt",m:"required for navy",p:"$21",c:"intent",i:"02"},
        {n:"Roller + tray kit",m:"9in, for eggshell",p:"$26",c:"flag",i:"03"} ] },
    { who:"c", text:"Do I really need primer for one wall?" },
    { who:"a", text:"For navy over beige, yes. Without it you're buying a third gallon of navy, which costs more than the primer." },
    { who:"c", text:"Fair. All three." },
    { who:"a", text:"Added, sized to your room. No second trip.",
      cart:{line:"Paint + primer + kit",price:"$143.00",ship:"Store pickup",total:"$142.85"} }
  ]},

  { chip:"Pet supplies", store:"Barkwell Pet Co.", order:"$78.99", items:1,
    pain:"Ingredient questions your team answers all week",
    turns:[
    { who:"c", text:"My lab is 11 now, slowing down on walks, and chicken gives her itchy skin. She's about 70 pounds." },
    { who:"a", text:"Senior, large breed, chicken sensitivity. Joint support matters at 11, and a lot of \"limited ingredient\" foods still use chicken fat.",
      parse:["age: senior","weight: 70lb","avoid: chicken","need: joint support"] },
    { who:"a", text:"These three are genuinely chicken free, fat included. I checked.",
      products:[
        {n:"Senior Salmon & Oat, 24lb",m:"no chicken · in stock",p:"$79",c:"proof",i:"01",best:true},
        {n:"Lamb Limited Ingredient, 22lb",m:"no chicken · in stock",p:"$74",c:"intent",i:"02"},
        {n:"Joint Support Chews",m:"add on",p:"$32",c:"flag",i:"03"} ] },
    { who:"c", text:"Will switching upset her stomach?" },
    { who:"a", text:"Usually if you switch fast. Mix a quarter new with three quarters old for four days, then half and half. A 24lb bag gives you room to do it properly." },
    { who:"c", text:"The salmon one." },
    { who:"a", text:"Added. Chicken free including the fat source.",
      cart:{line:"Senior Salmon & Oat · 24lb",price:"$79.00",ship:"Free",total:"$78.99"} }
  ]},

  { chip:"Electronics", store:"Northline Electronics", order:"$849.00", items:1,
    pain:"Spec sheets no customer can decode",
    turns:[
    { who:"c", text:"Laptop for my daughter starting a graphic design program. Budget is around $900 and I don't understand any of the specs." },
    { who:"a", text:"For design the two that matter are memory and screen colour accuracy. Processor differences barely show up in her work.",
      parse:["use: graphic design","budget: ~$900","buyer: parent","priority: needs guidance"] },
    { who:"a", text:"Skip the gaming machines. She needs 16GB and a good panel, not a fast GPU.",
      products:[
        {n:"Aster 14 · 16GB / 512GB",m:"100% sRGB panel · in stock",p:"$849",c:"proof",i:"01",best:true},
        {n:"Aster 14 · 8GB / 256GB",m:"same screen, less memory",p:"$699",c:"intent",i:"02"},
        {n:"Vantage Gaming 15",m:"fast, wrong tool",p:"$899",c:"flag",i:"03"} ] },
    { who:"c", text:"Is the cheaper one really that different?" },
    { who:"a", text:"For a design program, yes. 8GB means Illustrator and Photoshop open together will crawl, and memory isn't upgradeable on this model. It's the one spec worth the extra $150." },
    { who:"c", text:"Then the 16GB one." },
    { who:"a", text:"Added. She'll be fine for the whole program on this.",
      cart:{line:"Aster 14 · 16GB / 512GB",price:"$849.00",ship:"Free",total:"$849.00"} }
  ]}
];
