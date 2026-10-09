import assert from "node:assert/strict";
import { createInputController } from "../src/input/controls.js";

class FakeElement extends EventTarget {
  classList = {
    remove() {},
    add() {},
    toggle() {},
  };
  style = { setProperty() {} };
  setAttribute() {}
  setPointerCapture() {}
  closest() { return null; }
}

globalThis.Element = FakeElement;
globalThis.window = new EventTarget();
globalThis.document = new EventTarget();
document.hidden = false;
const keys = new Set();
const touchState = { analogPointerId: null };
const canvas = new FakeElement();
const runButton = new FakeElement();
const brakeButton = new FakeElement();
const input = createInputController({
  constants: { ANALOG_INPUT_RADIUS: 50, ANALOG_VISUAL_RESPONSE: 12 },
  elements: {
    canvas,
    analog: new FakeElement(),
    analogStick: new FakeElement(),
    runButton,
    brakeButton,
  },
  gameState: { started: true },
  keys,
  touchState,
});
input.bindKeyboardControls();
input.bindAnalog();
input.bindRunButton();
input.bindBrakeButton();

function dispatch(target, type, properties = {}) {
  target.dispatchEvent(Object.assign(new Event(type), properties));
}

function holdControls() {
  dispatch(window, "keydown", { code: "KeyW" });
  dispatch(window, "keydown", { code: "ShiftLeft" });
  Object.assign(touchState, {
    analogPointerId: 7, analogX: 0.5, analogY: -1,
    analogVisualX: 10, analogVisualY: -10,
    analogVisualTargetX: 10, analogVisualTargetY: -10,
    run: true, brake: true,
  });
}

function assertReleased() {
  assert.equal(keys.size, 0);
  assert.equal(touchState.analogPointerId, null);
  for (const field of ["analogX", "analogY", "analogVisualX", "analogVisualY",
    "analogVisualTargetX", "analogVisualTargetY"]) {
    assert.equal(touchState[field], 0, field);
  }
  assert.equal(touchState.run, false);
  assert.equal(touchState.brake, false);
}

holdControls();
dispatch(window, "blur");
assertReleased();
// Returning to focus cannot restore stale input or the old pointer gesture.
dispatch(window, "focus");
dispatch(canvas, "pointermove", { pointerId: 7, clientX: 100, clientY: 100 });
assertReleased();

holdControls();
document.hidden = true;
dispatch(document, "visibilitychange");
assertReleased();
document.hidden = false;
dispatch(document, "visibilitychange");
assertReleased();

holdControls();
input.resetAnalog(); // resetGame, completeGame, failGame and resize call this.
assertReleased();

holdControls();
dispatch(canvas, "pointerup", { pointerId: 8 });
assert.equal(touchState.analogPointerId, 7, "Unrelated pointer must not reset stick");
dispatch(canvas, "pointerup", { pointerId: 7 });
assert.equal(touchState.analogPointerId, null);
assert(keys.has("KeyW"), "Touch release must preserve keyboard movement");
dispatch(window, "keyup", { code: "KeyW" });
assert(!keys.has("KeyW"));
dispatch(window, "keyup", { code: "ShiftLeft" });
assertReleased();

dispatch(window, "keydown", { code: "KeyD" });
assert(keys.has("KeyD"), "Fresh keyboard input must work after reset");
dispatch(window, "keyup", { code: "KeyD" });
assert.equal(keys.size, 0);
for (const [button, field] of [[runButton, "run"], [brakeButton, "brake"]]) {
  for (const code of ["Enter", "Space", "NumpadEnter"]) {
    dispatch(button, "keydown", { code });
    assert.equal(touchState[field], true, `${field} keyboard hold`);
    dispatch(window, "keyup", { code });
    assert.equal(touchState[field], false, `${field} keyboard release`);
  }
  dispatch(button, "keydown", { code: "Enter" });
  dispatch(button, "keydown", { code: "Space" });
  dispatch(window, "keyup", { code: "Enter" });
  assert.equal(touchState[field], true, "Other activation key remains held");
  dispatch(button, "blur");
  assert.equal(touchState[field], false, "Button blur clears keyboard hold");
  dispatch(button, "pointerdown", { pointerId: 21, button: 0 });
  dispatch(button, "keydown", { code: "Enter" });
  dispatch(window, "keyup", { code: "Enter" });
  assert.equal(touchState[field], true, "Keyboard release preserves pointer hold");
  dispatch(button, "pointerup", { pointerId: 21 });
  assert.equal(touchState[field], false);
  dispatch(button, "pointerdown", { pointerId: 21, button: 0 });
  dispatch(button, "pointerdown", { pointerId: 23, button: 0 });
  dispatch(button, "pointerup", { pointerId: 24 });
  assert.equal(touchState[field], true, "Unrelated release preserves hold");
  dispatch(button, "pointerup", { pointerId: 21 });
  assert.equal(touchState[field], true, "Second pointer still holds button");
  dispatch(button, "lostpointercapture", { pointerId: 23 });
  assert.equal(touchState[field], false);
  dispatch(button, "keydown", { code: "Enter" });
  input.resetAnalog({ pointerId: 7 });
  assert.equal(touchState[field], true, "Analog release preserves keyboard button hold");
  dispatch(window, "keyup", { code: "Enter" });
  assert.equal(touchState[field], false);
  dispatch(button, "pointerdown", { pointerId: 22, button: 2 });
  assert.equal(touchState[field], false, "Secondary mouse button ignored");
  dispatch(button, "keydown", { code: "Enter" });
  input.resetAnalog();
  dispatch(button, "keydown", { code: "Space" });
  dispatch(window, "keyup", { code: "Space" });
  assert.equal(touchState[field], false, "Lifecycle reset clears old activation keys");
}
console.log("Input focus/lifecycle regression checks passed.");
