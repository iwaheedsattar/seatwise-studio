const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_GUESTS,
  SAMPLE_EVENT,
  parseGuests,
  assignTables,
  dietarySummary,
  planEvent,
  scorePair
} = require("../src/planner");

test("parses guest notes, close pairs, avoid pairs, and dietary needs", () => {
  const guests = parseGuests(DEFAULT_GUESTS);
  assert.equal(guests.length, 8);
  assert.equal(guests[0].name, "Avery");
  assert.equal(guests[0].dietary, "vegetarian");
  assert.deepEqual(guests[0].close, ["Maya", "Theo"]);
  assert.deepEqual(guests[0].avoid, ["Jordan"]);
});

test("friendly pairs score higher than requested separations", () => {
  const [avery, maya] = parseGuests("Avery | none | close: Maya\nMaya | none");
  const [jordan, lena] = parseGuests("Jordan | none | avoid: Lena\nLena | none");
  assert.ok(scorePair(avery, maya).score > 0);
  assert.ok(scorePair(jordan, lena).score < 0);
});

test("assigns guests without exceeding table size", () => {
  const guests = parseGuests(DEFAULT_GUESTS);
  const tables = assignTables(guests, 4);
  assert.equal(tables.length, 2);
  assert.ok(tables.every((table) => table.guests.length <= 4));
});

test("builds a complete hosting plan with markdown export", () => {
  const plan = planEvent(SAMPLE_EVENT, DEFAULT_GUESTS);
  assert.equal(plan.guests.length, 8);
  assert.ok(plan.guardrails.length >= 3);
  assert.ok(plan.timeline.length >= 6);
  assert.ok(plan.markdown.includes("## Seating"));
  assert.ok(plan.comfortScore >= 45);
});

test("summarizes dietary needs", () => {
  const summary = dietarySummary(parseGuests(DEFAULT_GUESTS));
  assert.ok(summary.some((item) => item.need === "vegan" && item.count === 1));
  assert.ok(summary.some((item) => item.need === "none" && item.count === 2));
});
