import * as THREE from "three";

const MAP_EDITOR_STORAGE_KEY = "situbondoMessenger.mapEdits.v1";
const DEFAULT_STEP = 0.25;

const LOCAL_EDITABLE_OBJECTS = [
  {
    id: "alun:roads-frontage",
    label: "Alun-Alun roads + frontage",
    objectName: "Jl. Nasional 1 Street View context",
    type: "street-context",
  },
  {
    id: "alun:sd-al-abror",
    label: "SD Islam Al-Abror",
    objectName: "SD Islam Al-Abror · Google Street View 360",
    type: "building",
  },
  {
    id: "alun:sdn-6-dawuhan",
    label: "SD Negeri 6 Dawuhan",
    objectName: "SD Negeri 6 Dawuhan · Google Street View 360",
    type: "building",
  },
  {
    id: "alun:library",
    label: "Dinas Perpustakaan",
    objectName: "Dinas Perpustakaan dan Kearsipan · Google Street View 360",
    type: "building",
  },
  {
    id: "alun:bri",
    label: "Bank BRI KC Situbondo",
    objectName: "Bank BRI KC Situbondo · Google Street View 360",
    type: "building",
  },
  {
    id: "alun:warung-pojok",
    label: "Warung Pojok Hj. Nurul",
    objectName: "Warung Pojok Hj. Nurul · Google Street View 360",
    type: "building",
  },
  {
    id: "alun:east-frontage",
    label: "East junction frontage",
    objectName: "East-junction Google Street View commercial frontage",
    type: "building-row",
  },
  {
    id: "alun:bakti-motor",
    label: "Bakti Motor workshop",
    objectName: "Bakti Motor · Google Street View workshop",
    type: "building",
  },
];

function round(value, digits = 3) {
  return Number(value.toFixed(digits));
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function cloneScale(scale) {
  return new THREE.Vector3(scale.x, scale.y, scale.z);
}

function getUniformMultiplier(currentScale, baseScale) {
  const safeBase = Math.abs(baseScale.x) > 0.000001 ? baseScale.x : 1;
  return currentScale.x / safeBase;
}

function readSavedPatch() {
  try {
    return JSON.parse(localStorage.getItem(MAP_EDITOR_STORAGE_KEY) ?? "null");
  } catch {
    return null;
  }
}

function writeSavedPatch(patch) {
  try {
    localStorage.setItem(MAP_EDITOR_STORAGE_KEY, JSON.stringify(patch));
  } catch {
    // Some mobile private modes reject localStorage. Export still remains usable.
  }
}

function clearSavedPatch() {
  try {
    localStorage.removeItem(MAP_EDITOR_STORAGE_KEY);
  } catch {
    // Ignore storage failures; the current runtime reset has already happened.
  }
}

function markEditableObject(entry) {
  entry.object.userData.mapEditorId = entry.id;
  entry.object.traverse((child) => {
    child.userData.mapEditorId = entry.id;
  });
}

function findNamedObjects(world) {
  const objectsByName = new Map();
  world.traverse((object) => {
    if (object.name && !objectsByName.has(object.name)) {
      objectsByName.set(object.name, object);
    }
  });
  return objectsByName;
}

function makeStopEntry(stop) {
  const baseScale = cloneScale(stop.group.scale);
  const yaw = stop.yaw ?? 0;
  const state = {
    north: round(-stop.phi),
    east: round(stop.theta),
    yaw: round(yaw),
    scale: round(getUniformMultiplier(stop.group.scale, baseScale)),
    visible: stop.group.visible,
  };

  return {
    id: `stop:${slugify(stop.shortName ?? stop.name)}`,
    label: stop.name,
    mode: "spherical",
    type: stop.kind ?? "stop",
    object: stop.group,
    stop,
    lift: stop.mapEditorPlacement?.lift ?? 0,
    baseScale,
    original: { ...state },
    state: { ...state },
  };
}

function makeLocalEntry(config, object) {
  const baseScale = cloneScale(object.scale);
  const state = {
    north: round(object.position.x),
    east: round(object.position.z),
    yaw: round(object.rotation.y),
    scale: round(getUniformMultiplier(object.scale, baseScale)),
    visible: object.visible,
  };

  return {
    ...config,
    mode: "local",
    object,
    baseScale,
    original: { ...state },
    state: { ...state },
  };
}

function buildEditableEntries({ stops, world }) {
  const entries = stops
    .filter((stop) => stop.group)
    .map(makeStopEntry);
  const objectsByName = findNamedObjects(world);

  LOCAL_EDITABLE_OBJECTS.forEach((config) => {
    const object = objectsByName.get(config.objectName);
    if (object) entries.push(makeLocalEntry(config, object));
  });

  entries.forEach(markEditableObject);
  return entries;
}

function normalizeState(rawState, fallback) {
  return {
    north: Number.isFinite(Number(rawState?.north))
      ? Number(rawState.north)
      : fallback.north,
    east: Number.isFinite(Number(rawState?.east))
      ? Number(rawState.east)
      : fallback.east,
    yaw: Number.isFinite(Number(rawState?.yaw))
      ? Number(rawState.yaw)
      : fallback.yaw,
    scale: Number.isFinite(Number(rawState?.scale))
      ? THREE.MathUtils.clamp(Number(rawState.scale), 0.1, 8)
      : fallback.scale,
    visible: typeof rawState?.visible === "boolean"
      ? rawState.visible
      : fallback.visible,
  };
}

function createPatch(entries) {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    note: "Runtime map-editor patch. Apply these values back into source for permanent collision/navigation updates.",
    edits: entries.map((entry) => ({
      id: entry.id,
      label: entry.label,
      mode: entry.mode,
      type: entry.type,
      north: round(entry.state.north),
      east: round(entry.state.east),
      yaw: round(entry.state.yaw),
      scale: round(entry.state.scale),
      visible: entry.state.visible,
    })),
  };
}

function setStatus(statusNode, text) {
  statusNode.textContent = text;
}

export function installMapEditor({
  elements: {
    app,
  },
  gameState,
  placeOnPlanet,
  requestGameFrame,
  scene,
  stops,
  updateHud,
  updateTargetMarker,
  world,
}) {
  if (app.querySelector(".map-editor")) return null;

  const entries = buildEditableEntries({ stops, world });
  if (!entries.length) return null;

  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
  const highlight = new THREE.BoxHelper(entries[0].object, 0xefc74f);
  highlight.name = "Map editor selection bounds";
  highlight.renderOrder = 40;
  scene.add(highlight);

  const root = document.createElement("section");
  root.className = "map-editor is-collapsed";
  root.setAttribute("aria-label", "Map editor");
  root.innerHTML = `
    <button class="map-editor-toggle" type="button" aria-expanded="false">Edit Map</button>
    <div class="map-editor-panel">
      <div class="map-editor-header">
        <strong>Map Editor</strong>
        <button class="map-editor-collapse" type="button" aria-label="Collapse editor">x</button>
      </div>
      <label>
        Object
        <select class="map-editor-select"></select>
      </label>
      <div class="map-editor-grid map-editor-values">
        <label>North <input data-field="north" type="number" step="0.1" /></label>
        <label>East <input data-field="east" type="number" step="0.1" /></label>
        <label>Yaw° <input data-field="yawDeg" type="number" step="1" /></label>
        <label>Scale <input data-field="scale" type="number" min="0.1" max="8" step="0.05" /></label>
      </div>
      <label class="map-editor-visible">
        <input data-field="visible" type="checkbox" /> Visible
      </label>
      <div class="map-editor-move-pad" aria-label="Move selected object">
        <span></span>
        <button type="button" data-move="north">N</button>
        <span></span>
        <button type="button" data-move="west">W</button>
        <label>Step <input class="map-editor-step" type="number" min="0.05" max="10" step="0.05" value="0.25" /></label>
        <button type="button" data-move="east">E</button>
        <span></span>
        <button type="button" data-move="south">S</button>
        <span></span>
      </div>
      <div class="map-editor-actions">
        <button type="button" data-action="save">Save local</button>
        <button type="button" data-action="export">Export</button>
        <button type="button" data-action="import">Import</button>
        <button type="button" data-action="reset-selected">Reset item</button>
        <button type="button" data-action="reset-all">Reset all</button>
      </div>
      <textarea class="map-editor-json" aria-label="Map editor JSON"></textarea>
      <small class="map-editor-status" aria-live="polite"></small>
    </div>
  `;
  app.append(root);

  const toggleButton = root.querySelector(".map-editor-toggle");
  const collapseButton = root.querySelector(".map-editor-collapse");
  const select = root.querySelector(".map-editor-select");
  const jsonArea = root.querySelector(".map-editor-json");
  const statusNode = root.querySelector(".map-editor-status");
  const stepInput = root.querySelector(".map-editor-step");
  const fieldNodes = {
    north: root.querySelector('[data-field="north"]'),
    east: root.querySelector('[data-field="east"]'),
    yawDeg: root.querySelector('[data-field="yawDeg"]'),
    scale: root.querySelector('[data-field="scale"]'),
    visible: root.querySelector('[data-field="visible"]'),
  };

  entries.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = entry.label;
    select.append(option);
  });

  let selectedEntry = entries[0];

  function requestEditorFrame() {
    highlight.setFromObject(selectedEntry.object);
    highlight.visible = selectedEntry.object.visible;
    requestGameFrame();
  }

  function applyEntryState(entry, state) {
    entry.state = normalizeState(state, entry.original);
    entry.object.visible = entry.state.visible;
    entry.object.scale.copy(entry.baseScale).multiplyScalar(entry.state.scale);

    if (entry.mode === "spherical") {
      entry.stop.theta = entry.state.east;
      entry.stop.phi = -entry.state.north;
      entry.stop.yaw = entry.state.yaw;
      placeOnPlanet(
        entry.object,
        entry.stop.theta,
        entry.stop.phi,
        entry.lift,
        entry.stop.yaw,
      );
      updateTargetMarker();
      updateHud();
    } else {
      entry.object.position.x = entry.state.north;
      entry.object.position.z = entry.state.east;
      entry.object.rotation.y = entry.state.yaw;
    }

    entry.object.updateMatrixWorld(true);
    if (entry === selectedEntry) requestEditorFrame();
  }

  function syncFieldsFromState() {
    fieldNodes.north.value = round(selectedEntry.state.north).toString();
    fieldNodes.east.value = round(selectedEntry.state.east).toString();
    fieldNodes.yawDeg.value = round(
      THREE.MathUtils.radToDeg(selectedEntry.state.yaw),
      1,
    ).toString();
    fieldNodes.scale.value = round(selectedEntry.state.scale, 2).toString();
    fieldNodes.visible.checked = selectedEntry.state.visible;
    requestEditorFrame();
  }

  function stateFromFields() {
    return normalizeState(
      {
        north: fieldNodes.north.value,
        east: fieldNodes.east.value,
        yaw: THREE.MathUtils.degToRad(Number(fieldNodes.yawDeg.value) || 0),
        scale: fieldNodes.scale.value,
        visible: fieldNodes.visible.checked,
      },
      selectedEntry.state,
    );
  }

  function applyPatch(patch) {
    const edits = Array.isArray(patch?.edits) ? patch.edits : [];
    edits.forEach((edit) => {
      const entry = entriesById.get(edit.id);
      if (entry) applyEntryState(entry, edit);
    });
    syncFieldsFromState();
  }

  function saveLocal() {
    const patch = createPatch(entries);
    writeSavedPatch(patch);
    setStatus(statusNode, "Saved in this browser.");
    return patch;
  }

  function setCollapsed(value) {
    root.classList.toggle("is-collapsed", value);
    toggleButton.setAttribute("aria-expanded", String(!value));
    gameState.mapEditorOpen = !value;
    requestEditorFrame();
  }

  root.addEventListener("pointerdown", (event) => event.stopPropagation());
  root.addEventListener("touchstart", (event) => event.stopPropagation(), {
    passive: true,
  });

  toggleButton.addEventListener("click", () => setCollapsed(false));
  collapseButton.addEventListener("click", () => setCollapsed(true));

  select.addEventListener("change", () => {
    selectedEntry = entriesById.get(select.value) ?? entries[0];
    syncFieldsFromState();
    setStatus(statusNode, selectedEntry.label);
  });

  Object.values(fieldNodes).forEach((field) => {
    field.addEventListener("input", () => {
      applyEntryState(selectedEntry, stateFromFields());
      setStatus(statusNode, "Unsaved change.");
    });
  });

  root.querySelectorAll("[data-move]").forEach((button) => {
    button.addEventListener("click", () => {
      const step = Number(stepInput.value) || DEFAULT_STEP;
      const nextState = { ...selectedEntry.state };
      if (button.dataset.move === "north") nextState.north += step;
      if (button.dataset.move === "south") nextState.north -= step;
      if (button.dataset.move === "east") nextState.east += step;
      if (button.dataset.move === "west") nextState.east -= step;
      applyEntryState(selectedEntry, nextState);
      syncFieldsFromState();
      setStatus(statusNode, "Unsaved change.");
    });
  });

  root.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.action;
      if (action === "save") {
        saveLocal();
      }
      if (action === "export") {
        const text = JSON.stringify(createPatch(entries), null, 2);
        jsonArea.value = text;
        jsonArea.classList.add("show");
        jsonArea.select();
        try {
          await navigator.clipboard?.writeText(text);
          setStatus(statusNode, "Export copied to clipboard.");
        } catch {
          setStatus(statusNode, "Export ready in the text box.");
        }
      }
      if (action === "import") {
        try {
          const patch = JSON.parse(jsonArea.value);
          applyPatch(patch);
          writeSavedPatch(createPatch(entries));
          setStatus(statusNode, "Imported and saved locally.");
        } catch {
          setStatus(statusNode, "Import JSON is invalid.");
        }
      }
      if (action === "reset-selected") {
        applyEntryState(selectedEntry, selectedEntry.original);
        syncFieldsFromState();
        setStatus(statusNode, "Selected item reset.");
      }
      if (action === "reset-all") {
        entries.forEach((entry) => applyEntryState(entry, entry.original));
        clearSavedPatch();
        syncFieldsFromState();
        setStatus(statusNode, "All local edits cleared.");
      }
    });
  });

  const savedPatch = readSavedPatch();
  if (savedPatch) {
    applyPatch(savedPatch);
    setStatus(statusNode, "Saved map edits loaded.");
  } else {
    syncFieldsFromState();
    setStatus(statusNode, "Editor ready.");
  }

  Object.defineProperty(window, "__tinyMessengerMapEditor", {
    configurable: true,
    value: {
      applyPatch,
      clear: () => {
        entries.forEach((entry) => applyEntryState(entry, entry.original));
        clearSavedPatch();
        syncFieldsFromState();
      },
      entries: () => entries.map((entry) => ({ ...entry.state, id: entry.id })),
      exportPatch: () => createPatch(entries),
      save: saveLocal,
      select: (id) => {
        selectedEntry = entriesById.get(id) ?? selectedEntry;
        select.value = selectedEntry.id;
        syncFieldsFromState();
      },
    },
  });

  return window.__tinyMessengerMapEditor;
}
