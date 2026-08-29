const DEV_SETTINGS_STORAGE_KEY = "situbondoMessenger.devSettings.v1";
const NORMAL_RUN_SPEED_MODE = "normal";
const FAST_RUN_SPEED_MODE = "fast";

function normalizeRunSpeedMode(value) {
  if (value === FAST_RUN_SPEED_MODE) return FAST_RUN_SPEED_MODE;
  if (value === NORMAL_RUN_SPEED_MODE) return NORMAL_RUN_SPEED_MODE;
  return null;
}

function readStoredRunSpeedMode() {
  try {
    const settings = JSON.parse(
      localStorage.getItem(DEV_SETTINGS_STORAGE_KEY) ?? "null",
    );
    if (settings?.version !== 1) return null;
    return normalizeRunSpeedMode(settings.runSpeedMode);
  } catch {
    return null;
  }
}

function writeStoredRunSpeedMode(runSpeedMode) {
  try {
    localStorage.setItem(
      DEV_SETTINGS_STORAGE_KEY,
      JSON.stringify({ version: 1, runSpeedMode }),
    );
  } catch {
    // Private browsing can reject localStorage. The current dev choice still works.
  }
}

function getRequestedRunSpeedMode() {
  const requestedMode = new URLSearchParams(window.location.search).get(
    "runSpeed",
  );
  return normalizeRunSpeedMode(requestedMode?.toLowerCase());
}

export function installDevSettings({
  constants: {
    DEV_FAST_RUN_SPEED,
    RUN_SPEED,
  },
  elements: {
    app,
  },
  gameState,
  requestGameFrame,
  rider,
}) {
  if (app.querySelector(".dev-settings")) {
    return window.__tinyMessengerDevSettings ?? null;
  }

  const root = document.createElement("section");
  root.className = "dev-settings";
  root.setAttribute("aria-label", "Dev settings");
  root.innerHTML = `
    <label>
      <span>Run</span>
      <select class="dev-run-speed" aria-label="Run speed">
        <option value="normal">Normal · ${RUN_SPEED.toFixed(2)}</option>
        <option value="fast">Fast · ${DEV_FAST_RUN_SPEED.toFixed(1)}</option>
      </select>
    </label>
  `;
  app.append(root);

  const select = root.querySelector(".dev-run-speed");

  function effectiveRunSpeed() {
    return gameState.runSpeedMode === FAST_RUN_SPEED_MODE
      ? DEV_FAST_RUN_SPEED
      : RUN_SPEED;
  }

  function setRunSpeedMode(value, { persist = true } = {}) {
    const runSpeedMode =
      normalizeRunSpeedMode(value) ?? NORMAL_RUN_SPEED_MODE;
    gameState.runSpeedMode = runSpeedMode;
    select.value = runSpeedMode;
    root.dataset.runSpeed = runSpeedMode;

    const speedLimit = effectiveRunSpeed();
    if (Math.abs(rider.speed) > speedLimit) {
      rider.speed = Math.sign(rider.speed) * speedLimit;
    }
    rider.actualSpeed = Math.min(rider.actualSpeed, speedLimit);

    if (persist) writeStoredRunSpeedMode(runSpeedMode);
    requestGameFrame();
    return speedLimit;
  }

  select.addEventListener("change", () => {
    setRunSpeedMode(select.value);
  });

  const initialRunSpeedMode =
    getRequestedRunSpeedMode() ??
    readStoredRunSpeedMode() ??
    NORMAL_RUN_SPEED_MODE;
  setRunSpeedMode(initialRunSpeedMode, { persist: false });

  const api = {
    get effectiveRunSpeed() {
      return effectiveRunSpeed();
    },
    get runSpeedMode() {
      return gameState.runSpeedMode;
    },
    setRunSpeedMode,
  };

  Object.defineProperty(window, "__tinyMessengerDevSettings", {
    configurable: true,
    value: api,
  });

  return api;
}
