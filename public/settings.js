const form = document.querySelector("#model-form");
const select = document.querySelector("#model-select");
const saveButton = document.querySelector("#save-model");
const resetButton = document.querySelector("#reset-model");
const status = document.querySelector("#settings-status");
const description = document.querySelector("#model-description");
const inputPrice = document.querySelector("#model-input-price");
const outputPrice = document.querySelector("#model-output-price");
const modelId = document.querySelector("#model-id");
const MODEL_STORAGE_KEY = "ghitty:openrouter-model";

let models = [];
let defaultModel = "";

function formatPrice(value) {
  return `$${Number(value).toFixed(2)} / 1M tokens`;
}

function selectedModel() {
  return models.find((model) => model.id === select.value);
}

function showStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function renderDetails() {
  const model = selectedModel();
  if (!model) return;
  description.textContent = model.description;
  inputPrice.textContent = formatPrice(model.inputPerMillion);
  outputPrice.textContent = formatPrice(model.outputPerMillion);
  modelId.textContent = model.id;
}

async function loadModels() {
  try {
    const response = await fetch("/api/models");
    if (!response.ok) throw new Error("Could not load models");
    const payload = await response.json();
    models = Array.isArray(payload.models) ? payload.models : [];
    defaultModel = payload.defaultModel;
    if (models.length === 0) throw new Error("No models are available");

    select.replaceChildren(
      ...models.map((model) => {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = model.name;
        return option;
      }),
    );
    let savedModel = null;
    try {
      savedModel = localStorage.getItem(MODEL_STORAGE_KEY);
    } catch {
      showStatus("Browser storage is unavailable. The server default will be used.", true);
    }
    select.value = models.some((model) => model.id === savedModel) ? savedModel : defaultModel;
    select.disabled = false;
    saveButton.disabled = false;
    resetButton.disabled = false;
    renderDetails();
  } catch {
    select.replaceChildren(new Option("Models unavailable", ""));
    showStatus("Could not load model settings. Refresh the page to retry.", true);
  }
}

select.addEventListener("change", () => {
  showStatus("");
  renderDetails();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const model = selectedModel();
  if (!model) return;
  try {
    localStorage.setItem(MODEL_STORAGE_KEY, model.id);
    showStatus(`${model.name} will be used for new searches.`);
  } catch {
    showStatus("Browser storage is unavailable. The model was not saved.", true);
  }
});

resetButton.addEventListener("click", () => {
  try {
    localStorage.removeItem(MODEL_STORAGE_KEY);
    select.value = defaultModel;
    renderDetails();
    showStatus("The recommended model will be used for new searches.");
  } catch {
    showStatus("Browser storage is unavailable. The model was not reset.", true);
  }
});

void loadModels();
