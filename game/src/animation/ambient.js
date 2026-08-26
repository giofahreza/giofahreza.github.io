import * as THREE from "three";

export function createAmbientAnimationSystem({
  collections: {
    animatedBoats,
    animatedFlowers,
    animatedFoliage,
    animatedStopDetails,
    chimneySmoke,
    driftingClouds,
    lakeRipples,
  },
  constants: {
    LOGICAL_THETA_PERIOD,
  },
  getReducedMotion,
  getSignalState,
  materials: {
    paintedSkyMaterial,
    targetMaterial,
    townWindowMaterial,
    waterMaterial,
  },
  placeOnPlanet,
  state: {
    gameState,
    stops,
  },
}) {
  function sampleRoadRouteCenter(route, distance) {
    const clampedDistance = THREE.MathUtils.clamp(distance, 0, route.length);
    let segmentIndex = route.distances.length - 2;
    for (let index = 0; index < route.distances.length - 1; index += 1) {
      if (clampedDistance <= route.distances[index + 1]) {
        segmentIndex = index;
        break;
      }
    }
    const start = route.points[segmentIndex];
    const end = route.points[segmentIndex + 1];
    const segmentStart = route.distances[segmentIndex];
    const segmentLength = Math.max(
      0.0001,
      route.distances[segmentIndex + 1] - segmentStart,
    );
    const amount = THREE.MathUtils.clamp(
      (clampedDistance - segmentStart) / segmentLength,
      0,
      1,
    );
    return {
      north: THREE.MathUtils.lerp(start[0], end[0], amount),
      east: THREE.MathUtils.lerp(start[1], end[1], amount),
    };
  }

  function sampleRoadRoute(route, distance, laneOffset = 0) {
    const center = sampleRoadRouteCenter(route, distance);
    // Blend the tangent over 1.6 metres so lateral lane offsets and vehicle
    // headings stay continuous through the short vertices around the island.
    const tangentWindow = 0.16;
    const before = sampleRoadRouteCenter(route, distance - tangentWindow);
    const after = sampleRoadRouteCenter(route, distance + tangentWindow);
    const tangentLength = Math.max(
      0.0001,
      Math.hypot(after.north - before.north, after.east - before.east),
    );
    const tangentNorth = (after.north - before.north) / tangentLength;
    const tangentEast = (after.east - before.east) / tangentLength;
    return {
      north: center.north - tangentEast * laneOffset,
      east: center.east + tangentNorth * laneOffset,
      // Three's +X axis rotates toward -Z for a positive Y rotation. Use the
      // opposite sign so a +X-forward model follows the sampled tangent.
      rotation: -Math.atan2(tangentEast, tangentNorth),
    };
  }

  const ROAD_TRAFFIC_TYPES = new Set(["streetVehicle", "crossStreetVehicle"]);
  // Arclength alone understates the space two long vehicles need when their
  // headings diverge through a tight bend. Keep the audited worst-case body
  // gap (cargo truck behind a pickup on the northbound cross route), rather
  // than allowing their oriented envelopes to overlap around the island.
  const MIN_TRAFFIC_GAP = 0.52;
  const TRAFFIC_SLOWDOWN_GAP = 1.35;
  const TRAFFIC_GAP_RESPONSE = 2.4;
  const TRAFFIC_DISTANCE_EPSILON = 1e-6;

  function updateRoadTraffic(delta, elapsed, ambientMotion, prefersReducedMotion) {
    const vehiclesByRoute = new Map();
    animatedStopDetails.forEach((detail) => {
      if (!ROAD_TRAFFIC_TYPES.has(detail.type) || !detail.routePath) return;
      const routeVehicles = vehiclesByRoute.get(detail.routePath);
      if (routeVehicles) routeVehicles.push(detail);
      else vehiclesByRoute.set(detail.routePath, [detail]);
    });

    vehiclesByRoute.forEach((routeVehicles, routePath) => {
      const routeLength = routePath.length;
      if (!Number.isFinite(routeLength) || routeLength <= 0) return;

      // Travel always increases along a direction-specific route. Sorting by
      // current distance gives every follower its next leader. The final
      // vehicle follows the first through an unwrapped copy of the route.
      routeVehicles.sort((first, second) => first.travel - second.travel);
      const states = routeVehicles.map((detail) => {
        const halfLength = Math.max(0.01, detail.halfLength ?? 0.3);
        const signalState = prefersReducedMotion
          ? "red"
          : getSignalState(elapsed, detail.route);
        // Every route has one physical stop bar. The leading vehicle stops with
        // its front bumper at that bar; the leader-spacing clamp below forms the
        // rest of the queue. Giving each vehicle a private offset let vehicles
        // that had passed that earlier point continue across the real bar while
        // the light was red.
        const stopDistance = routePath.stopDistance - halfLength;
        const distanceToStop = stopDistance - detail.travel;
        let targetSpeed = detail.speed;
        // Vehicles that have not crossed the stop bar treat amber as the end
        // of the release phase. This leaves the full amber + all-red window
        // for traffic already inside the junction to clear before the
        // perpendicular direction turns green.
        if (
          signalState !== "green" &&
          distanceToStop >= -TRAFFIC_DISTANCE_EPSILON &&
          distanceToStop < 1.65
        ) {
          targetSpeed =
            detail.speed *
            THREE.MathUtils.clamp(Math.max(0, distanceToStop) / 1.65, 0, 1);
        }
        return {
          detail,
          halfLength,
          nextTravel: detail.travel,
          signalState,
          stopDistance,
          targetSpeed,
        };
      });

      // Slow a closing follower before the hard spacing clamp is needed. This
      // keeps the varied fleet speeds without letting a fast bike pass through
      // a slower car when a queue starts moving.
      states.forEach((state, index) => {
        const leaderIndex = (index + 1) % states.length;
        const leader = states[leaderIndex];
        const leaderTravel =
          leader.detail.travel + (leaderIndex === 0 ? routeLength : 0);
        const bodyGap =
          leaderTravel -
          state.detail.travel -
          state.halfLength -
          leader.halfLength;
        if (bodyGap >= TRAFFIC_SLOWDOWN_GAP) return;
        const leaderSpeed = leader.detail.currentSpeed ?? leader.detail.speed;
        const slowdownProgress = THREE.MathUtils.smoothstep(
          bodyGap,
          MIN_TRAFFIC_GAP,
          TRAFFIC_SLOWDOWN_GAP,
        );
        // Start matching the leader across the whole approach buffer. The
        // closing-speed allowance still handles a rapidly shrinking gap, while
        // this blend prevents the larger bend-safe clamp from producing an
        // abrupt stop when fleet speeds differ only slightly.
        const bufferedTargetSpeed = THREE.MathUtils.lerp(
          Math.min(state.targetSpeed, leaderSpeed),
          state.targetSpeed,
          slowdownProgress,
        );
        const closingAllowance =
          Math.max(0, bodyGap - MIN_TRAFFIC_GAP) * TRAFFIC_GAP_RESPONSE;
        state.targetSpeed = Math.min(
          bufferedTargetSpeed,
          Math.max(0, leaderSpeed + closingAllowance),
        );
      });

      const travelStepScale = Math.max(0, delta * ambientMotion);
      states.forEach((state) => {
        const { detail } = state;
        detail.currentSpeed = THREE.MathUtils.damp(
          detail.currentSpeed ?? detail.speed,
          state.targetSpeed,
          state.targetSpeed < 0.05 ? 6.5 : 2.4,
          delta,
        );
        state.nextTravel =
          detail.travel + detail.currentSpeed * travelStepScale;
        if (
          state.signalState !== "green" &&
          detail.travel <= state.stopDistance + TRAFFIC_DISTANCE_EPSILON &&
          state.nextTravel >= state.stopDistance - TRAFFIC_DISTANCE_EPSILON
        ) {
          state.nextTravel = state.stopDistance;
        }
      });

      // Clamp proposed positions in unwrapped route space. Repeating the pass
      // propagates a stopped leader through the whole queue, including the pair
      // spanning routeLength -> 0, without changing vehicle order.
      for (let pass = 0; pass < states.length; pass += 1) {
        let changed = false;
        for (let index = states.length - 1; index >= 0; index -= 1) {
          const state = states[index];
          const leaderIndex = (index + 1) % states.length;
          const leader = states[leaderIndex];
          const leaderTravel =
            leader.nextTravel + (leaderIndex === 0 ? routeLength : 0);
          const maximumTravel =
            leaderTravel -
            state.halfLength -
            leader.halfLength -
            MIN_TRAFFIC_GAP;
          const constrainedTravel = Math.max(
            state.detail.travel,
            Math.min(state.nextTravel, maximumTravel),
          );
          if (constrainedTravel < state.nextTravel - 1e-7) changed = true;
          state.nextTravel = constrainedTravel;
        }
        if (!changed) break;
      }

      states.forEach((state) => {
        const { detail } = state;
        const actualTravel = Math.max(0, state.nextTravel - detail.travel);
        if (travelStepScale > 1e-7) {
          detail.currentSpeed = Math.min(
            detail.currentSpeed,
            actualTravel / travelStepScale,
          );
        } else {
          detail.currentSpeed = 0;
        }
        detail.travel = state.nextTravel >= routeLength
          ? state.nextTravel % routeLength
          : state.nextTravel;
        const routeSample = sampleRoadRoute(
          routePath,
          detail.travel,
          detail.laneOffset,
        );
        detail.object.position.set(
          routeSample.north,
          detail.baseY ?? 0.1,
          routeSample.east,
        );
        detail.object.rotation.y =
          routeSample.rotation + (detail.headingOffset ?? 0);
        detail.object.position.y +=
          Math.abs(Math.sin(elapsed * 7.5 + detail.phase)) *
          0.003 *
          ambientMotion;
      });
    });
  }

  function updateAmbientAnimation(delta, elapsed) {
    const prefersReducedMotion = getReducedMotion();
    const ambientMotion = prefersReducedMotion ? 0.12 : 1;
    const gust =
      (0.58 + Math.sin(elapsed * 0.19) * 0.24) *
      (0.72 + Math.sin(elapsed * 0.47 + 1.4) * 0.28);

    paintedSkyMaterial.map.offset.x =
      (paintedSkyMaterial.map.offset.x + delta * 0.006 * ambientMotion) % 1;

    driftingClouds.forEach((cloud, cloudIndex) => {
      cloud.theta += cloud.speed * delta * ambientMotion;
      if (cloud.theta > LOGICAL_THETA_PERIOD * 0.5) {
        cloud.theta -= LOGICAL_THETA_PERIOD;
      }
      const cloudPhi =
        cloud.basePhi +
        Math.sin(elapsed * 0.1 * ambientMotion + cloud.phase) *
          0.018 *
          ambientMotion;
      placeOnPlanet(
        cloud.group,
        cloud.theta,
        cloudPhi,
        cloud.lift +
          Math.sin(elapsed * 0.16 * ambientMotion + cloud.phase) *
            0.045 *
            ambientMotion,
        cloud.theta * 0.08,
      );

      cloud.puffs.forEach((puff, puffIndex) => {
        const phase = elapsed * (0.36 + puffIndex * 0.025) +
          cloud.phase + puff.phase;
        const breathe =
          1 + Math.sin(phase) * 0.035 * ambientMotion;
        puff.mesh.position.set(
          puff.basePosition.x + Math.sin(phase * 0.71) * 0.008 * ambientMotion,
          puff.basePosition.y + Math.sin(phase) * 0.012 * ambientMotion,
          puff.basePosition.z,
        );
        puff.mesh.scale.set(
          breathe,
          1 + Math.cos(phase) * 0.025 * ambientMotion,
          breathe,
        );
      });

      placeOnPlanet(
        cloud.shadowGroup,
        cloud.theta - 0.018,
        cloudPhi + 0.01,
        0.014,
        cloud.theta * 0.08,
      );
      const shadowBreath =
        1 + Math.sin(elapsed * 0.24 + cloud.phase + cloudIndex) *
          0.08 *
          ambientMotion;
      cloud.shadow.scale.set(
        cloud.scale * 1.35 * shadowBreath,
        1,
        cloud.scale * 0.68 * shadowBreath,
      );
    });

    animatedFoliage.forEach(({ pivot, phase, strength }) => {
      const sway =
        (Math.sin(elapsed * 0.72 + phase) * 0.65 +
          Math.sin(elapsed * 1.47 + phase * 0.73) * 0.35) *
        strength *
        gust *
        ambientMotion;
      pivot.rotation.z = THREE.MathUtils.damp(
        pivot.rotation.z,
        sway,
        3.6,
        delta,
      );
      pivot.rotation.x = THREE.MathUtils.damp(
        pivot.rotation.x,
        sway * 0.46,
        3.2,
        delta,
      );
    });

    animatedFlowers.forEach(({ pivot, phase }) => {
      const sway =
        Math.sin(elapsed * 1.08 + phase) * 0.045 * gust * ambientMotion;
      pivot.rotation.z = THREE.MathUtils.damp(
        pivot.rotation.z,
        sway,
        4,
        delta,
      );
    });

    animatedBoats.forEach(({ group, basePosition, normal, phase }) => {
      const bob =
        Math.sin(elapsed * 0.82 + phase) * 0.022 * ambientMotion;
      group.position.copy(basePosition).addScaledVector(normal, bob);
    });

    chimneySmoke.forEach(({ mesh, phase, originX, originZ }, index) => {
      const progress =
        (elapsed * 0.115 * ambientMotion + phase + index * 0.013) % 1;
      const visibility = Math.sin(progress * Math.PI);
      mesh.position.set(
        originX +
          Math.sin(elapsed * 0.48 + phase * 8) *
            progress *
            0.055 *
            ambientMotion,
        0.81 + progress * 0.38 * ambientMotion,
        originZ + progress * 0.035 * ambientMotion,
      );
      mesh.scale.setScalar(0.42 + progress * 1.25);
      mesh.material.opacity = visibility * 0.13 * ambientMotion;
    });

    lakeRipples.forEach(({ mesh, phase, scaleX, scaleZ }) => {
      const progress = prefersReducedMotion
        ? phase % 1
        : (elapsed * 0.13 + phase) % 1;
      const rippleScale = THREE.MathUtils.lerp(0.9, 2.7, progress);
      mesh.scale.set(
        scaleX * rippleScale,
        1,
        scaleZ * rippleScale,
      );
      mesh.material.opacity =
        Math.sin(progress * Math.PI) * (prefersReducedMotion ? 0.035 : 0.15);
    });

    updateRoadTraffic(delta, elapsed, ambientMotion, prefersReducedMotion);

    animatedStopDetails.forEach((detail) => {
      const { object, type, phase } = detail;
      if (type === "parkLamp") {
        detail.material.emissiveIntensity =
          0.48 + (Math.sin(elapsed * 1.7 + phase) * 0.5 + 0.5) * 0.2 * ambientMotion;
        return;
      }
      if (type === "trafficSignal") {
        const signalState = prefersReducedMotion
          ? "red"
          : getSignalState(elapsed, detail.route);
        detail.materials.red.emissiveIntensity = signalState === "red" ? 1.2 : 0.035;
        detail.materials.amber.emissiveIntensity = signalState === "amber" ? 1.1 : 0.035;
        detail.materials.green.emissiveIntensity = signalState === "green" ? 1.05 : 0.035;
        return;
      }
      if (!object) return;
      if (type === "lesehanBlind") {
        const positions = object.geometry.getAttribute("position");
        const basePositions = detail.basePositions;
        const windStrength = prefersReducedMotion ? 0.006 : 0.025;
        const blindHalfHeight = detail.halfHeight ?? 0.45;
        const blindHeight = detail.height ?? blindHalfHeight * 2;
        for (let index = 0; index < positions.count; index += 1) {
          const x = basePositions[index * 3];
          const y = basePositions[index * 3 + 1];
          const lowerEdge = 1 - (y + blindHalfHeight) / blindHeight;
          positions.setXYZ(
            index,
            x,
            y,
            basePositions[index * 3 + 2] +
              Math.sin(elapsed * 1.05 + detail.phase + x * 4.4) *
                windStrength * lowerEdge,
          );
        }
        positions.needsUpdate = true;
        object.geometry.computeVertexNormals();
        return;
      }
      if (type === "parkTree" || type === "parkPalm") {
        detail.baseRotationX ??= object.rotation.x;
        detail.baseRotationZ ??= object.rotation.z;
        const strength = detail.strength ?? 0.03;
        const sway =
          (Math.sin(elapsed * 0.62 + phase) * 0.7 +
            Math.sin(elapsed * 1.21 + phase * 0.73) * 0.3) *
          strength *
          gust *
          ambientMotion;
        object.rotation.z = THREE.MathUtils.damp(
          object.rotation.z,
          detail.baseRotationZ + sway,
          3.2,
          delta,
        );
        object.rotation.x = THREE.MathUtils.damp(
          object.rotation.x,
          detail.baseRotationX + sway * 0.42,
          3,
          delta,
        );
        return;
      }
      if (type === "pendopoCanopy") {
        const windPulse =
          (0.42 +
            Math.sin(elapsed * 0.43 + phase) * 0.08 +
            Math.sin(elapsed * 0.83 + phase * 0.7) * 0.04) *
          gust *
          ambientMotion;
        (object.userData.fabricPieces ?? []).forEach(
          ({ geometry, basePositions, movementWeights, vertexPhases, motionScale }) => {
            const positions = geometry.getAttribute("position");
            for (let index = 0; index < positions.count; index += 1) {
              const offset = index * 3;
              const baseX = basePositions[offset];
              const baseY = basePositions[offset + 1];
              const baseZ = basePositions[offset + 2];
              const movementWeight = movementWeights[index] ?? 0;
              const vertexPhase = vertexPhases[index] ?? 0;
              const anchoredRipple =
                (Math.sin(elapsed * 0.76 + phase + vertexPhase) * 0.009 +
                  Math.sin(elapsed * 0.38 + phase * 0.63 + vertexPhase * 1.7) *
                    0.003) *
                movementWeight *
                motionScale *
                windPulse;
              const lateralDrift =
                Math.sin(elapsed * 0.51 + phase + vertexPhase * 0.72) *
                movementWeight *
                motionScale *
                0.0024 *
                windPulse;
              positions.setXYZ(
                index,
                baseX + lateralDrift,
                baseY + anchoredRipple,
                baseZ + lateralDrift * 0.34,
              );
            }
            positions.needsUpdate = true;
            geometry.computeVertexNormals();
          },
        );
        return;
      }
      if (type === "pendopoColumnCloth") {
        const clothWind =
          (0.46 +
            Math.sin(elapsed * 0.58 + phase) * 0.07 +
            Math.sin(elapsed * 1.12 + phase * 0.74) * 0.035) *
          gust *
          ambientMotion;
        (object.userData.tailPanels ?? []).forEach(
          ({ geometry, basePositions, height, amplitude, phaseOffset }) => {
            const positions = geometry.getAttribute("position");
            for (let index = 0; index < positions.count; index += 1) {
              const offset = index * 3;
              const baseX = basePositions[offset];
              const baseY = basePositions[offset + 1];
              const baseZ = basePositions[offset + 2];
              const progress = THREE.MathUtils.clamp(-baseY / height, 0, 1);
              const anchoredProgress = Math.pow(progress, 1.7);
              const softBend =
                Math.sin(
                  elapsed * 0.92 +
                    phase +
                    phaseOffset -
                    progress * 1.65,
                ) *
                anchoredProgress *
                amplitude *
                clothWind;
              const edgeFlutter =
                Math.sin(
                  elapsed * 2.05 +
                    phase * 0.63 +
                    phaseOffset +
                    progress * 3.2,
                ) *
                anchoredProgress *
                amplitude *
                0.22 *
                clothWind;
              positions.setXYZ(
                index,
                baseX + edgeFlutter,
                baseY,
                baseZ + softBend,
              );
            }
            positions.needsUpdate = true;
            geometry.computeVertexNormals();
          },
        );
        return;
      }
      if (type === "pendopoPennant") {
        const windPulse =
          0.58 +
          Math.sin(elapsed * 0.63 + phase * 0.71) * 0.12 +
          Math.sin(elapsed * 1.49 + phase) * 0.07;
        const windScale = object.userData.windScale ?? 1;
        const clothWind = windPulse * gust * windScale * ambientMotion;
        (object.userData.pennantPanels ?? []).forEach(
          ({ geometry, basePositions, height, width }) => {
            const positions = geometry.getAttribute("position");
            for (let index = 0; index < positions.count; index += 1) {
              const offset = index * 3;
              const baseX = basePositions[offset];
              const baseY = basePositions[offset + 1];
              const progress = THREE.MathUtils.clamp(-baseY / height, 0, 1);
              const edgeProgress = THREE.MathUtils.clamp(baseX / width, 0, 1);
              const bend = Math.pow(progress, 1.55) * 0.078 * clothWind;
              const flutter =
                Math.sin(elapsed * 3.1 - progress * 4.4 + phase) *
                progress *
                (0.014 + edgeProgress * 0.011) *
                clothWind;
              const ripple =
                Math.sin(elapsed * 1.9 - progress * 2.6 + phase * 0.8) *
                progress *
                0.012 *
                ambientMotion;
              positions.setXYZ(
                index,
                baseX + bend + ripple * edgeProgress,
                baseY - Math.pow(progress, 1.7) * 0.012 * (1 - clothWind * 0.3),
                basePositions[offset + 2] + flutter,
              );
            }
            positions.needsUpdate = true;
            geometry.computeVertexNormals();
          },
        );
        object.rotation.y = THREE.MathUtils.damp(
          object.rotation.y,
          Math.sin(elapsed * 0.67 + phase) * 0.016 * ambientMotion,
          3.4,
          delta,
        );
        object.rotation.z = THREE.MathUtils.damp(
          object.rotation.z,
          Math.sin(elapsed * 0.94 + phase) * 0.008 * ambientMotion,
          3.8,
          delta,
        );
        return;
      }
      if (type === "parkFlag") {
        const windPulse =
          0.72 +
          Math.sin(elapsed * 0.74 + phase * 0.8) * 0.16 +
          Math.sin(elapsed * 1.83 + phase) * 0.08;
        const windScale = object.userData.windScale ?? 1;
        const gravitySag = object.userData.gravitySag ?? 0.065;
        const clothWind = windPulse * gust * windScale * ambientMotion;
        (object.userData.flagPanels ?? []).forEach(
          ({ geometry, basePositions, width }) => {
            const positions = geometry.getAttribute("position");
            for (let index = 0; index < positions.count; index += 1) {
              const offset = index * 3;
              const baseX = basePositions[offset];
              const progress = THREE.MathUtils.clamp(baseX / width, 0, 1);
              const wave =
                Math.sin(
                  elapsed * 5.1 - progress * 5.8 + phase,
                ) *
                progress *
                0.025 *
                clothWind;
              const curl =
                Math.sin(elapsed * 2.7 - progress * 2.2 + phase) *
                progress *
                0.008 *
                ambientMotion;
              const sag =
                Math.pow(progress, 1.55) *
                gravitySag *
                (1 - THREE.MathUtils.clamp(clothWind, 0, 1) * 0.34);
              positions.setXYZ(
                index,
                baseX - progress * progress * 0.006 * windPulse,
                basePositions[offset + 1] + curl - sag,
                basePositions[offset + 2] + wave,
              );
            }
            positions.needsUpdate = true;
            geometry.computeVertexNormals();
          },
        );
        object.rotation.y = THREE.MathUtils.damp(
          object.rotation.y,
          -0.08 + Math.sin(elapsed * 0.72 + phase) * 0.08 * ambientMotion,
          4,
          delta,
        );
        object.rotation.z = THREE.MathUtils.damp(
          object.rotation.z,
          Math.sin(elapsed * 1.35 + phase) * 0.025 * ambientMotion,
          4.4,
          delta,
        );
        return;
      }
      if (type === "fountainJet") {
        const pulse =
          0.68 +
          (Math.sin(elapsed * 1.9 + phase) * 0.5 + 0.5) * 0.32 * ambientMotion;
        const scaledHeight = detail.height * pulse;
        object.scale.y = scaledHeight;
        object.position.y = 0.2 + scaledHeight * 0.31;
        object.material.opacity = 0.72 + pulse * 0.14;
        return;
      }
      if (type === "fountainMist") {
        const progress = (elapsed * 0.22 * ambientMotion + phase) % 1;
        const driftRadius = detail.radius + progress * 0.42;
        object.position.set(
          Math.cos(detail.angle + progress * 0.9) * driftRadius,
          0.42 + progress * 0.74,
          Math.sin(detail.angle + progress * 0.9) * driftRadius,
        );
        object.scale.setScalar(0.4 + progress * 1.25);
        object.material.opacity = Math.sin(progress * Math.PI) * 0.22 * ambientMotion;
        return;
      }
      if (type === "parkWalker") {
        let routeX;
        let routeZ;
        let tangentX;
        let tangentZ;
        if (detail.route?.type === "line") {
          const deltaNorth = detail.route.endNorth - detail.route.startNorth;
          const deltaEast = detail.route.endEast - detail.route.startEast;
          const routeLength = Math.max(0.001, Math.hypot(deltaNorth, deltaEast));
          const travel =
            (phase + elapsed * detail.speed * ambientMotion) % (routeLength * 2);
          const movingForward = travel <= routeLength;
          const routeProgress = movingForward
            ? travel / routeLength
            : 2 - travel / routeLength;
          routeX = THREE.MathUtils.lerp(
            detail.route.startNorth,
            detail.route.endNorth,
            routeProgress,
          );
          routeZ = THREE.MathUtils.lerp(
            detail.route.startEast,
            detail.route.endEast,
            routeProgress,
          );
          tangentX = deltaNorth * (movingForward ? 1 : -1);
          tangentZ = deltaEast * (movingForward ? 1 : -1);
        } else {
          const routeAngle = phase + elapsed * detail.speed * ambientMotion;
          routeX = detail.centerX + Math.cos(routeAngle) * detail.radiusX;
          routeZ = detail.centerZ + Math.sin(routeAngle) * detail.radiusZ;
          tangentX = -Math.sin(routeAngle) * detail.radiusX * detail.speed;
          tangentZ = Math.cos(routeAngle) * detail.radiusZ * detail.speed;
        }
        object.position.set(
          routeX,
          0.085 + Math.abs(Math.sin(elapsed * 5.2 + phase)) * 0.02 * ambientMotion,
          routeZ,
        );
        object.rotation.y = Math.atan2(tangentX, tangentZ);
        detail.legs.children.forEach((leg, index) => {
          leg.rotation.z =
            Math.sin(elapsed * 5.2 + phase + index * Math.PI) * 0.42 * ambientMotion;
        });
        return;
      }
      if (type === "parkBollard") {
        object.position.y =
          detail.baseY + Math.sin(elapsed * 1.45 + phase) * 0.012 * ambientMotion;
        object.rotation.y = Math.sin(elapsed * 0.6 + phase) * 0.025 * ambientMotion;
        return;
      }
      if (type === "parkBarrier") {
        const barrierCycle = (elapsed * 0.018 + phase) % 1;
        let openProgress = 0;
        if (barrierCycle >= 0.82 && barrierCycle < 0.86) {
          openProgress = THREE.MathUtils.smoothstep(barrierCycle, 0.82, 0.86);
        } else if (barrierCycle >= 0.86 && barrierCycle < 0.92) {
          openProgress = 1;
        } else if (barrierCycle >= 0.92 && barrierCycle < 0.98) {
          openProgress = 1 - THREE.MathUtils.smoothstep(barrierCycle, 0.92, 0.98);
        }
        object.rotation.x = -openProgress * 0.95 * ambientMotion;
        return;
      }
      if (type === "parkFlower") {
        const sway = Math.sin(elapsed * 1.08 + phase) * 0.007 * ambientMotion;
        object.position.x = detail.baseX + sway;
        object.position.z = detail.baseZ + Math.sin(elapsed * 0.86 + phase * 0.73) * 0.004 * ambientMotion;
        return;
      }
      if (type === "streetVehicle" || type === "crossStreetVehicle") {
        // Updated as a route group above, so every vehicle uses the same-frame
        // proposed position of its leader before its transform is committed.
        return;
      }
      if (type === "spin") {
        object.rotation.z -= delta * 0.72 * ambientMotion;
        return;
      }
      if (type === "vane") {
        object.rotation.y = THREE.MathUtils.damp(
          object.rotation.y,
          Math.sin(elapsed * 0.42 + phase) * 0.34 * ambientMotion,
          2.8,
          delta,
        );
        return;
      }
      const swayAmount = type === "bell" ? 0.075 : 0.035;
      object.rotation.z = THREE.MathUtils.damp(
        object.rotation.z,
        Math.sin(elapsed * 0.86 + phase) * swayAmount * ambientMotion,
        3.4,
        delta,
      );
    });

    waterMaterial.emissiveIntensity =
      0.055 + Math.sin(elapsed * 0.7) * 0.018 * ambientMotion;
    townWindowMaterial.emissiveIntensity =
      0.12 + (Math.sin(elapsed * 0.34) * 0.5 + 0.5) * 0.035 * ambientMotion;
    targetMaterial.emissiveIntensity =
      0.4 + Math.sin(elapsed * 2.4) * 0.07 * ambientMotion;

    stops.forEach((stop, index) => {
      stop.group.scale.setScalar(stop.baseScale);
      const active =
        index === gameState.targetIndex &&
        gameState.started &&
        !gameState.complete;
      const roofIdleGlow = stop.kind === "pendopo" ? 0.07 : 0.08;
      const roofActiveGlow = stop.kind === "pendopo" ? 0.15 : 0.18;
      stop.roofMaterial.emissiveIntensity = THREE.MathUtils.damp(
        stop.roofMaterial.emissiveIntensity,
        active ? roofActiveGlow : roofIdleGlow,
        5,
        delta,
      );
      if (!active) return;

      const pulse = prefersReducedMotion
        ? 1
        : 1 + Math.sin(elapsed * 4.8) * 0.055;
      stop.marker.scale.setScalar(pulse);
      stop.marker.userData.groundRing.scale.setScalar(
        1 + (pulse - 1) * 1.8,
      );
      stop.marker.userData.beacon.position.y =
        (stop.marker.userData.beaconBaseY ?? 0.98) +
        Math.sin(elapsed * 2.6) * 0.045 * ambientMotion;
      stop.marker.userData.beacon.rotation.y =
        elapsed * 0.56 * ambientMotion;
      stop.marker.userData.beaconHalo.scale.setScalar(
        1 + Math.sin(elapsed * 3.2) * 0.08 * ambientMotion,
      );
    });
  }

  return {
    updateAmbientAnimation,
  };
}
