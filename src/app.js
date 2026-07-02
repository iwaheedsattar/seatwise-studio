(function () {
  const planner = window.seatwisePlanner || require("./planner");
  const form = document.querySelector("#eventForm");
  const guestText = document.querySelector("#guestText");
  const planButton = document.querySelector("#planButton");
  const copyButton = document.querySelector("#copyButton");
  let currentPlan = null;

  guestText.value = planner.DEFAULT_GUESTS;

  function readEvent() {
    const data = new FormData(form);
    return {
      title: data.get("title"),
      date: data.get("date"),
      startTime: data.get("startTime"),
      hostName: "Host",
      budget: Number(data.get("budget")),
      tableSize: Number(data.get("tableSize")),
      tone: "warm",
      mealStyle: "shared dinner",
      notes: data.get("notes")
    };
  }

  function currency(value) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
  }

  function renderPlan(plan) {
    currentPlan = plan;
    document.querySelector("#eventTitle").textContent = plan.event.title || "Hosting Plan";
    document.querySelector("#comfortScore").textContent = plan.comfortScore;
    document.querySelector("#guestCount").textContent = plan.guests.length;
    document.querySelector("#budgetPerGuest").textContent = currency(plan.budget.perGuest);
    document.querySelector("#watchoutCount").textContent = plan.warnings.length;
    document.querySelector("#tableCount").textContent = `${plan.tables.length} ${plan.tables.length === 1 ? "table" : "tables"}`;

    document.querySelector("#tables").innerHTML = plan.tables.map((table) => `
      <article class="table-card">
        <div class="table-card-header">
          <h4>${escapeHtml(table.name)}</h4>
          <span>${table.guests.length} seats</span>
        </div>
        <div class="guest-stack">
          ${table.guests.map((guest) => `
            <div class="guest-chip">
              <strong>${escapeHtml(guest.name)}</strong>
              <span>${escapeHtml(guest.dietary || "none")}</span>
            </div>
          `).join("")}
        </div>
        ${table.strengths.length ? `<p class="card-note">Anchors: ${escapeHtml(table.strengths.join(", "))}</p>` : ""}
        ${table.warnings.length ? `<p class="card-warning">${escapeHtml(table.warnings.join("; "))}</p>` : ""}
      </article>
    `).join("");

    document.querySelector("#guardrails").innerHTML = plan.guardrails
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("");

    document.querySelector("#budgetLines").innerHTML = plan.budget.lines.map((line) => `
      <div class="budget-line">
        <span>${escapeHtml(line.label)}</span>
        <strong>${currency(line.amount)}</strong>
      </div>
    `).join("");

    document.querySelector("#timeline").innerHTML = plan.timeline.map((step) => `
      <li>
        <span>${escapeHtml(step.when)}</span>
        <p>${escapeHtml(step.task)}</p>
      </li>
    `).join("");

    document.querySelector("#prompts").innerHTML = plan.prompts.map((item) => `
      <article class="prompt-card">
        <strong>${escapeHtml(item.table)}</strong>
        <p>${escapeHtml(item.prompt)}</p>
      </article>
    `).join("");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function buildPlan() {
    renderPlan(planner.planEvent(readEvent(), guestText.value));
  }

  planButton.addEventListener("click", buildPlan);
  form.addEventListener("input", buildPlan);
  guestText.addEventListener("input", buildPlan);
  copyButton.addEventListener("click", async () => {
    if (!currentPlan) buildPlan();
    await navigator.clipboard.writeText(currentPlan.markdown);
    copyButton.textContent = "Copied";
    setTimeout(() => {
      copyButton.textContent = "Copy brief";
    }, 1200);
  });

  buildPlan();
})();
