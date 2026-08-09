document.getElementById("year").textContent = String(new Date().getFullYear());

const portrait = document.getElementById("portrait");
if (portrait) {
  const block = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  portrait.addEventListener("contextmenu", block);
  portrait.addEventListener("dragstart", block);
}

const answers = {
  "mobile-agent":
    "The Android Mobile Agent is an Android agentic platform I architected and lead: multi-agent orchestration, planning/execution, memory systems, hybrid routing across 10+ cloud and on-device LLMs, and 50+ tools for autonomous device workflows — including a dedicated Health Agent.",
  healthcare:
    "Healthcare projects include Snore Detection (sleep audio + PPG, spectral attention, 95% accuracy, sleep insights), Non-Invasive Diabetic Status Detection using smartwatch ECG/PPG, and Cycling Detection (~92% accuracy). Related patents on glycaemic index detection and PPG enhancement are under process.",
  gsoc:
    "During Google Summer of Code 2022 with VideoLAN, I integrated FFmpeg libavfilters into VLC to support 18 audio filters, built a dynamic filtering GUI, and implemented libVLC backend entry points with the global open-source community.",
  focus:
    "Current focus: agentic AI systems for mobile — Android Mobile Agent architecture, model routing, tool ecosystems, and health intelligence — plus wearable healthcare projects like snore, cycling, and non-invasive diabetic status detection.",
  default:
    "I can talk about the Android Mobile Agent, Snore Detection, Non-Invasive Diabetic Status Detection, Cycling Detection, GSoC/VLC, or current lab focus.",
};

const log = document.getElementById("console-log");
const form = document.getElementById("console-form");
const input = document.getElementById("console-input");
const prompts = document.getElementById("console-prompts");

function appendLine(who, text) {
  const p = document.createElement("p");
  p.className = "console-line";
  const label = document.createElement("span");
  label.className = "who";
  label.textContent = who + " ";
  p.appendChild(label);
  p.appendChild(document.createTextNode(text));
  log.appendChild(p);
  log.scrollTop = log.scrollHeight;
}

function resolveAnswer(raw) {
  const q = raw.toLowerCase();
  if (/(android mobile agent|mobile agent|agent|orchestr)/.test(q)) return answers["mobile-agent"];
  if (/(health|ecg|ppg|wearable|diabetes|snore|cycling)/.test(q)) return answers.healthcare;
  if (/(gsoc|vlc|videolan|ffmpeg|open.?source)/.test(q)) return answers.gsoc;
  if (/(focus|now|current|working)/.test(q)) return answers.focus;
  return answers.default;
}

function runQuery(text) {
  const cleaned = text.trim();
  if (!cleaned) return;
  appendLine("you ›", cleaned);
  window.setTimeout(() => {
    appendLine("lab ›", resolveAnswer(cleaned));
  }, 220);
}

appendLine(
  "lab ›",
  "Lab console online. Ask about the Android Mobile Agent, healthcare AI, GSoC/VLC, or current focus."
);

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  runQuery(input.value);
  input.value = "";
  input.focus();
});

prompts?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-query]");
  if (!button) return;
  const key = button.getAttribute("data-query");
  const label = button.textContent.trim();
  appendLine("you ›", label);
  window.setTimeout(() => {
    appendLine("lab ›", answers[key] || answers.default);
  }, 220);
});

const tabs = Array.from(document.querySelectorAll(".profile-tabs [role='tab']"));
const panels = Array.from(document.querySelectorAll(".profile-panel"));

function activateTab(nextTab) {
  const name = nextTab.getAttribute("data-tab");
  tabs.forEach((tab) => {
    const selected = tab === nextTab;
    tab.setAttribute("aria-selected", selected ? "true" : "false");
    tab.tabIndex = selected ? 0 : -1;
  });
  panels.forEach((panel) => {
    const match = panel.getAttribute("data-panel") === name;
    panel.hidden = !match;
  });
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => activateTab(tab));
  tab.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const next = tabs[(index + offset + tabs.length) % tabs.length];
    activateTab(next);
    next.focus();
  });
});

document.querySelectorAll('.project-links a[href^="#"], .system-card-link[href="#profile"], .system-card-icon[href="#profile"]').forEach((link) => {
  link.addEventListener("click", () => {
    const projectsTab = document.getElementById("tab-projects");
    if (projectsTab) activateTab(projectsTab);
  });
});
