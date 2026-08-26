import * as THREE from "three";

export function createInputController({
  constants,
  elements,
  gameState,
  keys,
  touchState,
}) {
  const { ANALOG_INPUT_RADIUS, ANALOG_VISUAL_RESPONSE } = constants;
  const { analog, analogStick, brakeButton, canvas, runButton } = elements;

  function resetAnalog(event) {
    if (
      event &&
      touchState.analogPointerId !== null &&
      event.pointerId !== touchState.analogPointerId
    ) {
      return;
    }

    touchState.analogX = 0;
    touchState.analogY = 0;
    touchState.analogPointerId = null;
    touchState.analogOriginX = 0;
    touchState.analogOriginY = 0;
    touchState.analogVisualX = 0;
    touchState.analogVisualY = 0;
    touchState.analogVisualTargetX = 0;
    touchState.analogVisualTargetY = 0;
    touchState.run = false;
    touchState.brake = false;
    analog.classList.remove("active");
    runButton.classList.remove("active");
    runButton.setAttribute("aria-pressed", "false");
    analogStick.style.setProperty("--analog-x", "0px");
    analogStick.style.setProperty("--analog-y", "0px");
  }

  function updateAnalog(event) {
    let dx = event.clientX - touchState.analogOriginX;
    let dy = event.clientY - touchState.analogOriginY;
    const distance = Math.hypot(dx, dy);

    if (distance > ANALOG_INPUT_RADIUS) {
      dx = (dx / distance) * ANALOG_INPUT_RADIUS;
      dy = (dy / distance) * ANALOG_INPUT_RADIUS;
    }

    touchState.analogX = dx / ANALOG_INPUT_RADIUS;
    touchState.analogY = dy / ANALOG_INPUT_RADIUS;

    const stickSize = analogStick.offsetWidth || 46;
    const baseSize = Math.min(
      analog.offsetWidth || 148,
      analog.offsetHeight || 148,
    );
    const visualRadius = Math.max(
      0,
      baseSize * 0.5 - stickSize * 0.5 - 8,
    );
    const visualScale = visualRadius / ANALOG_INPUT_RADIUS;
    touchState.analogVisualTargetX = dx * visualScale;
    touchState.analogVisualTargetY = dy * visualScale;
  }

  function updateAnalogVisual(delta) {
    const alpha = 1 - Math.exp(-ANALOG_VISUAL_RESPONSE * delta);
    touchState.analogVisualX = THREE.MathUtils.lerp(
      touchState.analogVisualX,
      touchState.analogVisualTargetX,
      alpha,
    );
    touchState.analogVisualY = THREE.MathUtils.lerp(
      touchState.analogVisualY,
      touchState.analogVisualTargetY,
      alpha,
    );
    analogStick.style.setProperty(
      "--analog-x",
      `${touchState.analogVisualX.toFixed(2)}px`,
    );
    analogStick.style.setProperty(
      "--analog-y",
      `${touchState.analogVisualY.toFixed(2)}px`,
    );
  }

  function bindAnalog() {
    canvas.addEventListener("pointerdown", (event) => {
      if (
        !gameState.started ||
        touchState.analogPointerId !== null ||
        (event.pointerType === "mouse" && event.button !== 0)
      ) {
        return;
      }

      event.preventDefault();
      gameState.controlHintTime = 0;
      touchState.analogPointerId = event.pointerId;
      touchState.analogOriginX = event.clientX;
      touchState.analogOriginY = event.clientY;

      const analogWidth = analog.offsetWidth || 148;
      const analogHeight = analog.offsetHeight || 148;
      const horizontalInset = Math.min(
        analogWidth * 0.5 + 8,
        window.innerWidth * 0.5,
      );
      const verticalInset = Math.min(
        analogHeight * 0.5 + 8,
        window.innerHeight * 0.5,
      );
      const visualX = THREE.MathUtils.clamp(
        event.clientX,
        horizontalInset,
        window.innerWidth - horizontalInset,
      );
      const visualY = THREE.MathUtils.clamp(
        event.clientY,
        verticalInset,
        window.innerHeight - verticalInset,
      );

      analog.style.left = `${visualX}px`;
      analog.style.top = `${visualY}px`;
      const runOffset = analogWidth * 0.5 + 40;
      const runX = visualX > window.innerWidth * 0.5
        ? visualX - runOffset
        : visualX + runOffset;
      runButton.style.left = `${runX}px`;
      runButton.style.top = `${visualY}px`;
      analog.classList.add("active");
      canvas.setPointerCapture(event.pointerId);
      updateAnalog(event);
    });

    canvas.addEventListener("pointermove", (event) => {
      if (event.pointerId !== touchState.analogPointerId) return;
      event.preventDefault();
      updateAnalog(event);
    });

    canvas.addEventListener("pointerup", resetAnalog);
    canvas.addEventListener("pointercancel", resetAnalog);
    canvas.addEventListener("lostpointercapture", resetAnalog);
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  function bindRunButton() {
    const setRun = (value) => {
      touchState.run = value;
      runButton.classList.toggle("active", value);
      runButton.setAttribute("aria-pressed", String(value));
      if (value) gameState.controlHintTime = 0;
    };

    runButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      runButton.setPointerCapture(event.pointerId);
      setRun(true);
    });
    runButton.addEventListener("pointerup", () => setRun(false));
    runButton.addEventListener("pointercancel", () => setRun(false));
    runButton.addEventListener("lostpointercapture", () => setRun(false));
  }

  function bindBrakeButton() {
    const setBrake = (value) => {
      touchState.brake = value;
      if (value) gameState.controlHintTime = 0;
    };

    brakeButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      brakeButton.setPointerCapture(event.pointerId);
      setBrake(true);
    });
    brakeButton.addEventListener("pointerup", () => setBrake(false));
    brakeButton.addEventListener("pointercancel", () => setBrake(false));
    brakeButton.addEventListener("lostpointercapture", () => setBrake(false));
  }

  function bindKeyboardControls() {
    window.addEventListener("keydown", (event) => {
      keys.add(event.code);
      if (
        [
          "ArrowLeft",
          "ArrowRight",
          "ArrowDown",
          "ArrowUp",
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "Space",
        ].includes(event.code)
      ) {
        gameState.controlHintTime = 0;
      }
      if (
        [
          "ArrowLeft",
          "ArrowRight",
          "ArrowDown",
          "ArrowUp",
          "Space",
        ].includes(event.code)
      ) {
        event.preventDefault();
      }
    });

    window.addEventListener("keyup", (event) => {
      keys.delete(event.code);
    });
  }

  return {
    bindAnalog,
    bindBrakeButton,
    bindKeyboardControls,
    bindRunButton,
    resetAnalog,
    updateAnalogVisual,
  };
}
