const { DEFAULT_GUESTS, SAMPLE_EVENT, planEvent } = require("../src/planner");

const plan = planEvent(SAMPLE_EVENT, DEFAULT_GUESTS);

console.log(`${plan.event.title}: ${plan.guests.length} guests, ${plan.tables.length} tables`);
console.log(`Comfort score: ${plan.comfortScore}/100`);
console.log(plan.markdown.split("\n").slice(0, 14).join("\n"));
