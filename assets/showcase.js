(() => {
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const lerp = (start, end, progress) => start + (end - start) * progress;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const splitText = () => {
    document.querySelectorAll("[data-split-text]").forEach((element) => {
      if (element.dataset.splitReady === "true") {
        return;
      }

      const text = element.dataset.splitText || element.textContent.trim();
      element.dataset.splitReady = "true";
      element.setAttribute("aria-label", text);
      element.textContent = "";

      Array.from(text).forEach((character, index) => {
        const span = document.createElement("span");
        span.className = "split-letter";
        span.setAttribute("aria-hidden", "true");
        span.dataset.letterIndex = String(index);
        span.textContent = character === " " ? "\u00a0" : character;
        element.appendChild(span);
      });
    });
  };

  splitText();

  const revealItems = document.querySelectorAll("[data-reveal]");

  if (revealItems.length && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.18 });

    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  document.querySelectorAll(".showcase-item").forEach((item) => {
    const media = item.querySelector(".showcase-media");

    if (!media) {
      return;
    }

    item.addEventListener("pointermove", (event) => {
      const rect = item.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 14;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 14;

      media.style.setProperty("--pointer-x", `${x.toFixed(2)}px`);
      media.style.setProperty("--pointer-y", `${y.toFixed(2)}px`);
    });

    item.addEventListener("pointerleave", () => {
      media.style.setProperty("--pointer-x", "0px");
      media.style.setProperty("--pointer-y", "0px");
    });
  });

  const hero = document.querySelector("[data-editorial-hero]");
  const heroLetters = hero ? Array.from(hero.querySelectorAll(".split-letter")) : [];
  const stage = document.querySelector("[data-showcase-stage]");
  const progressBar = document.querySelector(".portfolio-progress__bar");
  const workPicker = stage?.querySelector(".work-picker");
  const projectLinks = stage ? Array.from(stage.querySelectorAll("[data-project]")) : [];
  const stageLetters = stage ? Array.from(stage.querySelectorAll(".recent-stage__heading .split-letter")) : [];
  const stageWorld = stage?.querySelector(".stage-world");
  const stageScreen = stage?.querySelector(".stage-screen");
  const stageScreenImage = stageScreen?.querySelector("img");
  const stageScreenIndex = stageScreen?.querySelector(".stage-screen__index");
  const stageScreenTitle = stageScreen?.querySelector(".stage-screen__title");
  const stageScreenMeta = stageScreen?.querySelector(".stage-screen__meta");
  const stageCaseLink = stage?.querySelector(".stage-case-link");
  const canvas = stage?.querySelector(".showcase-canvas");
  const hasThree = Boolean(canvas && window.THREE);
  let context = hasThree ? null : canvas?.getContext("2d");
  let projectorScene = null;
  let activeProject = -1;
  let manualProjectUntil = 0;
  let latestStageProgress = 0;
  let animationFrame = 0;
  let railFrame = 0;
  let railSettleTimer = 0;
  let isSyncingRail = false;
  let railUserInteracted = false;

  const updateScreenImageOrientation = () => {
    if (!stageScreen || !stageScreenImage || !stageScreenImage.naturalWidth || !stageScreenImage.naturalHeight) {
      return;
    }

    const imageWidth = stageScreenImage.naturalWidth;
    const imageHeight = stageScreenImage.naturalHeight;
    const imageDelta = Math.abs(imageWidth - imageHeight);
    const isSquare = imageDelta <= Math.max(imageWidth, imageHeight) * 0.12;
    const isPortrait = !isSquare && imageHeight > imageWidth * 1.08;

    stageScreen.classList.toggle("is-portrait-image", isPortrait);
    stageScreen.classList.toggle("is-square-image", isSquare);
    stageScreen.classList.toggle("is-landscape-image", !isPortrait && !isSquare);
  };

  const centerProjectInRail = (link) => {
    if (!workPicker || !link) {
      return;
    }

    const left = link.offsetLeft - (workPicker.clientWidth - link.clientWidth) / 2;
    isSyncingRail = true;
    workPicker.scrollTo({
      left,
      behavior: "auto",
    });
    window.setTimeout(() => {
      isSyncingRail = false;
    }, 160);
  };

  const setProject = (link, manual = false, syncRail = true) => {
    if (!link || !stageScreen) {
      return;
    }

    const nextProject = Number(link.dataset.project || 0);

    if (activeProject === nextProject && !manual) {
      return;
    }

    activeProject = nextProject;
    if (manual) {
      manualProjectUntil = Date.now() + 1800;
    }

    projectLinks.forEach((item) => {
      item.classList.toggle("is-active", item === link);
      item.setAttribute("aria-current", item === link ? "true" : "false");
    });

    stageScreen.dataset.preview = link.dataset.preview || "terminal";
    stageScreen.classList.remove("is-portrait-image", "is-square-image", "is-landscape-image");
    stageScreen.classList.toggle("has-image", Boolean(link.dataset.image));

    if (stageScreenImage && link.dataset.image) {
      stageScreenImage.addEventListener("load", updateScreenImageOrientation, { once: true });

      if (stageScreenImage.getAttribute("src") !== link.dataset.image) {
        stageScreenImage.src = link.dataset.image;
      }

      if (stageScreenImage.complete) {
        updateScreenImageOrientation();
      }
    }

    if (stageScreenIndex) {
      stageScreenIndex.textContent = String(nextProject + 1).padStart(2, "0");
    }

    if (stageScreenTitle) {
      stageScreenTitle.textContent = link.dataset.title || link.textContent.trim();
    }

    if (stageScreenMeta) {
      stageScreenMeta.textContent = link.dataset.meta || "";
    }

    if (stageCaseLink) {
      stageCaseLink.href = link.href;
      if (link.target === "_blank") {
        stageCaseLink.target = "_blank";
        stageCaseLink.rel = "noopener noreferrer";
      } else {
        stageCaseLink.removeAttribute("target");
        stageCaseLink.removeAttribute("rel");
      }
    }

    if (syncRail) {
      centerProjectInRail(link);
    }
  };

  projectLinks.forEach((link) => {
    link.addEventListener("focus", () => {
      railUserInteracted = true;
      setProject(link, true);
    });

    link.addEventListener("keydown", (event) => {
      const currentIndex = projectLinks.indexOf(link);
      const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;

      if (!direction) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      railUserInteracted = true;
      const nextLink = projectLinks[clamp(currentIndex + direction, 0, projectLinks.length - 1)];
      nextLink.focus();
      setProject(nextLink, true);
    });
  });

  document.addEventListener("focus", (event) => {
    const link = event.target.closest?.("[data-project]");

    if (link && projectLinks.includes(link)) {
      railUserInteracted = true;
      setProject(link, true);
    }
  }, true);

  document.addEventListener("keydown", (event) => {
    const link = document.activeElement?.closest?.("[data-project]");
    const currentIndex = projectLinks.indexOf(link);
    const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;

    if (!link || currentIndex < 0 || !direction) {
      return;
    }

    event.preventDefault();
    railUserInteracted = true;
    const nextLink = projectLinks[clamp(currentIndex + direction, 0, projectLinks.length - 1)];
    nextLink.focus();
    setProject(nextLink, true);
  }, true);

  if (projectLinks.length) {
    setProject(projectLinks[0], true);
    manualProjectUntil = 0;
    window.requestAnimationFrame(() => centerProjectInRail(projectLinks[0]));
    window.setTimeout(() => {
      if (!railUserInteracted) {
        centerProjectInRail(projectLinks[0]);
      }
    }, 260);
  }

  const updateProjectFromRail = () => {
    if (!workPicker || !projectLinks.length || isSyncingRail || !railUserInteracted) {
      return;
    }

    const pickerRect = workPicker.getBoundingClientRect();
    const pickerCenter = pickerRect.left + pickerRect.width / 2;
    const nearest = projectLinks.reduce((closest, link) => {
      const rect = link.getBoundingClientRect();
      const distance = Math.abs(rect.left + rect.width / 2 - pickerCenter);
      return distance < closest.distance ? { link, distance } : closest;
    }, { link: projectLinks[0], distance: Number.POSITIVE_INFINITY }).link;

    setProject(nearest, true, false);
  };

  if (workPicker) {
    let isDragging = false;
    let dragStartX = 0;
    let dragStartScroll = 0;
    let activePointerId = null;
    let lastPointerDownAt = 0;
    let suppressClick = false;

    workPicker.addEventListener("scroll", () => {
      if (railFrame) {
        window.cancelAnimationFrame(railFrame);
      }

      if (railSettleTimer) {
        window.clearTimeout(railSettleTimer);
      }

      railFrame = window.requestAnimationFrame(updateProjectFromRail);
      railSettleTimer = window.setTimeout(updateProjectFromRail, 220);
    }, { passive: true });

    workPicker.addEventListener("focusin", (event) => {
      const link = event.target.closest("[data-project]");

      if (link) {
        railUserInteracted = true;
        setProject(link, true);
      }
    });

    workPicker.addEventListener("keydown", (event) => {
      const link = event.target.closest("[data-project]");
      const currentIndex = projectLinks.indexOf(link);
      const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;

      if (!link || currentIndex < 0 || !direction) {
        return;
      }

      event.preventDefault();
      railUserInteracted = true;
      const nextLink = projectLinks[clamp(currentIndex + direction, 0, projectLinks.length - 1)];
      nextLink.focus();
      setProject(nextLink, true);
    });

    workPicker.addEventListener("wheel", (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }

      event.preventDefault();
      railUserInteracted = true;
      workPicker.scrollLeft += event.deltaY;
    }, { passive: false });

    const beginDrag = (clientX) => {
      isDragging = true;
      railUserInteracted = true;
      suppressClick = false;
      dragStartX = clientX;
      dragStartScroll = workPicker.scrollLeft;
      workPicker.classList.add("is-dragging");
    };

    const moveDrag = (clientX) => {
      const delta = clientX - dragStartX;
      if (Math.abs(delta) > 4) {
        suppressClick = true;
      }

      workPicker.scrollLeft = dragStartScroll - delta;
    };

    const finishDrag = (event) => {
      if (!isDragging) {
        return;
      }

      isDragging = false;
      activePointerId = null;
      workPicker.classList.remove("is-dragging");

      if (event?.pointerId !== undefined && workPicker.hasPointerCapture(event.pointerId)) {
        workPicker.releasePointerCapture(event.pointerId);
      }

      updateProjectFromRail();
      window.setTimeout(updateProjectFromRail, 260);
    };

    workPicker.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }

      activePointerId = event.pointerId;
      lastPointerDownAt = Date.now();
      beginDrag(event.clientX);
      workPicker.setPointerCapture(event.pointerId);
    });

    workPicker.addEventListener("pointermove", (event) => {
      if (!isDragging) {
        const link = event.target.closest("[data-project]");

        if (link && projectLinks.includes(link)) {
          railUserInteracted = true;
          setProject(link, true);
        }

        return;
      }

      if (activePointerId !== null && event.pointerId !== activePointerId) {
        return;
      }

      moveDrag(event.clientX);
    });

    workPicker.addEventListener("mousedown", (event) => {
      if (event.button !== 0 || Date.now() - lastPointerDownAt < 500) {
        return;
      }

      beginDrag(event.clientX);
    });

    window.addEventListener("mousemove", (event) => {
      if (isDragging && activePointerId === null) {
        moveDrag(event.clientX);
      }
    });

    window.addEventListener("mouseup", (event) => {
      if (activePointerId === null) {
        finishDrag(event);
      }
    });

    workPicker.addEventListener("pointerup", finishDrag);
    workPicker.addEventListener("pointercancel", finishDrag);

    workPicker.addEventListener("click", (event) => {
      if (!suppressClick) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    }, true);
  }

  const createProjectorScene = () => {
    if (!canvas || !stage || !window.THREE) {
      return null;
    }

    const THREE = window.THREE;
    let renderer;

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      });
    } catch (error) {
      return null;
    }

    if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    const scene = new THREE.Scene();
    scene.background = null;
    renderer.setClearColor(0x000000, 0);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    scene.add(camera);

    scene.add(new THREE.AmbientLight(0x8f969f, 0.55));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(2.2, 4.5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x75c7a0, 0.65);
    rimLight.position.set(-3, 2.2, 1.4);
    scene.add(rimLight);

    const lensLight = new THREE.PointLight(0xffefb0, 0, 4.5);
    lensLight.position.set(0, 0.62, 1.45);
    scene.add(lensLight);

    const projector = new THREE.Group();
    projector.position.set(0, 0.36, 0.15);
    scene.add(projector);

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x191c21,
      roughness: 0.54,
      metalness: 0.55,
    });
    const bevelMaterial = new THREE.MeshStandardMaterial({
      color: 0x343942,
      roughness: 0.48,
      metalness: 0.5,
    });
    const lensMaterial = new THREE.MeshStandardMaterial({
      color: 0x343942,
      emissive: 0x1c2229,
      emissiveIntensity: 0.32,
      roughness: 0.44,
      metalness: 0.46,
    });
    const darkMaterial = new THREE.MeshStandardMaterial({
      color: 0x050607,
      roughness: 0.72,
      metalness: 0.2,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.48, 1.05), bodyMaterial);
    body.position.y = 0.34;
    projector.add(body);

    const topPlate = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.08, 0.88), bevelMaterial);
    topPlate.position.set(0, 0.62, 0);
    projector.add(topPlate);

    const rearPanel = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.16, 0.035), darkMaterial);
    rearPanel.position.set(0, 0.36, 0.545);
    projector.add(rearPanel);

    [-0.36, -0.12, 0.12, 0.36].forEach((x) => {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.022, 0.045), bevelMaterial);
      vent.position.set(x, 0.38, 0.57);
      projector.add(vent);
    });

    const frontLensHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 48), lensMaterial);
    frontLensHousing.rotation.x = Math.PI / 2;
    frontLensHousing.position.set(0, 0.48, -0.625);
    projector.add(frontLensHousing);

    const frontLensFace = new THREE.Mesh(new THREE.CircleGeometry(0.085, 48), lensMaterial);
    frontLensFace.rotation.y = Math.PI;
    frontLensFace.position.set(0, 0.48, -0.68);
    projector.add(frontLensFace);

    const frontLensTrim = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.008, 8, 48), lensMaterial);
    frontLensTrim.position.set(0, 0.48, -0.684);
    projector.add(frontLensTrim);

    const lensGlow = new THREE.Mesh(
      new THREE.CircleGeometry(0.26, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffefb0,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    lensGlow.position.set(0, 0.35, -0.862);
    lensGlow.visible = false;

    stage.classList.add("has-projector-webgl");

    return {
      renderer,
      scene,
      camera,
      projector,
      lensGlow,
      lensLight,
    };
  };

  const resizeProjectorScene = () => {
    if (!projectorScene || !canvas) {
      return;
    }

    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    projectorScene.renderer.setPixelRatio(ratio);
    projectorScene.renderer.setSize(width, height, false);
    projectorScene.camera.aspect = width / height;
    projectorScene.camera.updateProjectionMatrix();
  };

  const renderProjectorScene = (time = 0) => {
    if (!projectorScene || !canvas) {
      return;
    }

    resizeProjectorScene();

    const width = canvas.clientWidth;
    const progress = latestStageProgress;
    const compactStage = width <= 760;
    const cameraProgress = clamp(progress / 0.36);
    const cameraEase = 1 - Math.pow(1 - cameraProgress, 3);
    const beamRevealProgress = clamp((cameraProgress - 0.22) / 0.78);
    const beamRevealEase = 1 - Math.pow(1 - beamRevealProgress, 3);
    const projectorZ = lerp(0.12, compactStage ? 2.05 : 2.24, cameraEase);

    projectorScene.camera.fov = lerp(compactStage ? 47 : 40, compactStage ? 52 : 44, cameraEase);
    projectorScene.camera.position.set(
      0,
      lerp(compactStage ? 7.2 : 7.8, compactStage ? 2.5 : 2.08, cameraEase),
      lerp(0.16, compactStage ? 6.15 : 6.25, cameraEase),
    );
    projectorScene.camera.lookAt(
      0,
      lerp(0.02, compactStage ? 0.96 : 0.88, cameraEase),
      lerp(0.05, compactStage ? -1.18 : -1.42, cameraEase),
    );
    projectorScene.camera.updateProjectionMatrix();

    projectorScene.projector.position.set(0, 0.36, projectorZ);
    projectorScene.projector.scale.setScalar(lerp(compactStage ? 0.78 : 0.84, compactStage ? 0.96 : 1.06, cameraEase));
    projectorScene.projector.rotation.y = Math.sin(time / 1900) * 0.012;

    projectorScene.lensGlow.material.opacity = beamRevealEase * 0.72;
    projectorScene.lensLight.position.set(0, 0.72, projectorZ - 0.9);
    projectorScene.lensLight.intensity = beamRevealEase * 2.1;

    projectorScene.renderer.render(projectorScene.scene, projectorScene.camera);
  };

  const resizeCanvas = () => {
    if (!canvas || !context) {
      resizeProjectorScene();
      return;
    }

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.floor(canvas.clientHeight * ratio));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const drawCanvas = (time = 0) => {
    if (projectorScene) {
      renderProjectorScene(time);
      return;
    }

    if (!canvas || !context) {
      return;
    }

    resizeCanvas();

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const progress = latestStageProgress;
    const cameraProgress = clamp(progress / 0.36);
    const cameraEase = 1 - Math.pow(1 - cameraProgress, 3);
    const centerX = width / 2;
    const horizon = height * lerp(0.16, 0.29 + progress * 0.08, cameraEase);
    const floorBottom = height + lerp(110, 40, cameraEase);

    context.clearRect(0, 0, width, height);
    context.fillStyle = "#101010";
    context.fillRect(0, 0, width, height);

    const glowY = height * lerp(0.66, 0.73, cameraEase);
    const glow = context.createRadialGradient(centerX, glowY, 0, centerX, glowY, width * lerp(0.36, 0.45, cameraEase));
    glow.addColorStop(0, "rgba(245,245,245,0.17)");
    glow.addColorStop(0.42, "rgba(160,160,160,0.07)");
    glow.addColorStop(1, "rgba(16,16,16,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    context.strokeStyle = "rgba(245,245,245,0.1)";
    context.lineWidth = 1;

    for (let index = -7; index <= 7; index += 1) {
      const floorX = centerX + index * width * lerp(0.095, 0.078, cameraEase);
      context.beginPath();
      context.moveTo(centerX, horizon);
      context.lineTo(floorX, floorBottom);
      context.stroke();
    }

    for (let index = 0; index < 11; index += 1) {
      const depth = index / 10;
      const y = horizon + Math.pow(depth, 1.8) * (floorBottom - horizon);
      const halfWidth = width * (lerp(0.12, 0.06, cameraEase) + depth * lerp(0.5, 0.46, cameraEase));
      context.beginPath();
      context.moveTo(centerX - halfWidth, y);
      context.lineTo(centerX + halfWidth, y);
      context.stroke();
    }

    const stageStyle = stage ? getComputedStyle(stage) : null;
    const cssBeamTop = parseFloat(stageStyle?.getPropertyValue("--projector-beam-top") || "");
    const cssBeamHeight = parseFloat(stageStyle?.getPropertyValue("--projector-beam-height") || "");
    const cssBeamOpacity = parseFloat(stageStyle?.getPropertyValue("--projector-beam-opacity") || "");
    const cssBeamWidth = parseFloat(stageStyle?.getPropertyValue("--projector-beam-width") || "");
    const cssProjectorTop = parseFloat(stageStyle?.getPropertyValue("--projector-top") || "");
    const cssProjectorY = parseFloat(stageStyle?.getPropertyValue("--projector-y") || "");
    const cssProjectorScale = parseFloat(stageStyle?.getPropertyValue("--projector-scale") || "");
    const beamTop = Number.isFinite(cssBeamTop) ? cssBeamTop : height * lerp(0.24, 0.22, cameraEase);
    const beamHeight = Number.isFinite(cssBeamHeight) ? cssBeamHeight : height * lerp(0, 0.48, cameraEase);
    const beamOpacity = Number.isFinite(cssBeamOpacity) ? cssBeamOpacity : 0;
    const beamWidth = Number.isFinite(cssBeamWidth) ? cssBeamWidth : width * lerp(0.16, 0.34, cameraEase);
    const projectorTop = Number.isFinite(cssProjectorTop) ? cssProjectorTop : height * lerp(0.54, 0.66, cameraEase);
    const projectorY = Number.isFinite(cssProjectorY) ? cssProjectorY : 0;
    const projectorScale = Number.isFinite(cssProjectorScale) ? cssProjectorScale : lerp(0.72, 1, cameraEase);
    const projectorCenterY = projectorTop + projectorY + height * 0.06 * projectorScale;
    const projectorWidth = Math.min(width * 0.22, 240) * projectorScale;
    const projectorHeight = projectorWidth * 0.42;
    const beamMaxOpacity = width <= 760 ? 0.2 : 0.24;
    const lightReveal = clamp(beamOpacity / beamMaxOpacity);
    const beamHit = beamTop + beamHeight;

    if (beamOpacity > 0.001 && beamHeight > 1) {
      const beamGradient = context.createLinearGradient(centerX, beamTop, centerX, beamHit);
      beamGradient.addColorStop(0, `rgba(255,246,204,${(beamOpacity * 0.56).toFixed(3)})`);
      beamGradient.addColorStop(0.5, `rgba(245,245,245,${(beamOpacity * 0.36).toFixed(3)})`);
      beamGradient.addColorStop(1, "rgba(245,245,245,0)");
      context.fillStyle = beamGradient;
      context.beginPath();
      context.moveTo(centerX - beamWidth * 0.5, beamTop);
      context.lineTo(centerX + beamWidth * 0.5, beamTop);
      context.lineTo(centerX + projectorWidth * 0.08, beamHit);
      context.lineTo(centerX - projectorWidth * 0.08, beamHit);
      context.closePath();
      context.fill();
    }

    const screenGlowY = height * lerp(0.26, 0.3, cameraEase);
    const screenPool = context.createRadialGradient(centerX, screenGlowY, 0, centerX, screenGlowY, width * 0.16);
    screenPool.addColorStop(0, `rgba(245,245,245,${(0.1 * lightReveal).toFixed(3)})`);
    screenPool.addColorStop(0.4, `rgba(245,245,245,${(0.04 * lightReveal).toFixed(3)})`);
    screenPool.addColorStop(1, "rgba(16,16,16,0)");
    context.fillStyle = screenPool;
    context.beginPath();
    context.ellipse(centerX, screenGlowY, width * 0.12, height * 0.08, 0, 0, Math.PI * 2);
    context.fill();

    const floorPool = context.createRadialGradient(centerX, projectorCenterY + projectorHeight * 0.34, 0, centerX, projectorCenterY + projectorHeight * 0.34, width * 0.16);
    floorPool.addColorStop(0, `rgba(245,245,245,${(0.16 * lightReveal).toFixed(3)})`);
    floorPool.addColorStop(0.48, `rgba(245,245,245,${(0.05 * lightReveal).toFixed(3)})`);
    floorPool.addColorStop(1, "rgba(16,16,16,0)");
    context.fillStyle = floorPool;
    context.beginPath();
    context.ellipse(centerX, projectorCenterY + projectorHeight * 0.34, width * 0.13, height * 0.07, 0, 0, Math.PI * 2);
    context.fill();

    const sweep = (Math.sin(time / 1100) + 1) / 2;
    context.fillStyle = `rgba(245,245,245,${((0.006 + sweep * 0.01) * lightReveal).toFixed(3)})`;
    context.beginPath();
    context.moveTo(centerX - beamWidth * 0.16, beamTop);
    context.lineTo(centerX + beamWidth * 0.16, beamTop);
    context.lineTo(centerX + projectorWidth * (0.1 + sweep * 0.02), beamHit);
    context.lineTo(centerX - projectorWidth * (0.1 + sweep * 0.018), beamHit);
    context.closePath();
    context.fill();

    context.save();
    context.translate(centerX, projectorCenterY);
    context.scale(projectorScale, projectorScale);

    context.fillStyle = "rgba(0,0,0,0.42)";
    context.beginPath();
    context.ellipse(0, projectorHeight * 0.56, projectorWidth * 0.52, projectorHeight * 0.34, 0, 0, Math.PI * 2);
    context.fill();

    const bodyGradient = context.createLinearGradient(0, -projectorHeight * 0.24, 0, projectorHeight * 0.42);
    bodyGradient.addColorStop(0, "#3c424a");
    bodyGradient.addColorStop(0.45, "#181b20");
    bodyGradient.addColorStop(1, "#060607");
    context.fillStyle = bodyGradient;
    context.strokeStyle = "rgba(245,245,245,0.24)";
    context.lineWidth = 1;
    context.beginPath();
    context.roundRect(-projectorWidth * 0.42, -projectorHeight * 0.12, projectorWidth * 0.84, projectorHeight * 0.52, 8);
    context.fill();
    context.stroke();

    const lensX = 0;
    const lensY = -projectorHeight * 0.16;
    const lensRadiusX = projectorWidth * 0.13;
    const lensRadiusY = projectorWidth * 0.1;
    const lensGradient = context.createRadialGradient(
      lensX - lensRadiusX * 0.36,
      lensY - lensRadiusY * 0.4,
      0,
      lensX,
      lensY,
      lensRadiusX * 1.08,
    );
    lensGradient.addColorStop(0, "#4a515a");
    lensGradient.addColorStop(0.52, "#343942");
    lensGradient.addColorStop(1, "#252b33");
    context.fillStyle = lensGradient;
    context.beginPath();
    context.ellipse(lensX, lensY, lensRadiusX, lensRadiusY, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(245,245,245,0.24)";
    context.stroke();

    context.fillStyle = "rgba(245,245,245,0.28)";
    for (let index = -2; index <= 2; index += 1) {
      context.fillRect(index * projectorWidth * 0.075 - projectorWidth * 0.018, projectorHeight * 0.08, projectorWidth * 0.036, 3);
    }

    context.restore();
  };

  const animateCanvas = (time) => {
    drawCanvas(time);
    if (!prefersReducedMotion && canvas) {
      animationFrame = window.requestAnimationFrame(animateCanvas);
    }
  };

  const updateScroll = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const pageProgress = scrollable > 0 ? clamp(window.scrollY / scrollable) : 0;

    if (progressBar) {
      progressBar.style.transform = `scaleX(${pageProgress})`;
    }

    if (hero) {
      const rect = hero.getBoundingClientRect();
      const heroScrollable = Math.max(1, rect.height - window.innerHeight * 0.45);
      const heroProgress = clamp((0 - rect.top) / heroScrollable);
      hero.style.setProperty("--hero-progress", heroProgress.toFixed(3));

      if (!prefersReducedMotion) {
        heroLetters.forEach((letter, index) => {
          const direction = index % 2 === 0 ? -1 : 1;
          const stagger = (index % 7) * 4;
          const y = heroProgress * direction * (90 + stagger);
          const rotate = heroProgress * direction * 2.2;
          letter.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) rotate(${rotate.toFixed(2)}deg)`;
        });
      }
    }

    if (stage) {
      const rect = stage.getBoundingClientRect();
      const stageScrollable = Math.max(1, stage.offsetHeight - window.innerHeight);
      const stageProgress = clamp((0 - rect.top) / stageScrollable);
      latestStageProgress = stageProgress;
      const cameraProgress = clamp(stageProgress / 0.36);
      const cameraEase = 1 - Math.pow(1 - cameraProgress, 3);
      const headingProgress = clamp(stageProgress / 0.2);
      const headingEase = 1 - Math.pow(1 - headingProgress, 2);
      const controlsProgress = clamp((stageProgress - 0.26) / 0.16);
      const controlsEase = 1 - Math.pow(1 - controlsProgress, 2);
      const compactStage = window.innerWidth <= 760;
      const startWorldTilt = compactStage ? 34 : 42;
      const startScreenTop = compactStage ? window.innerHeight * 0.22 : window.innerHeight * 0.13;
      const endScreenTop = compactStage ? window.innerHeight * 0.25 : window.innerHeight * 0.105;
      const startScreenWidth = compactStage ? Math.min(260, window.innerWidth * 0.72) : Math.min(380, window.innerWidth * 0.27);
      const endScreenWidth = compactStage ? Math.min(344, window.innerWidth * 0.9) : Math.min(520, window.innerWidth * 0.36);
      const startScreenTilt = compactStage ? 78 : 82;
      const startScreenDepth = compactStage ? 0.28 : 0.22;
      const startFloorTilt = compactStage ? 60 : 61;
      const endFloorTilt = compactStage ? 70 : 69;
      const startProjectorTop = compactStage ? window.innerHeight * 0.56 : window.innerHeight * 0.52;
      const endProjectorTop = compactStage ? window.innerHeight * 0.64 : window.innerHeight * 0.68;
      const startProjectorScale = compactStage ? 0.68 : 0.72;
      const endProjectorScale = compactStage ? 0.96 : 1.06;
      const startProjectorTilt = compactStage ? 72 : 74;
      const endProjectorTilt = compactStage ? 12 : 8;
      const beamRevealProgress = clamp((cameraProgress - 0.22) / 0.78);
      const beamRevealEase = 1 - Math.pow(1 - beamRevealProgress, 3);
      const beamMaxOpacity = compactStage ? 0.46 : 0.56;
      const startBeamWidth = compactStage ? Math.min(90, window.innerWidth * 0.3) : Math.min(160, window.innerWidth * 0.12);
      const endBeamWidth = compactStage ? Math.min(270, window.innerWidth * 0.7) : Math.min(520, window.innerWidth * 0.36);
      const startBeamHeight = 0;
      const currentScreenTop = lerp(startScreenTop, endScreenTop, cameraEase);
      const currentScreenWidth = lerp(startScreenWidth, endScreenWidth, cameraEase);
      const currentScreenTilt = lerp(startScreenTilt, 8, cameraEase);
      const currentScreenDepth = lerp(startScreenDepth, 1, cameraEase);
      const currentProjectorTop = lerp(startProjectorTop, endProjectorTop, cameraEase);
      const currentProjectorY = lerp(0, compactStage ? 20 : 6, cameraEase);
      const screenLayoutHeight = currentScreenWidth / 1.86;
      const screenVisibleHeight = screenLayoutHeight * currentScreenDepth * Math.cos((currentScreenTilt * Math.PI) / 180);
      const lateBeamProgress = clamp((stageProgress - 0.42) / 0.12);
      const lateBeamEase = 1 - Math.pow(1 - lateBeamProgress, 2);
      const beamTop =
        currentScreenTop +
        screenLayoutHeight * 0.5 +
        screenVisibleHeight * 0.5 +
        (compactStage ? 8 : 10) -
        lateBeamEase * (compactStage ? 34 : 64);
      const endBeamHeight = Math.max(
        0,
        currentProjectorTop + currentProjectorY - beamTop + window.innerHeight * (compactStage ? 0.05 : 0.065),
      );
      const baseWorldY = lerp(42, -22, cameraEase) + stageProgress * -22;

      stage.style.setProperty("--stage-progress", stageProgress.toFixed(3));
      stage.style.setProperty("--screen-y", `${baseWorldY.toFixed(2)}px`);
      stage.style.setProperty("--screen-scale", (1 + cameraEase * 0.08 + stageProgress * 0.06).toFixed(3));
      stage.style.setProperty("--world-tilt", `${lerp(startWorldTilt, 0, cameraEase).toFixed(2)}deg`);
      stage.style.setProperty("--project-screen-top", `${currentScreenTop.toFixed(2)}px`);
      stage.style.setProperty("--project-screen-width", `${currentScreenWidth.toFixed(2)}px`);
      stage.style.setProperty("--project-screen-tilt", `${currentScreenTilt.toFixed(2)}deg`);
      stage.style.setProperty("--project-screen-depth", currentScreenDepth.toFixed(3));
      stage.style.setProperty("--floor-tilt", `${lerp(startFloorTilt, endFloorTilt, cameraEase).toFixed(2)}deg`);
      stage.style.setProperty("--wall-opacity", lerp(compactStage ? 0.46 : 0.5, compactStage ? 0.66 : 0.7, cameraEase).toFixed(3));
      stage.style.setProperty("--wall-skew-left", `${lerp(0, compactStage ? 7 : 10, cameraEase).toFixed(2)}deg`);
      stage.style.setProperty("--wall-skew-right", `${lerp(0, compactStage ? -7 : -10, cameraEase).toFixed(2)}deg`);
      stage.style.setProperty("--rail-opacity", lerp(0, 1, controlsEase).toFixed(3));
      stage.style.setProperty("--rail-y", `${lerp(compactStage ? 96 : 112, 0, controlsEase).toFixed(2)}px`);
      stage.style.setProperty("--case-opacity", controlsEase.toFixed(3));
      stage.style.setProperty("--case-y", `${lerp(compactStage ? 64 : 72, 0, controlsEase).toFixed(2)}px`);
      stage.style.setProperty("--heading-opacity", lerp(0.9, 0, headingEase).toFixed(3));
      stage.style.setProperty("--heading-y", `${lerp(0, -34, headingEase).toFixed(2)}px`);
      stage.style.setProperty("--light-pool-opacity", (beamRevealEase * (compactStage ? 0.24 : 0.28)).toFixed(3));
      stage.style.setProperty("--projector-top", `${currentProjectorTop.toFixed(2)}px`);
      stage.style.setProperty("--projector-y", `${currentProjectorY.toFixed(2)}px`);
      stage.style.setProperty("--projector-scale", lerp(startProjectorScale, endProjectorScale, cameraEase).toFixed(3));
      stage.style.setProperty("--projector-tilt", `${lerp(startProjectorTilt, endProjectorTilt, cameraEase).toFixed(2)}deg`);
      stage.style.setProperty("--projector-beam-opacity", (beamRevealEase * beamMaxOpacity).toFixed(3));
      stage.style.setProperty("--projector-beam-top", `${beamTop.toFixed(2)}px`);
      stage.style.setProperty("--projector-beam-width", `${lerp(startBeamWidth, endBeamWidth, beamRevealEase).toFixed(2)}px`);
      stage.style.setProperty("--projector-beam-height", `${lerp(startBeamHeight, endBeamHeight, beamRevealEase).toFixed(2)}px`);
      stage.style.setProperty("--screen-overlay-opacity", lerp(compactStage ? 0.07 : 0.075, 0.035, cameraEase).toFixed(3));
      stage.style.setProperty("--screen-glow-opacity", lerp(compactStage ? 0.03 : 0.035, 0.018, cameraEase).toFixed(3));
      document.body.classList.toggle("portfolio-over-dark", rect.top <= 80 && rect.bottom > 80);

      if (!prefersReducedMotion) {
        stageLetters.forEach((letter) => {
          letter.style.transform = "";
        });
      }

      if (projectLinks.length && Date.now() > manualProjectUntil) {
        const projectProgress = clamp((stageProgress - 0.42) / 0.58);
        const nextIndex = clamp(Math.floor(projectProgress * projectLinks.length), 0, projectLinks.length - 1);
        if (activeProject === nextIndex && !railUserInteracted) {
          centerProjectInRail(projectLinks[nextIndex]);
        } else {
          setProject(projectLinks[nextIndex]);
        }
      }

      if (prefersReducedMotion) {
        drawCanvas();
      }
    }
  };

  if (hasThree) {
    projectorScene = createProjectorScene();

    if (!projectorScene && canvas) {
      stage?.classList.remove("has-projector-webgl");
      context = canvas.getContext("2d");
    }
  }

  updateScroll();
  window.addEventListener("scroll", updateScroll, { passive: true });
  window.addEventListener("resize", () => {
    resizeCanvas();
    updateScroll();
  });

  if (canvas && !prefersReducedMotion) {
    animationFrame = window.requestAnimationFrame(animateCanvas);
  } else {
    drawCanvas();
  }

  window.addEventListener("pagehide", () => {
    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame);
    }
  });
})();
