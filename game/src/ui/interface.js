export function createInterfaceController({
  angularDistance,
  cameraRig,
  constants,
  elements,
  gameState,
  headingTowardStop,
  hudCache,
  mapData,
  rider,
  shortestAngleDelta,
  stops,
}) {
  const {
    hud,
    targetPanel,
    message,
    startButton,
    lettersNode,
    timeNode,
    streakNode,
    targetNode,
    targetDirectionNode,
    targetDistanceNode,
    routeProgressNode,
    routeProgressSteps,
    deliveryToast,
    deliveryNameNode,
    controlHint,
    boundaryNotice,
    nearbyPlace,
    nearbyPlaceName,
    nearbyPlaceType,
  } = elements;
  const { DELIVERY_DISTANCE, MAP_METERS_PER_WORLD_UNIT, PLANET_RADIUS } =
    constants;
  const nearbyPlaceCache = { key: "" };

  function updateTargetMarker() {
    stops.forEach((stop, index) => {
      stop.marker.visible =
        index === gameState.targetIndex &&
        gameState.started &&
        !gameState.complete;
    });
    const currentStop = stops[Math.min(gameState.targetIndex, stops.length - 1)];
    const targetName = gameState.complete
      ? "All Delivered"
      : currentStop.shortName ?? currentStop.name;
    if (hudCache.target !== targetName) {
      targetNode.textContent = targetName;
      targetNode.title = gameState.complete ? "" : currentStop.name;
      hudCache.target = targetName;
    }
  }

  function updateHud() {
    const lettersText = `${gameState.deliveries}/${stops.length}`;
    const timeValue = Math.ceil(Math.max(0, gameState.timeLeft));
    const timeText = `${timeValue}`;
    const bonusText = `+${gameState.streak * 5}s`;

    if (hudCache.letters !== lettersText) {
      lettersNode.textContent = lettersText;
      hudCache.letters = lettersText;
      routeProgressNode.setAttribute(
        "aria-label",
        `Route progress: ${gameState.deliveries} of ${stops.length} deliveries`,
      );
      routeProgressSteps.forEach((step, index) => {
        step.classList.toggle("complete", index < gameState.deliveries);
        step.classList.toggle(
          "current",
          !gameState.complete && index === gameState.targetIndex,
        );
      });
    }
    if (hudCache.time !== timeText) {
      timeNode.textContent = timeText;
      hudCache.time = timeText;
    }
    if (hudCache.bonus !== bonusText) {
      streakNode.textContent = bonusText;
      hudCache.bonus = bonusText;
    }

    hud.classList.toggle("time-low", timeValue <= 45 && timeValue > 20);
    hud.classList.toggle("time-critical", timeValue <= 20);

    if (!gameState.complete && gameState.targetIndex < stops.length) {
      const target = stops[gameState.targetIndex];
      const distance =
        angularDistance(
          rider.theta,
          rider.phi,
          target.deliveryTheta ?? target.theta,
          target.deliveryPhi ?? target.phi,
        ) * PLANET_RADIUS;
      const distanceMeters = Math.max(
        1,
        Math.round(distance * MAP_METERS_PER_WORLD_UNIT),
      );
      const proximity =
        distance <= DELIVERY_DISTANCE
          ? "At the door"
          : distanceMeters < 60
            ? "Very close"
            : distanceMeters < 300
              ? "Nearby"
              : distanceMeters < 1200
                ? "Keep going"
                : "Across town";
      targetDistanceNode.textContent = `${distanceMeters} m · ${proximity}`;
      targetPanel.classList.toggle("is-near", distanceMeters < 60);
      targetPanel.setAttribute(
        "aria-label",
        `Current delivery: ${target.name}, ${distanceMeters} meters away`,
      );

      const targetHeading = headingTowardStop(gameState.targetIndex);
      const bearing = -shortestAngleDelta(
        cameraRig.followHeading,
        targetHeading,
      );
      targetDirectionNode.style.setProperty(
        "--target-bearing",
        `${bearing}rad`,
      );
    } else {
      targetDistanceNode.textContent = "Route complete";
      targetPanel.classList.remove("is-near");
    }
  }

  function showDeliveryFeedback(stopName) {
    deliveryNameNode.textContent = stopName;
    gameState.deliveryToastTime = 2.15;
    deliveryToast.classList.add("show");
  }

  function updateNearbyPlaceCard() {
    if (!gameState.started || !mapData.places?.length) {
      nearbyPlace.classList.remove("show");
      nearbyPlace.setAttribute("aria-hidden", "true");
      nearbyPlaceCache.key = "";
      return;
    }

    const riderEastMeters = rider.theta * MAP_METERS_PER_WORLD_UNIT;
    const riderNorthMeters = -rider.phi * MAP_METERS_PER_WORLD_UNIT;
    let nearest = null;
    let nearestDistance = Infinity;
    mapData.places.forEach((place, index) => {
      const eastMeters = place[0] / mapData.coordinatePrecision;
      const northMeters = place[1] / mapData.coordinatePrecision;
      const distance = Math.hypot(
        eastMeters - riderEastMeters,
        northMeters - riderNorthMeters,
      );
      if (distance < nearestDistance) {
        nearest = { place, index };
        nearestDistance = distance;
      }
    });

    if (!nearest || nearestDistance > 80) {
      nearbyPlace.classList.remove("show");
      nearbyPlace.setAttribute("aria-hidden", "true");
      nearbyPlaceCache.key = "";
      return;
    }

    const roundedDistance = Math.max(1, Math.round(nearestDistance / 5) * 5);
    const [, typeLabel] = mapData.placeTypes[nearest.place[2]] ?? [
      "place",
      "Tempat nyata",
    ];
    const key = `${nearest.index}:${roundedDistance}`;
    if (nearbyPlaceCache.key !== key) {
      nearbyPlaceName.textContent = nearest.place[4];
      nearbyPlaceType.textContent = `${typeLabel} · ${roundedDistance} m`;
      nearbyPlaceCache.key = key;
    }
    nearbyPlace.classList.add("show");
    nearbyPlace.setAttribute("aria-hidden", "false");
  }

  function updateInterface(delta) {
    if (gameState.deliveryToastTime > 0) {
      gameState.deliveryToastTime = Math.max(
        0,
        gameState.deliveryToastTime - delta,
      );
    }
    deliveryToast.classList.toggle(
      "show",
      gameState.deliveryToastTime > 0,
    );

    if (gameState.controlHintTime > 0) {
      gameState.controlHintTime = Math.max(
        0,
        gameState.controlHintTime - delta,
      );
    }
    controlHint.classList.toggle(
      "show",
      gameState.started && gameState.controlHintTime > 0,
    );

    if (gameState.boundaryNoticeTime > 0) {
      gameState.boundaryNoticeTime = Math.max(
        0,
        gameState.boundaryNoticeTime - delta,
      );
    }
    boundaryNotice.classList.toggle(
      "show",
      gameState.started && gameState.boundaryNoticeTime > 0,
    );
  }

  function showMessage(title, body, button) {
    message.classList.remove("title-screen");
    message.querySelector("h1").textContent = title;
    message.querySelector("p").textContent = body;
    startButton.textContent = button;
    message.classList.remove("hidden");
  }

  function hideMessage() {
    message.classList.add("hidden");
  }

  return {
    hideMessage,
    showDeliveryFeedback,
    showMessage,
    updateHud,
    updateInterface,
    updateNearbyPlaceCard,
    updateTargetMarker,
  };
}
