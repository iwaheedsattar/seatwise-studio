const DEFAULT_GUESTS = `Avery | vegetarian | close: Maya, Theo | avoid: Jordan | note: loves board games
Maya | gluten-free | close: Avery, Priya | avoid: | note: quiet at first
Theo | no pork | close: Avery, Sam | avoid: | note: arrives late
Jordan | none | close: Lena | avoid: Avery | note: high energy
Priya | vegan | close: Maya, Lena | avoid: | note: brings dessert
Sam | dairy-free | close: Theo | avoid: | note: new to group
Lena | none | close: Jordan, Priya | avoid: | note: great with introductions
Nico | shellfish allergy | close: Sam | avoid: | note: needs parking info`;

const SAMPLE_EVENT = {
  title: "Saturday Supper Club",
  date: "2026-07-18",
  startTime: "18:30",
  hostName: "Haider",
  budget: 220,
  tableSize: 4,
  tone: "warm",
  mealStyle: "shared dinner",
  notes: "Small apartment, one oven, want low-stress prep and a good mix of old and new friends."
};

function parseGuestLine(line, index) {
  const parts = line.split("|").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return null;
  const guest = {
    id: `g${index + 1}`,
    name: parts[0],
    dietary: "none",
    close: [],
    avoid: [],
    note: ""
  };

  for (const part of parts.slice(1)) {
    const lower = part.toLowerCase();
    if (lower.startsWith("close:")) {
      guest.close = splitNames(part.slice(part.indexOf(":") + 1));
    } else if (lower.startsWith("avoid:")) {
      guest.avoid = splitNames(part.slice(part.indexOf(":") + 1));
    } else if (lower.startsWith("note:")) {
      guest.note = part.slice(part.indexOf(":") + 1).trim();
    } else {
      guest.dietary = part || "none";
    }
  }

  return guest;
}

function splitNames(value) {
  return value.split(",").map((name) => name.trim()).filter(Boolean);
}

function parseGuests(text) {
  return text
    .split(/\r?\n/)
    .map((line, index) => parseGuestLine(line, index))
    .filter(Boolean);
}

function normalizeName(value) {
  return value.trim().toLowerCase();
}

function buildNameMap(guests) {
  return new Map(guests.map((guest) => [normalizeName(guest.name), guest]));
}

function scorePair(a, b) {
  const bName = normalizeName(b.name);
  const aName = normalizeName(a.name);
  const aClose = a.close.map(normalizeName);
  const bClose = b.close.map(normalizeName);
  const aAvoid = a.avoid.map(normalizeName);
  const bAvoid = b.avoid.map(normalizeName);
  let score = 0;
  const reasons = [];

  if (aClose.includes(bName) || bClose.includes(aName)) {
    score += 4;
    reasons.push("known friendly pair");
  }
  if (aAvoid.includes(bName) || bAvoid.includes(aName)) {
    score -= 8;
    reasons.push("requested separation");
  }
  if (a.dietary !== "none" && b.dietary !== "none" && a.dietary === b.dietary) {
    score += 1;
    reasons.push("shared menu need");
  }

  return { score, reasons };
}

function scoreTable(table) {
  let score = 0;
  const warnings = [];
  const strengths = [];

  for (let i = 0; i < table.length; i += 1) {
    for (let j = i + 1; j < table.length; j += 1) {
      const pair = scorePair(table[i], table[j]);
      score += pair.score;
      if (pair.reasons.includes("requested separation")) {
        warnings.push(`${table[i].name} and ${table[j].name} asked for distance`);
      }
      if (pair.reasons.includes("known friendly pair")) {
        strengths.push(`${table[i].name} + ${table[j].name}`);
      }
    }
  }

  const uniqueNeeds = new Set(table.map((guest) => guest.dietary).filter((need) => need !== "none"));
  score += Math.max(0, 3 - uniqueNeeds.size);
  return { score, warnings, strengths };
}

function assignTables(guests, tableSize) {
  const size = Math.max(2, Math.min(8, Number(tableSize) || 4));
  const sorted = [...guests].sort((a, b) => {
    const aNeeds = a.dietary === "none" ? 0 : 1;
    const bNeeds = b.dietary === "none" ? 0 : 1;
    return bNeeds - aNeeds || b.close.length + b.avoid.length - (a.close.length + a.avoid.length);
  });
  const tableCount = Math.max(1, Math.ceil(sorted.length / size));
  const tables = Array.from({ length: tableCount }, () => []);

  for (const guest of sorted) {
    let best = { index: 0, score: -Infinity };
    tables.forEach((table, index) => {
      if (table.length >= size) return;
      const candidate = [...table, guest];
      const tableScore = scoreTable(candidate).score;
      const balancePenalty = table.length * 0.35;
      const score = tableScore - balancePenalty;
      if (score > best.score) best = { index, score };
    });
    tables[best.index].push(guest);
  }

  return tables.map((table, index) => ({
    name: `Table ${index + 1}`,
    guests: table,
    ...scoreTable(table)
  }));
}

function dietarySummary(guests) {
  const counts = new Map();
  for (const guest of guests) {
    const need = guest.dietary || "none";
    counts.set(need, (counts.get(need) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => (a[0] === "none" ? 1 : b[0] === "none" ? -1 : b[1] - a[1]))
    .map(([need, count]) => ({ need, count }));
}

function menuGuardrails(dietary) {
  const needs = dietary.filter((item) => item.need !== "none").map((item) => item.need.toLowerCase());
  const guardrails = ["Label every dish before guests arrive."];
  if (needs.some((need) => need.includes("vegan") || need.includes("vegetarian"))) {
    guardrails.push("Make the main side plant-forward so nobody gets a token substitute.");
  }
  if (needs.some((need) => need.includes("gluten"))) {
    guardrails.push("Keep one sauce, starch, and dessert path gluten-free from the start.");
  }
  if (needs.some((need) => need.includes("allergy") || need.includes("shellfish"))) {
    guardrails.push("Avoid cross-contact by serving allergen-sensitive items with separate utensils.");
  }
  if (needs.some((need) => need.includes("dairy"))) {
    guardrails.push("Use olive oil or a dairy-free spread for shared vegetables and bread.");
  }
  return guardrails;
}

function buildTimeline(event, guests) {
  const guestCount = guests.length;
  const large = guestCount >= 8;
  return [
    { when: "3 days before", task: "Confirm final guest count and collect any missing dietary notes." },
    { when: "2 days before", task: `Shop shelf-stable items and drinks for ${guestCount} guests.` },
    { when: "1 day before", task: large ? "Prep two make-ahead dishes and clear serving surfaces." : "Prep sauces, dessert, and the entry area." },
    { when: "Morning of", task: "Set tables, label seats, chill drinks, and stage serving platters." },
    { when: "2 hours before", task: "Cook the main dish, warm sides, and put labeled dietary cards out." },
    { when: "30 minutes before", task: "Start music, set first drinks by the door, and review the seating plan." },
    { when: "After guests leave", task: "Save notes on what worked, what ran out, and who to thank tomorrow." }
  ].map((step, index) => ({ ...step, id: `t${index + 1}`, owner: event.hostName || "Host" }));
}

function buildBudget(event, guests) {
  const budget = Math.max(0, Number(event.budget) || 0);
  const guestCount = Math.max(1, guests.length);
  const food = Math.round(budget * 0.56);
  const drinks = Math.round(budget * 0.22);
  const supplies = Math.round(budget * 0.12);
  const buffer = Math.max(0, budget - food - drinks - supplies);
  return {
    total: budget,
    perGuest: Math.round((budget / guestCount) * 100) / 100,
    lines: [
      { label: "Food", amount: food },
      { label: "Drinks", amount: drinks },
      { label: "Flowers, candles, ice, supplies", amount: supplies },
      { label: "Buffer", amount: buffer }
    ]
  };
}

function buildConversationPrompts(tables) {
  return tables.map((table) => {
    const notes = table.guests.map((guest) => guest.note).filter(Boolean);
    const prompt = notes.length
      ? `Ask about ${notes[0].replace(/\.$/, "")}; let ${table.guests[0].name} open the thread.`
      : "Start with a recent local recommendation or a low-pressure weekend question.";
    return { table: table.name, prompt };
  });
}

function planEvent(event, guestText) {
  const guests = parseGuests(guestText);
  const tables = assignTables(guests, event.tableSize);
  const dietary = dietarySummary(guests);
  const budget = buildBudget(event, guests);
  const timeline = buildTimeline(event, guests);
  const guardrails = menuGuardrails(dietary);
  const prompts = buildConversationPrompts(tables);
  const warnings = tables.flatMap((table) => table.warnings);
  const comfortScore = Math.max(45, Math.min(98, 86 + tables.reduce((sum, table) => sum + table.score, 0) - warnings.length * 7));

  return {
    event: { ...event },
    guests,
    tables,
    dietary,
    budget,
    timeline,
    guardrails,
    prompts,
    warnings,
    comfortScore,
    markdown: toMarkdown({ event, guests, tables, dietary, budget, timeline, guardrails, prompts, warnings, comfortScore })
  };
}

function toMarkdown(plan) {
  const lines = [
    `# ${plan.event.title || "Hosting Plan"}`,
    "",
    `Date: ${plan.event.date || "TBD"} at ${plan.event.startTime || "TBD"}`,
    `Guests: ${plan.guests.length}`,
    `Budget: $${plan.budget.total} ($${plan.budget.perGuest} per guest)`,
    `Comfort score: ${plan.comfortScore}/100`,
    "",
    "## Seating",
    ...plan.tables.flatMap((table) => [
      `- ${table.name}: ${table.guests.map((guest) => guest.name).join(", ")}`,
      table.strengths.length ? `  Friendly anchors: ${table.strengths.join("; ")}` : ""
    ]).filter(Boolean),
    "",
    "## Dietary Notes",
    ...plan.dietary.map((item) => `- ${item.need}: ${item.count}`),
    "",
    "## Prep Timeline",
    ...plan.timeline.map((step) => `- ${step.when}: ${step.task}`),
    "",
    "## Menu Guardrails",
    ...plan.guardrails.map((item) => `- ${item}`),
    "",
    "## Conversation Starters",
    ...plan.prompts.map((item) => `- ${item.table}: ${item.prompt}`)
  ];

  if (plan.warnings.length) {
    lines.push("", "## Seating Watchouts", ...plan.warnings.map((warning) => `- ${warning}`));
  }

  return lines.join("\n");
}

const api = {
  DEFAULT_GUESTS,
  SAMPLE_EVENT,
  parseGuests,
  assignTables,
  dietarySummary,
  planEvent,
  scorePair
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}

if (typeof window !== "undefined") {
  window.seatwisePlanner = api;
}
