import { ROUND_TIME } from "../config/runtime.js";

export function createGameState() {
  return {
    started: false,
    devMode: false,
    mapEditorOpen: false,
    complete: false,
    timeLeft: ROUND_TIME,
    deliveries: 0,
    streak: 0,
    targetIndex: 0,
    deliveryToastTime: 0,
    controlHintTime: 0,
    boundaryNoticeTime: 0,
  };
}

export function createHudCache() {
  return {
    letters: "",
    time: "",
    bonus: "",
    target: "",
  };
}

export function createRiderState() {
  return {
    // Start 60 m east and 60 m south of the Alun-Alun survey origin.
    theta: 12,
    phi: 12,
    heading: 0.65,
    speed: 0,
    actualSpeed: 0,
    motionBlend: 0,
    blockedBlend: 0,
    animationState: "idle",
    turn: 0,
    walkPhase: 0,
    moveX: 0,
    moveY: 0,
    inputActive: false,
    controlHeading: 0.65,
    desiredHeading: 0.65,
    collisionActive: false,
    celebration: 0,
    lastFootstep: -1,
  };
}

export function createTouchState() {
  return {
    analogX: 0,
    analogY: 0,
    analogPointerId: null,
    analogOriginX: 0,
    analogOriginY: 0,
    analogVisualX: 0,
    analogVisualY: 0,
    analogVisualTargetX: 0,
    analogVisualTargetY: 0,
    run: false,
    brake: false,
  };
}
