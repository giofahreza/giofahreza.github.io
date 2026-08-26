const DEFAULT_DEV_SECRET_HASH =
  "e9c6c9d291d84e5f798ede2c6602c7dc5119d3654def44fc2a1ca3340d25d121";
const DEV_SESSION_STORAGE_KEY = "situbondoMessenger.devSession.v1";
const DEV_SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const devSecret = import.meta.env.VITE_DEV_MODE_SECRET ?? "";
const devSecretHash =
  import.meta.env.VITE_DEV_MODE_SECRET_SHA256 ?? DEFAULT_DEV_SECRET_HASH;

function devModeWasRequested(searchParams) {
  if (!searchParams.has("dev")) return false;
  const value = searchParams.get("dev")?.toLowerCase() ?? "";
  return !["0", "false", "off", "logout"].includes(value);
}

function devLogoutWasRequested(searchParams) {
  return searchParams.get("dev")?.toLowerCase() === "logout";
}

function getSecretFromUrl(searchParams) {
  return searchParams.get("key") ?? searchParams.get("devKey") ?? "";
}

function removeSecretFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("key");
  url.searchParams.delete("devKey");
  window.history.replaceState(null, "", url);
}

function readStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(DEV_SESSION_STORAGE_KEY) ?? "null");
  } catch {
    return null;
  }
}

function writeStoredSession(secretFingerprint) {
  const now = Date.now();
  try {
    localStorage.setItem(
      DEV_SESSION_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        secretFingerprint,
        createdAt: now,
        expiresAt: now + DEV_SESSION_TTL_MS,
      }),
    );
  } catch {
    // Private browsing can reject localStorage. The login still works for this page load.
  }
}

function clearStoredSession() {
  try {
    localStorage.removeItem(DEV_SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage failures; the page can still fall back to the normal start screen.
  }
}

async function sha256Hex(value) {
  if (!window.crypto?.subtle) return "";
  const buffer = await window.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function getExpectedSecretFingerprint() {
  if (devSecret) return sha256Hex(devSecret);
  return devSecretHash;
}

async function validateSecret(secret) {
  const trimmedSecret = secret.trim();
  if (!trimmedSecret) return false;
  if (devSecret && trimmedSecret === devSecret) return true;

  const secretFingerprint = await sha256Hex(trimmedSecret);
  return !!secretFingerprint && secretFingerprint === devSecretHash;
}

async function sessionIsValid() {
  const session = readStoredSession();
  if (
    !session ||
    session.version !== 1 ||
    session.expiresAt <= Date.now() ||
    !session.secretFingerprint
  ) {
    return false;
  }

  const expectedSecretFingerprint = await getExpectedSecretFingerprint();
  return session.secretFingerprint === expectedSecretFingerprint;
}

async function storeValidSession(secret) {
  const secretFingerprint = await sha256Hex(secret.trim());
  if (secretFingerprint) writeStoredSession(secretFingerprint);
}

function ensureDevBadge(app) {
  if (app.querySelector(".dev-session-badge")) return;
  const badge = document.createElement("div");
  badge.className = "dev-session-badge";
  badge.textContent = "DEV";
  app.append(badge);
}

function activateDevMode({ app, gameState, message }) {
  gameState.devMode = true;
  app.classList.add("dev-mode");
  message.classList.remove("dev-session-login");
  ensureDevBadge(app);
}

function showDevLogin({ elements, gameState, onAuthenticated, startGame }) {
  const { app, message, startButton } = elements;
  activateDevMode({ app, gameState, message });

  message.classList.add("dev-session-login");
  message.classList.remove("hidden");
  message.querySelector("h1").textContent = "Dev Mode";
  message.querySelector("p").textContent =
    "Masukkan secret key untuk membuka sesi dev di browser ini.";
  startButton.hidden = true;

  const existingForm = message.querySelector(".dev-session-form");
  existingForm?.remove();

  const form = document.createElement("form");
  form.className = "dev-session-form";
  form.innerHTML = `
    <label for="dev-session-secret">Secret key</label>
    <input
      id="dev-session-secret"
      name="secret"
      type="password"
      autocomplete="current-password"
      autocapitalize="none"
      spellcheck="false"
      required
    />
    <button type="submit">Masuk Dev</button>
    <small class="dev-session-error" aria-live="polite"></small>
  `;
  startButton.before(form);

  const input = form.querySelector("#dev-session-secret");
  const error = form.querySelector(".dev-session-error");
  input.focus({ preventScroll: true });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";
    form.classList.add("is-checking");

    const secret = new FormData(form).get("secret")?.toString() ?? "";
    if (await validateSecret(secret)) {
      await storeValidSession(secret);
      form.remove();
      startButton.hidden = false;
      activateDevMode({ app, gameState, message });
      startGame();
      onAuthenticated?.();
      return;
    }

    form.classList.remove("is-checking");
    error.textContent = "Secret key salah.";
    input.select();
  });
}

export async function initializeDevSession({
  elements,
  gameState,
  onAuthenticated,
  startGame,
}) {
  const searchParams = new URLSearchParams(window.location.search);

  if (devLogoutWasRequested(searchParams)) {
    clearStoredSession();
    return { devMode: false, autoStarted: false };
  }

  if (!devModeWasRequested(searchParams)) {
    return { devMode: false, autoStarted: false };
  }

  const { app, message, startButton } = elements;
  const urlSecret = getSecretFromUrl(searchParams);
  const validUrlSecret = urlSecret ? await validateSecret(urlSecret) : false;

  if (validUrlSecret) {
    await storeValidSession(urlSecret);
    removeSecretFromUrl();
  }

  if (validUrlSecret || (await sessionIsValid())) {
    startButton.hidden = false;
    activateDevMode({ app, gameState, message });
    startGame();
    onAuthenticated?.();
    return { devMode: true, autoStarted: true, authenticated: true };
  }

  showDevLogin({ elements, gameState, onAuthenticated, startGame });
  return { devMode: true, autoStarted: false, authenticated: false };
}
