import {
  createSearchRecord,
  downloadSearchRecord,
  listSearchRecords,
  saveSearchRecord,
} from "./search-storage.js";

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
const resultActions = document.querySelector("#result-actions");
const resultActionStatus = document.querySelector("#result-action-status");
const toggleResultsButton = document.querySelector("#toggle-results");
const saveSearchButton = document.querySelector("#save-search");
const exportSearchButton = document.querySelector("#export-search");
const savedSearchesList = document.querySelector("#saved-searches-list");
const savedSearchesStatus = document.querySelector("#saved-searches-status");
const emptyState = document.querySelector("#empty-state");
const modelName = document.querySelector("#model-name");
const MODEL_STORAGE_KEY = "ghitty:openrouter-model";
const ACTIVE_JOB_STORAGE_KEY = "ghitty:active-search";
const JOB_ID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const TOP_RESULT_COUNT = 10;

let activeJobId = null;
let activeSearchTopic = "";
let activeSearchModel = null;
let currentSnapshot = null;
let currentPayload = null;
let showingAllResults = false;
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

function safeGithubUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "github.com" && url.pathname !== "/"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function renderEvidence(container, evidence) {
  if (!Array.isArray(evidence)) return;
  for (const item of evidence) {
    if (!item || typeof item !== "object") continue;
    const block = document.createElement("div");
    block.className = "evidence-block";
    const heading = document.createElement("h4");
    const source = item.source === "kencode-search" ? "Live KenCode match" : "File-based evidence";
    heading.textContent = `${source}: ${item.probe ?? "code match"}`;
    const snippet = document.createElement("pre");
    snippet.textContent = item.snippet ?? "";
    block.append(heading, snippet);
    const href = safeGithubUrl(item.url);
    if (href) {
      const link = document.createElement("a");
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "View matched file";
      block.append(link);
    }
    container.append(block);
  }
}

function evidenceLabel(pick) {
  const evidence = Array.isArray(pick.grep_evidence) ? pick.grep_evidence : [];
  const sources = new Set(evidence.map((item) => item?.source));
  if (pick.evidence_type === "both" && sources.has("kencode-search")) return "metadata + live code";
  if (pick.evidence_type === "both") return "metadata + file code";
  if (sources.has("kencode-search")) return "live code match";
  if (sources.has("file")) return "file code match";
  return "GitHub metadata";
}

function renderScore(pick) {
  const details = document.createElement("details");
  details.className = "score-details";
  const summary = document.createElement("summary");
  const scoreAvailable = Number.isFinite(pick.score) && Number.isFinite(pick.score_max);
  summary.textContent = scoreAvailable
    ? `Score ${pick.score}/${pick.score_max}`
    : "Score unavailable";
  details.append(summary);
  if (!scoreAvailable || !pick.score_breakdown || typeof pick.score_breakdown !== "object")
    return details;

  const list = document.createElement("dl");
  for (const key of [
    "concept_relevance",
    "github_query_coverage",
    "code_evidence",
    "maintenance",
  ]) {
    const component = pick.score_breakdown[key];
    if (!component || typeof component !== "object") continue;
    const row = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = `${component.label ?? key}: ${component.points ?? 0}/${component.max_points ?? 0}`;
    const description = document.createElement("dd");
    description.textContent = component.explanation ?? "No details available.";
    row.append(term, description);
    list.append(row);
  }
  details.append(list);
  return details;
}

function renderResultCard(pick, index) {
  const article = document.createElement("article");
  article.className = "result-card";
  const rank = document.createElement("div");
  rank.className = "result-rank";
  rank.textContent = String(index + 1).padStart(2, "0");

  const content = document.createElement("div");
  const title = document.createElement("h3");
  title.className = "result-title";
  const href = safeGithubUrl(pick.url);
  if (href) {
    const link = document.createElement("a");
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = pick.full_name ?? "Unnamed repository";
    title.append(link);
  } else {
    title.textContent = pick.full_name ?? "Unnamed repository";
  }

  const badges = document.createElement("div");
  badges.className = "badges";
  if (Number.isFinite(pick.score) && Number.isFinite(pick.score_max)) {
    badges.append(badge(`${pick.score}/${pick.score_max} score`, true));
  }
  badges.append(
    badge(evidenceLabel(pick), pick.evidence_type === "both"),
    badge(pick.role ?? "repository"),
    badge(pick.match ?? "focused"),
  );
  if (pick.license) badges.append(badge(`${pick.license} license`, true));
  if (pick.archived) badges.append(badge("archived"));
  if (pick.stale) badges.append(badge("stale"));

  const explanation = paragraph(
    "result-why",
    pick.why ?? pick.description ?? "No plain-language explanation is available for this result.",
  );
  const explanationLabel = document.createElement("strong");
  explanationLabel.textContent = "What it does: ";
  explanation.prepend(explanationLabel);

  content.append(title, badges, renderScore(pick), explanation);
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
  return article;
}

function payloadResults(payload) {
  if (Array.isArray(payload?.results)) return payload.results;
  return Array.isArray(payload?.picks) ? payload.picks : [];
}

function renderResults(payload, scroll = true) {
  currentPayload = payload;
  results.replaceChildren();
  const ranked = payloadResults(payload);
  const visible = showingAllResults ? ranked : ranked.slice(0, TOP_RESULT_COUNT);
  resultCount.textContent = `${ranked.length} ranked from ${payload?.candidate_count ?? ranked.length} candidates`;
  if (ranked.length === 0) {
    results.append(
      paragraph("result-description", "No ranked repositories were returned. Try a broader topic."),
    );
  } else {
    for (const [index, pick] of visible.entries()) results.append(renderResultCard(pick, index));
  }

  toggleResultsButton.hidden = ranked.length <= TOP_RESULT_COUNT;
  toggleResultsButton.textContent = showingAllResults
    ? "Show top 10"
    : `Show all ${ranked.length} results`;
  resultActions.hidden = currentSnapshot === null;
  emptyState.hidden = true;
  resultsSection.hidden = false;
  if (scroll) {
    resultsSection.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }
}

function clearStoredJob() {
  try {
    sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

function storeActiveJob(id, topic, model) {
  try {
    sessionStorage.setItem(ACTIVE_JOB_STORAGE_KEY, JSON.stringify({ id, topic, model }));
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
  activeSearchTopic = "";
  activeSearchModel = null;
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
    typeof stored.topic !== "string" ||
    !(stored.model === null || typeof stored.model === "string")
  ) {
    clearStoredJob();
    return;
  }
  eventSource?.close();
  eventSource = null;
  activeJobId = stored.id;
  activeSearchTopic = stored.topic;
  activeSearchModel = stored.model ?? null;
  topicInput.value = stored.topic;
  resultsSection.hidden = true;
  activity.hidden = false;
  emptyState.hidden = true;
  progressList.replaceChildren();
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
  eventSource.addEventListener("result", (event) => {
    const payload = JSON.parse(event.data);
    currentSnapshot = {
      id,
      topic: activeSearchTopic,
      model: activeSearchModel,
      completed_at: new Date().toISOString(),
      result: payload,
    };
    showingAllResults = false;
    resultActionStatus.textContent = "";
    renderResults(payload);
  });
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
  currentSnapshot = null;
  currentPayload = null;
  showingAllResults = false;
  resultActions.hidden = true;
  resultActionStatus.textContent = "";
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
    activeSearchTopic = topic;
    activeSearchModel = selectedModel;
    storeActiveJob(activeJobId, topic, selectedModel);
    watchJob(activeJobId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start search";
    showError(message);
    finish(message);
    topicInput.disabled = false;
    topicInput.focus();
  }
}

async function renderSavedSearches() {
  savedSearchesStatus.textContent = "";
  try {
    const records = await listSearchRecords();
    savedSearchesList.replaceChildren();
    if (records.length === 0) {
      savedSearchesStatus.textContent = "No saved searches yet.";
      return;
    }
    for (const record of records) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "saved-search-button";
      const title = document.createElement("strong");
      title.textContent = record.topic;
      const date = document.createElement("span");
      date.textContent = `Saved ${new Date(record.saved_at).toLocaleString()}`;
      button.append(title, date);
      button.addEventListener("click", () => {
        currentSnapshot = {
          id: record.id,
          topic: record.topic,
          model: record.model,
          completed_at: record.completed_at,
          result: record.result,
        };
        topicInput.value = record.topic;
        showingAllResults = false;
        resultActionStatus.textContent = "Opened saved search.";
        renderResults(record.result);
      });
      item.append(button);
      savedSearchesList.append(item);
    }
  } catch {
    savedSearchesStatus.textContent = "Saved searches are unavailable in this browser.";
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

toggleResultsButton.addEventListener("click", () => {
  showingAllResults = !showingAllResults;
  if (currentPayload) renderResults(currentPayload, false);
});

saveSearchButton.addEventListener("click", async () => {
  if (!currentSnapshot) return;
  saveSearchButton.disabled = true;
  try {
    await saveSearchRecord(createSearchRecord(currentSnapshot));
    resultActionStatus.textContent = "Saved in this browser.";
    await renderSavedSearches();
  } catch {
    resultActionStatus.textContent = "Could not save. Browser storage may be unavailable or full.";
  } finally {
    saveSearchButton.disabled = false;
  }
});

exportSearchButton.addEventListener("click", () => {
  if (!currentSnapshot) return;
  try {
    downloadSearchRecord(createSearchRecord(currentSnapshot));
    resultActionStatus.textContent = "Exported JSON.";
  } catch {
    resultActionStatus.textContent = "Could not export this search.";
  }
});

window.addEventListener("pagehide", () => {
  eventSource?.close();
  eventSource = null;
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) restoreActiveJob();
});

restoreActiveJob();
void loadModelSelection();
void renderSavedSearches();

for (const example of document.querySelectorAll("[data-topic]")) {
  example.addEventListener("click", () => {
    topicInput.value = example.dataset.topic;
    topicInput.focus();
  });
}
