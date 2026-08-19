const form = document.querySelector("#search-form");
const topicInput = document.querySelector("#topic");
const submitButton = document.querySelector("#submit-button");
const cancelButton = document.querySelector("#cancel-button");
const formError = document.querySelector("#form-error");
const activity = document.querySelector("#activity");
const liveStatus = document.querySelector("#live-status");
const progressList = document.querySelector("#progress-list");
const searchProgress = document.querySelector("#search-progress");
const resultsSection = document.querySelector("#results-section");
const results = document.querySelector("#results");
const resultCount = document.querySelector("#result-count");
const emptyState = document.querySelector("#empty-state");
const modelName = document.querySelector("#model-name");
const MODEL_STORAGE_KEY = "ghitty:openrouter-model";
const ACTIVE_JOB_STORAGE_KEY = "ghitty:active-search";
const JOB_ID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

let activeJobId = null;
let eventSource = null;
let selectedModel = null;

async function loadModelSelection() {
  try {
    const response = await fetch("/api/models");
    if (!response.ok) throw new Error("Could not load models");
    const payload = await response.json();
    const savedModel = localStorage.getItem(MODEL_STORAGE_KEY);
    const selected = payload.models.find((model) => model.id === savedModel);
    const fallback = payload.models.find((model) => model.id === payload.defaultModel);
    const active = selected ?? fallback;
    selectedModel = active?.id ?? null;
    modelName.textContent = active?.name ?? "Server default";
  } catch {
    modelName.textContent = "Server default";
  }
}

function setBusy(isBusy) {
  submitButton.disabled = isBusy;
  topicInput.disabled = isBusy;
  cancelButton.hidden = !isBusy;
  submitButton.textContent = isBusy ? "Searching..." : "Search repos";
}

function showError(message) {
  formError.textContent = message;
  liveStatus.textContent = message;
}

function appendProgress(message) {
  const item = document.createElement("li");
  item.textContent = message;
  progressList.append(item);
  while (progressList.children.length > 40) progressList.firstElementChild?.remove();
  progressList.scrollTop = progressList.scrollHeight;
}

function badge(label, strong = false) {
  const element = document.createElement("span");
  element.className = strong ? "badge strong" : "badge";
  element.textContent = label;
  return element;
}

function paragraph(className, text) {
  const element = document.createElement("p");
  element.className = className;
  element.textContent = text;
  return element;
}

function renderEvidence(container, evidence) {
  for (const item of evidence ?? []) {
    const block = document.createElement("div");
    block.className = "evidence-block";
    const heading = document.createElement("h4");
    heading.textContent = `Code evidence: ${item.probe}`;
    const snippet = document.createElement("pre");
    snippet.textContent = item.snippet;
    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open source match";
    block.append(heading, snippet, link);
    container.append(block);
  }
}

function renderResults(payload) {
  results.replaceChildren();
  const picks = Array.isArray(payload.picks) ? payload.picks : [];
  resultCount.textContent = `${picks.length} ranked from ${payload.candidate_count ?? 0} candidates`;
  if (picks.length === 0) {
    results.append(
      paragraph("result-description", "No ranked repositories were returned. Try a broader topic."),
    );
  }
  picks.forEach((pick, index) => {
    const article = document.createElement("article");
    article.className = "result-card";

    const rank = document.createElement("div");
    rank.className = "result-rank";
    rank.textContent = String(index + 1).padStart(2, "0");

    const content = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "result-title";
    const link = document.createElement("a");
    link.href = pick.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = pick.full_name;
    title.append(link);

    const badges = document.createElement("div");
    badges.className = "badges";
    badges.append(
      badge(pick.evidence_type ?? "metadata-match", pick.evidence_type === "both"),
      badge(pick.role ?? "repository"),
      badge(pick.match ?? "focused"),
    );
    if (pick.archived) badges.append(badge("archived"));
    if (pick.stale) badges.append(badge("stale"));

    const explanation = paragraph(
      "result-why",
      pick.why ?? "No plain-language explanation was returned.",
    );
    const explanationLabel = document.createElement("strong");
    explanationLabel.textContent = "What it does: ";
    explanation.prepend(explanationLabel);

    content.append(title, badges, explanation);
    if (pick.description) content.append(paragraph("result-description", pick.description));
    if (pick.translated_description && pick.translated_description !== pick.description) {
      const translation = paragraph("translation", pick.translated_description);
      const label = document.createElement("strong");
      label.textContent = "English: ";
      translation.prepend(label);
      content.append(translation);
    }
    renderEvidence(content, pick.grep_evidence);
    article.append(rank, content);
    results.append(article);
  });

  emptyState.hidden = true;
  resultsSection.hidden = false;
  resultsSection.scrollIntoView({
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });
}

function clearStoredJob() {
  try {
    sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

function storeActiveJob(id, topic) {
  try {
    sessionStorage.setItem(ACTIVE_JOB_STORAGE_KEY, JSON.stringify({ id, topic }));
  } catch {
    // The live connection still works until this page is unloaded.
  }
}

function finish(message) {
  setBusy(false);
  searchProgress.hidden = true;
  liveStatus.textContent = message;
  eventSource?.close();
  eventSource = null;
  activeJobId = null;
  clearStoredJob();
}

function restoreActiveJob() {
  let stored;
  try {
    stored = JSON.parse(sessionStorage.getItem(ACTIVE_JOB_STORAGE_KEY) ?? "null");
  } catch {
    clearStoredJob();
    return;
  }
  if (
    typeof stored !== "object" ||
    stored === null ||
    typeof stored.id !== "string" ||
    !JOB_ID_PATTERN.test(stored.id) ||
    typeof stored.topic !== "string"
  ) {
    clearStoredJob();
    return;
  }
  activeJobId = stored.id;
  topicInput.value = stored.topic;
  resultsSection.hidden = true;
  activity.hidden = false;
  emptyState.hidden = true;
  setBusy(true);
  searchProgress.hidden = false;
  liveStatus.textContent = "Reconnecting to live search";
  watchJob(activeJobId);
}

function watchJob(id) {
  eventSource = new EventSource(`/api/jobs/${id}/events`);
  eventSource.addEventListener("progress", (event) => {
    const data = JSON.parse(event.data);
    appendProgress(data.message);
  });
  eventSource.addEventListener("result", (event) => renderResults(JSON.parse(event.data)));
  eventSource.addEventListener("status", (event) => {
    const data = JSON.parse(event.data);
    liveStatus.textContent = data.message;
    if (["completed", "failed", "canceled"].includes(data.state)) finish(data.message);
  });
  eventSource.addEventListener("job-error", (event) => {
    const data = JSON.parse(event.data);
    showError(data.message ?? "Search failed");
  });
  eventSource.onerror = () => {
    if (!activeJobId) return;
    if (eventSource?.readyState === EventSource.CLOSED) {
      finish("Live search is no longer available. Start it again.");
      return;
    }
    liveStatus.textContent = "Connection interrupted. Reconnecting...";
  };
}

async function startSearch(topic) {
  formError.textContent = "";
  resultsSection.hidden = true;
  activity.hidden = false;
  emptyState.hidden = true;
  progressList.replaceChildren();
  setBusy(true);
  searchProgress.hidden = false;
  liveStatus.textContent = "Starting search";

  try {
    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, model: selectedModel }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Could not start search");
    if (typeof payload.id !== "string" || !JOB_ID_PATTERN.test(payload.id)) {
      throw new Error("Server returned an invalid search ID");
    }
    activeJobId = payload.id;
    storeActiveJob(activeJobId, topic);
    watchJob(activeJobId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start search";
    showError(message);
    finish(message);
    topicInput.disabled = false;
    topicInput.focus();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const topic = topicInput.value.trim().replace(/\s+/g, " ");
  if (!topic) {
    showError("Enter a topic to search.");
    topicInput.focus();
    return;
  }
  void startSearch(topic);
});

cancelButton.addEventListener("click", async () => {
  if (!activeJobId) return;
  cancelButton.disabled = true;
  try {
    await fetch(`/api/jobs/${activeJobId}`, { method: "DELETE" });
  } finally {
    cancelButton.disabled = false;
  }
});

restoreActiveJob();
void loadModelSelection();

for (const example of document.querySelectorAll("[data-topic]")) {
  example.addEventListener("click", () => {
    topicInput.value = example.dataset.topic;
    topicInput.focus();
  });
}
