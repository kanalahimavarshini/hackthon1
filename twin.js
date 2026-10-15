const machines = [
  { id: "motor", name: "Production Motor", zone: "Zone A", power: 5, hours: 8, on: true, icon: "⚙️" },
  { id: "hvac", name: "Ventilation System", zone: "Zone B", power: 3, hours: 8, on: true, icon: "💨" },
  { id: "lights", name: "Factory Lighting", zone: "Zone C", power: 2, hours: 10, on: true, icon: "💡" }
];

const EMISSION_FACTOR = 0.7; // Illustrative kg CO₂ per kWh
const ELECTRICITY_RATE = 8;  // Illustrative ₹ per kWh

function renderTwin() {
  const root = document.getElementById("digital-twin-root");
  if (!root) return;

  root.innerHTML = `
    <div class="twin-heading">
      <div>
        <p class="twin-eyebrow">CARBONIQ / DIGITAL TWIN</p>
        <h2>Virtual Factory</h2>
        <p>Simulate equipment usage and explore energy-saving scenarios.</p>
      </div>
      <span class="twin-demo-badge">● DEMO SIMULATION</span>
    </div>

    <div class="twin-metrics">
      <div class="twin-metric">
        <span>Daily energy</span>
        <strong id="twin-energy">—</strong>
        <small>kWh per day</small>
      </div>
      <div class="twin-metric">
        <span>Estimated emissions</span>
        <strong id="twin-carbon">—</strong>
        <small>kg CO₂ per day</small>
      </div>
      <div class="twin-metric">
        <span>Estimated daily cost</span>
        <strong id="twin-cost">—</strong>
        <small>At ₹8 per kWh</small>
      </div>
    </div>

    <div class="twin-factory">
      <div class="twin-factory-top">
        <div>
          <span class="twin-eyebrow">FACILITY MODEL</span>
          <h3>Production Floor</h3>
        </div>
        <span class="twin-live"><span></span> SIMULATED STATUS</span>
      </div>
      <div class="twin-floor">
        ${machines.map(m => `
          <div class="twin-machine ${m.on ? "is-on" : "is-off"}" id="machine-${m.id}">
            <div class="twin-machine-icon">${m.icon}</div>
            <strong>${m.name}</strong>
            <span>${m.zone} · ${m.power} kW rated</span>
            <span class="twin-status">${m.on ? "● Running" : "○ Off"}</span>
          </div>
        `).join("")}
      </div>
    </div>

    <div class="twin-controls">
      <div class="twin-controls-title">
        <div>
          <span class="twin-eyebrow">SCENARIO CONTROLS</span>
          <h3>Adjust equipment</h3>
        </div>
        <button type="button" class="twin-reset" id="twin-reset">Reset</button>
      </div>
      ${machines.map(m => `
        <div class="twin-control" id="control-${m.id}">
          <div class="twin-control-top">
            <div>
              <strong>${m.name}</strong>
              <p>${m.power} kW rated power</p>
            </div>
            <label class="twin-switch">
              <input type="checkbox" data-machine="${m.id}" ${m.on ? "checked" : ""}>
              <span class="twin-switch-track"></span>
              <span class="twin-switch-label">${m.on ? "ON" : "OFF"}</span>
            </label>
          </div>
          <div class="twin-hours">
            <label for="hours-${m.id}">Operating hours</label>
            <strong><span id="hours-value-${m.id}">${m.hours}</span> h/day</strong>
          </div>
          <input class="twin-range" id="hours-${m.id}" data-hours="${m.id}"
            type="range" min="0" max="24" value="${m.hours}">
        </div>
      `).join("")}
    </div>

    <div class="twin-results">
      <span class="twin-eyebrow">SIMULATION RESULTS</span>
      <h3>Energy impact</h3>
      <div class="twin-bar-row">
        <span>Current scenario</span>
        <div class="twin-bar"><span id="twin-bar-current"></span></div>
        <strong id="twin-current-label">—</strong>
      </div>
      <div class="twin-bar-row">
        <span>All machines on</span>
        <div class="twin-bar"><span id="twin-bar-base"></span></div>
        <strong id="twin-base-label">—</strong>
      </div>
      <div class="twin-saving" id="twin-saving">Change the controls to explore a scenario.</div>
      <p class="twin-disclaimer">
        Illustrative model only. Machine ratings, emission factor and electricity
        price are sample values, not readings from real equipment.
      </p>
    </div>
  `;

  root.querySelectorAll("[data-machine]").forEach(input => {
    input.addEventListener("change", () => {
      const machine = machines.find(m => m.id === input.dataset.machine);
      machine.on = input.checked;
      renderTwin();
    });
  });

  root.querySelectorAll("[data-hours]").forEach(input => {
    input.addEventListener("input", () => {
      const machine = machines.find(m => m.id === input.dataset.hours);
      machine.hours = Number(input.value);
      const label = root.querySelector(`#hours-value-${machine.id}`);
      if (label) label.textContent = machine.hours;
      updateTwinResults();
    });
  });

  root.querySelector("#twin-reset").addEventListener("click", () => {
    const defaults = [
      { on: true, hours: 8 },
      { on: true, hours: 8 },
      { on: true, hours: 10 }
    ];
    machines.forEach((m, i) => Object.assign(m, defaults[i]));
    renderTwin();
  });

  updateTwinResults();
}

function updateTwinResults() {
  const root = document.getElementById("digital-twin-root");
  if (!root) return;

  const energy = machines.reduce(
    (sum, m) => sum + (m.on ? m.power * m.hours : 0), 0
  );

  const baseline = machines.reduce(
    (sum, m) => sum + m.power * m.hours, 0
  );

  const carbon = energy * EMISSION_FACTOR;
  const cost = energy * ELECTRICITY_RATE;
  const savedEnergy = Math.max(0, baseline - energy);
  const maxEnergy = Math.max(baseline, 1);
  const percentSaved = baseline > 0 ? savedEnergy / baseline * 100 : 0;

  root.querySelector("#twin-energy").textContent =
    energy.toLocaleString() + " kWh";
  root.querySelector("#twin-carbon").textContent =
    carbon.toFixed(1) + " kg";
  root.querySelector("#twin-cost").textContent =
    "₹" + cost.toLocaleString(undefined, { maximumFractionDigits: 2 });

  root.querySelector("#twin-current-label").textContent = energy + " kWh";
  root.querySelector("#twin-base-label").textContent = baseline + " kWh";
  root.querySelector("#twin-bar-current").style.width =
    Math.min(100, energy / maxEnergy * 100) + "%";
  root.querySelector("#twin-bar-base").style.width = "100%";

  root.querySelector("#twin-saving").textContent = savedEnergy > 0
    ? `Scenario saves ${savedEnergy.toFixed(1)} kWh/day (${percentSaved.toFixed(1)}%) and an estimated ${(savedEnergy * EMISSION_FACTOR).toFixed(1)} kg CO₂/day.`
    : "No energy reduction versus the baseline. Switch off a machine or reduce its operating hours to test a saving.";

  machines.forEach(m => {
    const card = root.querySelector(`#machine-${m.id}`);
    if (card) {
      card.classList.toggle("is-on", m.on);
      card.classList.toggle("is-off", !m.on);
      card.querySelector(".twin-status").textContent =
        m.on ? "● Running" : "○ Off";
    }
    const switchLabel = root.querySelector(
      `#control-${m.id} .twin-switch-label`
    );
    if (switchLabel) switchLabel.textContent = m.on ? "ON" : "OFF";
  });
}

document.addEventListener("DOMContentLoaded", renderTwin);