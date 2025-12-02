// MVP100 Cost Bot
// Replace GOOGLE_ESTIMATOR_URL with your published Google Apps Script web app URL.
const GOOGLE_ESTIMATOR_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";

const form = document.querySelector("#bot-form");
const responseBox = document.querySelector("#bot-response");
const statusDot = document.querySelector(".bot-status");
const hasLiveEndpoint = GOOGLE_ESTIMATOR_URL && !GOOGLE_ESTIMATOR_URL.includes("YOUR_SCRIPT_ID");

const addonRates = {
  auth: 120,
  database: 180,
  payments: 220,
  api: 140,
};

const scopeRates = {
  landing: 0,
  prototype: 90,
  app: 240,
};

const timelineRates = {
  relaxed: 0,
  standard: 60,
  rush: 150,
};

function buildPayload(formData) {
  return {
    scope: formData.get("scope"),
    timeline: formData.get("timeline"),
    addons: formData.getAll("addons"),
  };
}

function localEstimate(payload) {
  let total = 100;
  const lines = ["RM100 base: landing page + simple CTA/automation."];

  total += scopeRates[payload.scope] || 0;
  if (scopeRates[payload.scope]) {
    lines.push(`Scope upgrade (${payload.scope}) adds RM${scopeRates[payload.scope]}.`);
  }

  total += timelineRates[payload.timeline] || 0;
  if (timelineRates[payload.timeline]) {
    lines.push(`Timeline boost (${payload.timeline}) adds RM${timelineRates[payload.timeline]}.`);
  }

  payload.addons.forEach((addon) => {
    if (addonRates[addon]) {
      total += addonRates[addon];
      lines.push(`Feature ${addon} adds RM${addonRates[addon]}.`);
    }
  });

  return {
    total,
    breakdown: lines,
    poweredBy: hasLiveEndpoint ? "Google Apps Script" : "Local calculator",
  };
}

function renderEstimate(data) {
  if (!responseBox) return;
  const notes = (data.breakdown || [])
    .map((line) => `<li>${line}</li>`)
    .join("");

  responseBox.innerHTML = `
    <p><strong>Estimated total: RM${data.total}</strong></p>
    <ul>${notes}</ul>
    <p class="small-print">${data.poweredBy} · Final quote shared after quick brief.</p>
  `;

  if (statusDot) {
    statusDot.style.background = data.poweredBy.includes("Google") ? "var(--accent)" : "#f1c40f";
  }
}

async function requestGoogleEstimate(payload) {
  if (!hasLiveEndpoint) throw new Error("No live script");

  const url = new URL(GOOGLE_ESTIMATOR_URL);
  Object.entries(payload).forEach(([key, value]) => {
    url.searchParams.set(key, Array.isArray(value) ? value.join(",") : value);
  });

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error("Failed request");

  const data = await response.json();
  if (!data.total) throw new Error("Malformed response");

  return {
    total: data.total,
    breakdown: data.breakdown || [
      "Google Script returned an estimate.",
      "Adjust the sheet to customize the breakdown.",
    ],
    poweredBy: "Google Apps Script",
  };
}

async function handleSubmit(event) {
  event.preventDefault();
  if (!form || !responseBox) return;

  responseBox.textContent = "🤖 Crunching numbers...";

  const payload = buildPayload(new FormData(form));

  try {
    const remoteEstimate = await requestGoogleEstimate(payload);
    renderEstimate(remoteEstimate);
  } catch (error) {
    const fallback = localEstimate(payload);
    renderEstimate(fallback);
  }
}

if (form) {
  form.addEventListener("submit", handleSubmit);
}
