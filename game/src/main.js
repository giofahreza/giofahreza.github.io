import "./ui/style.css?v=situbondo-v30";

const app = document.querySelector("#app");
const start = document.querySelector("#start");
const message = document.querySelector("#message");

try {
  await import("./app/game.js");
  app.dataset.boot = "ready";
  start.disabled = false;
  start.textContent = "Mulai Rute";
} catch (error) {
  console.error("Game failed to load", error);
  app.dataset.boot = "failed";
  app.classList.add("not-started");
  message.classList.remove("hidden");
  message.querySelector("p").textContent =
    "Game belum dapat dimuat. Periksa koneksi Anda, lalu coba muat ulang.";
  // A partial initialization may already have bound Start. Replace it so
  // retry cannot also start a partially initialized round.
  const retry = start.cloneNode(false);
  retry.disabled = false;
  retry.hidden = false;
  retry.textContent = "Muat ulang";
  retry.addEventListener("click", () => window.location.reload());
  start.replaceWith(retry);
}
