// CarbonIQ — website interactions

const $ = (id) => document.getElementById(id);

// Page navigation
document.querySelectorAll(".nav").forEach((button) => {
  button.addEventListener("click", () => {
    const pageName = button.dataset.page;

    document.querySelectorAll(".page").forEach((page) => {
      page.classList.toggle("active", page.id === pageName);
    });

    document.querySelectorAll(".nav").forEach((nav) => {
      nav.classList.toggle("active", nav === button);
    });

    $("breadcrumb").textContent = button.textContent.trim();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

// Toast notifications
let toastTimer;

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// Digital Twin Simulator
function simulate() {
  const energy = Math.max(0, Number($("baseEnergy").value) || 0);
  const saving = Number($("saving").value);
  const factor = Math.max(0, Number($("factor").value) || 0);

  const baselineEmissions = energy * factor;
  const savedEnergy = energy * saving / 100;
  const scenarioEmissions = baselineEmissions * (1 - saving / 100);
  const reducedEmissions = baselineEmissions - scenarioEmissions;

  const format = (number) =>
    number.toLocaleString("en-IN", {
      maximumFractionDigits: 2
    });

  $("savingLabel").textContent = `${saving}%`;
  $("reduction").textContent =
    `${format(reducedEmissions)} kg CO₂e`;

  $("baselineResult").textContent =
    `${format(baselineEmissions)} kg`;

  $("scenarioResult").textContent =
    `${format(scenarioEmissions)} kg`;

  $("savedEnergy").textContent =
    `${format(savedEnergy)} kWh`;

  $("simulationNote").textContent =
    `At an assumed ${saving}% energy reduction, the projected ` +
    `emissions reduction is ${format(reducedEmissions)} kg CO₂e. ` +
    `This is a simulation, not a verified saving.`;

  $("energy").textContent = format(energy);
  $("emissions").textContent = format(baselineEmissions);
  $("reportEnergy").textContent = `${format(energy)} kWh`;
  $("reportEmissions").textContent =
    `${format(baselineEmissions)} kg CO₂e`;
}

$("simulate").addEventListener("click", () => {
  simulate();
  showToast("Simulation updated!");
});

$("saving").addEventListener("input", simulate);
$("baseEnergy").addEventListener("input", simulate);
$("factor").addEventListener("input", simulate);

// Carbon Calculator
function calculateCarbon() {
  const energy = Math.max(0, Number($("calcEnergy").value) || 0);
  const factor = Math.max(0, Number($("calcFactor").value) || 0);
  const result = energy * factor;

  const format = (number) =>
    number.toLocaleString("en-IN", {
      maximumFractionDigits: 2
    });

  $("calcResult").textContent = `${format(result)} kg CO₂e`;

  $("calcFormula").textContent =
    `${format(energy)} kWh × ${format(factor)} kg CO₂e/kWh`;

  $("reportEnergy").textContent = `${format(energy)} kWh`;
  $("reportEmissions").textContent = `${format(result)} kg CO₂e`;

  // Keep the dashboard values consistent with the calculator.
  $("energy").textContent = format(energy);
  $("emissions").textContent = format(result);
}

$("calculate").addEventListener("click", () => {
  calculateCarbon();
  showToast("Carbon emissions calculated!");
});

// Live calculator updates
$("calcEnergy").addEventListener("input", calculateCarbon);
$("calcFactor").addEventListener("input", calculateCarbon);

// Video preview for the monitoring page
let currentVideoUrl = null;

$("videoUpload").addEventListener("change", (event) => {
  const file = event.target.files[0];

  if (!file) return;

  if (!file.type.startsWith("video/")) {
    showToast("Please select a video file.");
    return;
  }

  const preview = $("videoPreview");

  if (currentVideoUrl) {
    URL.revokeObjectURL(currentVideoUrl);
  }

  currentVideoUrl = URL.createObjectURL(file);
  preview.src = currentVideoUrl;
  preview.style.display = "block";

  $("videoStatus").textContent =
    `${file.name} loaded for preview. AI detection is not connected.`;

  showToast("Video preview loaded.");
});

// Demo AI assistant
function getAIResponse(question) {
  const text = question.toLowerCase();

  if (
    text.includes("reduce") ||
    text.includes("energy") ||
    text.includes("save")
  ) {
    return `Here are three practical starting points:

1. Review equipment running outside operating hours.
2. Match HVAC and lighting schedules to actual occupancy.
3. Track electricity consumption weekly to verify improvements.

Check safety requirements and real energy data before acting.
These are demo suggestions, not live facility findings.`;
  }

  if (
    text.includes("carbon") ||
    text.includes("footprint") ||
    text.includes("co2") ||
    text.includes("emission")
  ) {
    return `Carbon emissions are estimated using:

CO₂e = Energy consumed × Emission factor

Example:
4,060 kWh × 0.70 kg CO₂e/kWh
= 2,842 kg CO₂e.

The emission factor is an assumption. Use a suitable,
verified factor for your location and electricity source.`;
  }

  if (
    text.includes("30-day") ||
    text.includes("30 day") ||
    text.includes("plan")
  ) {
    return `Your example 30-day action plan:

Week 1: Establish an energy baseline.
Week 2: Audit equipment and operating schedules.
Week 3: Trial approved energy-saving actions.
Week 4: Compare meter readings and report results.

Record evidence and verify actual savings before claiming
emissions reductions.`;
  }

  return `Start by collecting reliable energy data, checking
equipment schedules, and calculating estimated CO₂e.

This assistant uses predefined demo responses. Connect a
language-model API through a secure backend for live AI.`;
}

function addChatMessage(message, type) {
  const chat = $("chat");
  const element = document.createElement("p");

  element.className = type;
  element.textContent = message;

  chat.appendChild(element);
  chat.scrollTop = chat.scrollHeight;
}

$("chatForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const input = $("chatInput");
  const question = input.value.trim();

  if (!question) return;

  addChatMessage(question, "user");
  input.value = "";

  setTimeout(() => {
    addChatMessage(getAIResponse(question), "bot");
  }, 250);
});

// Example prompt buttons
document.querySelectorAll(".prompt").forEach((button) => {
  button.addEventListener("click", () => {
    const question = button.dataset.prompt;

    addChatMessage(question, "user");

    setTimeout(() => {
      addChatMessage(getAIResponse(question), "bot");
    }, 200);
  });
});

// CSV report download
$("downloadReport").addEventListener("click", () => {
  const energy = $("reportEnergy").textContent;
  const emissions = $("reportEmissions").textContent;

  const rows = [
    ["CarbonIQ Sustainability Report"],
    ["Data status", "Illustrative demo / calculated estimates"],
    ["Energy consumption", energy],
    ["Estimated emissions", emissions],
    ["Note", "Validate data and emission factors before reporting."]
  ];

  const csv = rows
    .map((row) =>
      row.map((value) =>
        `"${String(value).replaceAll('"', '""')}"`
      ).join(",")
    )
    .join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "carboniq-report.csv";
  link.click();

  URL.revokeObjectURL(url);
  showToast("CSV report downloaded!");
});

// Print or save the report as PDF
$("printReport").addEventListener("click", () => {
  document.querySelectorAll(".page").forEach((page) => {
    page.dataset.wasActive = page.classList.contains("active");
  });

  document.querySelectorAll(".page").forEach((page) => {
    page.classList.toggle("active", page.id === "reports");
  });

  window.print();

  document.querySelectorAll(".page").forEach((page) => {
    page.classList.toggle("active", page.dataset.wasActive === "true");
    delete page.dataset.wasActive;
  });
});

// Initialize default values
simulate();
calculateCarbon();

console.log("CarbonIQ website loaded successfully.");