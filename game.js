(function () {
  const DEFAULT_GRID_SIDE = 64;
  const GRID_SIDE_OPTIONS = [ 64, 256, 1024 ];
  const GROUND_TOP = 0;
  const GROUND_DEPTH = 1.3;
  const PLATFORM_TOP = 1.1;
  const DOUBLE_PLATFORM_TOP = 2.55;
  const PLATFORM_HEIGHT = 0.34;
  const LAVA_SURFACE_Y = -0.32;
  const VOID_FLOOR_Y = -7.5;
  const FALL_RESPAWN_Y = -12;
  const PLAYER_HALF_SIZE = new THREE.Vector3(0.36, 0.52, 0.36);
  const PLAYER_EYE_HEIGHT = 0.45;
  const FIXED_DT = 1 / 120;
  const GRAVITY = 24;
  const GROUND_SPEED = 20.4;
  const AIR_SPEED = 16.8;
  const GROUND_ACCEL = 96;
  const AIR_ACCEL = 42;
  const GROUND_DRAG = 88;
  const AIR_DRAG = 18;
  const JUMP_SPEED = 8.6;
  const DASH_SPEED = 57.6;
  const DASH_DURATION = 0.11;
  const DASH_COOLDOWN = 0.55;
  const DASH_LIFT = 1.15;
  const COYOTE_TIME = 0.12;
  const JUMP_BUFFER_TIME = 0.15;
  const EPSILON = 0.0001;
  const VALID_TILES = new Set([ "S", "L", "P", "D", "X", "Z" ]);
  const RICKROLL_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  const AXIS_NAMES = [ "x", "y", "z" ];

  const canvas = document.getElementById("game-canvas");
  const gridSizeSelect = document.getElementById("grid-size");
  const gridLabel = document.getElementById("grid-label");
  const levelEditor = document.getElementById("level-editor");
  const applyLevelButton = document.getElementById("apply-level");
  const resetLevelButton = document.getElementById("reset-level");
  const levelFeedback = document.getElementById("level-feedback");
  const jumpStatus = document.getElementById("jump-status");
  const positionStatus = document.getElementById("position-status");
  const cameraStatus = document.getElementById("camera-status");
  const tileStatus = document.getElementById("tile-status");
  const lockHint = document.getElementById("lock-hint");
  const respawnHint = document.getElementById("respawn-hint");
  const goalOverlay = document.getElementById("goal-overlay");
  const goalMessage = document.getElementById("goal-message");
  const goalOkButton = document.getElementById("goal-ok");

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd7e8de);
  scene.fog = new THREE.Fog(0xd7e8de, 24, 88);

  const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 180);
  const clock = new THREE.Clock();

  const worldGroup = new THREE.Group();
  const dynamicWorldGroup = new THREE.Group();
  worldGroup.add(dynamicWorldGroup);
  scene.add(worldGroup);

  const sceneDecor = {
    canyonFloor: null,
    gridHelper: null,
    rim: null
  };

  const world = {
    rows: [],
    colliderMap: [],
    colliders: [],
    lavaTiles: [],
    groundCount: 0,
    platformCount: 0,
    startTile: { x: 0, z: 0 },
    goalTile: null,
    goalReached: false
  };

  const input = {
    forward: false,
    back: false,
    left: false,
    right: false
  };

  const player = {
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    spawnPosition: new THREE.Vector3(),
    onGround: false,
    jumpsUsed: 0,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    dashTimer: 0,
    dashCooldownTimer: 0,
    dashDirection: new THREE.Vector3()
  };

  const cameraState = {
    yaw: Math.PI * 0.95,
    pitch: -0.42,
    distance: 8,
    focus: new THREE.Vector3(),
    desiredPosition: new THREE.Vector3()
  };

  const tempVector = new THREE.Vector3();
  const tempVectorB = new THREE.Vector3();
  const tempVectorC = new THREE.Vector3();
  const tempQuaternion = new THREE.Quaternion();
  const tempObject = new THREE.Object3D();
  const cameraDirection = new THREE.Vector3();

  let currentGridSide = DEFAULT_GRID_SIDE;
  let currentHalfGrid = currentGridSide / 2;
  let accumulator = 0;
  let noticeTimeLeft = 0;
  let defaultLevelText = "";

  setupScene();
  updateGridLabel();
  gridSizeSelect.value = String(DEFAULT_GRID_SIDE);
  defaultLevelText = buildDefaultLevelText();
  levelEditor.value = defaultLevelText;
  applyLevelFromEditor();
  bindEvents();
  onResize();
  renderer.setAnimationLoop(frame);

  function setupScene() {
    const hemiLight = new THREE.HemisphereLight(0xf3fbff, 0x526247, 1.35);
    scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(0xfff1d3, 2.2);
    sun.position.set(-22, 30, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -45;
    sun.shadow.camera.right = 45;
    sun.shadow.camera.top = 45;
    sun.shadow.camera.bottom = -45;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 120;
    sun.shadow.bias = -0.00015;
    scene.add(sun);

    const canyonFloor = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1.8, 1),
      new THREE.MeshStandardMaterial({
        color: 0x1f2622,
        roughness: 1,
        metalness: 0
      })
    );
    canyonFloor.position.set(0, VOID_FLOOR_Y - 0.9, 0);
    canyonFloor.receiveShadow = true;
    worldGroup.add(canyonFloor);
    sceneDecor.canyonFloor = canyonFloor;

    const gridHelper = new THREE.GridHelper(1, 1, 0x4f6558, 0x334138);
    gridHelper.position.y = VOID_FLOOR_Y + 0.03;
    const gridMaterials = Array.isArray(gridHelper.material) ? gridHelper.material : [ gridHelper.material ];
    gridMaterials.forEach(function (material) {
      material.opacity = 0.3;
      material.transparent = true;
    });
    worldGroup.add(gridHelper);
    sceneDecor.gridHelper = gridHelper;

    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0x5e6f58,
      roughness: 0.95,
      metalness: 0.02
    });
    const rim = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 1), rimMaterial);
    rim.position.set(0, VOID_FLOOR_Y - 1.8, 0);
    rim.receiveShadow = true;
    worldGroup.add(rim);
    sceneDecor.rim = rim;
    updateWorldBounds();

    const playerTexture = createProceduralTexture(128, function (ctx, size) {
      ctx.fillStyle = "#7e7c78";
      ctx.fillRect(0, 0, size, size);

      for (let i = 0; i < 1600; i += 1) {
        const shade = 95 + Math.random() * 110;
        ctx.fillStyle = "rgba(" + shade + "," + shade + "," + (shade - 10) + "," + (0.08 + Math.random() * 0.1) + ")";
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 1 + Math.random() * 5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = 0; i < 120; i += 1) {
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.beginPath();
        ctx.moveTo(Math.random() * size, Math.random() * size);
        ctx.lineTo(Math.random() * size, Math.random() * size);
        ctx.stroke();
      }
    });

    const playerGeometry = new THREE.IcosahedronGeometry(0.62, 2);
    const positions = playerGeometry.attributes.position;
    for (let i = 0; i < positions.count; i += 1) {
      const vx = positions.getX(i);
      const vy = positions.getY(i);
      const vz = positions.getZ(i);
      const wave = Math.sin(vx * 7.1) * Math.cos(vy * 6.3) * Math.sin(vz * 5.4);
      const scale = 1 + wave * 0.06;
      positions.setXYZ(i, vx * scale, vy * scale, vz * scale);
    }
    positions.needsUpdate = true;
    playerGeometry.computeVertexNormals();

    const playerMaterial = new THREE.MeshStandardMaterial({
      map: playerTexture,
      roughness: 0.98,
      metalness: 0.02
    });

    player.mesh = new THREE.Mesh(playerGeometry, playerMaterial);
    player.mesh.castShadow = true;
    player.mesh.receiveShadow = true;
    scene.add(player.mesh);

    player.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.62, 28),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.18
      })
    );
    player.shadow.rotation.x = -Math.PI / 2;
    scene.add(player.shadow);
  }

  function bindEvents() {
    gridSizeSelect.addEventListener("change", function () {
      const requestedSize = Number(gridSizeSelect.value);
      if (!GRID_SIDE_OPTIONS.includes(requestedSize)) {
        return;
      }

      currentGridSide = requestedSize;
      currentHalfGrid = currentGridSide / 2;
      updateGridLabel();
      updateWorldBounds();
      defaultLevelText = buildDefaultLevelText();
      levelEditor.value = defaultLevelText;
      applyLevelFromEditor();
    });

    applyLevelButton.addEventListener("click", applyLevelFromEditor);
    resetLevelButton.addEventListener("click", function () {
      levelEditor.value = defaultLevelText;
      applyLevelFromEditor();
    });
    goalOkButton.addEventListener("click", function () {
      window.open(RICKROLL_URL, "_blank", "noopener,noreferrer");
      respawnPlayer("Neuer Versuch.");
    });
    levelEditor.addEventListener("keydown", function (event) {
      if (event.key === "Tab") {
        event.preventDefault();
        const start = levelEditor.selectionStart;
        const end = levelEditor.selectionEnd;
        levelEditor.setRangeText("X", start, end, "end");
      }

      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        applyLevelFromEditor();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.code === "Space") {
        event.preventDefault();
        if (!event.repeat) {
          player.jumpBufferTimer = JUMP_BUFFER_TIME;
        }
      }

      setMovementKey(event.code, true);

      if (event.code === "KeyR" && !event.repeat) {
        respawnPlayer("Manueller Respawn");
      }

      if (event.code === "KeyQ" && !event.repeat) {
        tryDash();
      }
    });

    document.addEventListener("keyup", function (event) {
      setMovementKey(event.code, false);
    });

    canvas.addEventListener("click", function () {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
      }
    });

    document.addEventListener("pointerlockchange", updatePointerLockText);
    document.addEventListener("mousemove", function (event) {
      if (document.pointerLockElement !== canvas) {
        return;
      }

      cameraState.yaw -= event.movementX * 0.0025;
      cameraState.pitch = THREE.MathUtils.clamp(
        cameraState.pitch - event.movementY * 0.002,
        -1.2,
        0.38
      );
    });

    canvas.addEventListener("wheel", function (event) {
      event.preventDefault();
      cameraState.distance = THREE.MathUtils.clamp(
        cameraState.distance + event.deltaY * 0.01,
        4.2,
        14
      );
      updateStatus();
    }, { passive: false });

    window.addEventListener("resize", onResize);
    updatePointerLockText();
  }

  function setMovementKey(code, isDown) {
    if (code === "KeyW") {
      input.forward = isDown;
    } else if (code === "KeyS") {
      input.back = isDown;
    } else if (code === "KeyA") {
      input.left = isDown;
    } else if (code === "KeyD") {
      input.right = isDown;
    }
  }

  function onResize() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || Math.max(1, Math.floor(window.innerHeight * 0.66));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function updateGridLabel() {
    gridLabel.textContent = currentGridSide + " x " + currentGridSide;
    gridSizeSelect.value = String(currentGridSide);
  }

  function updateWorldBounds() {
    const span = currentGridSide + 18;
    if (sceneDecor.canyonFloor) {
      sceneDecor.canyonFloor.scale.set(span, 1, span);
    }
    if (sceneDecor.gridHelper) {
      sceneDecor.gridHelper.scale.set(span, 1, span);
      const helperMaterials = Array.isArray(sceneDecor.gridHelper.material)
        ? sceneDecor.gridHelper.material
        : [ sceneDecor.gridHelper.material ];
      helperMaterials.forEach(function (material) {
        material.needsUpdate = true;
      });
    }
    if (sceneDecor.rim) {
      sceneDecor.rim.scale.set(currentGridSide + 6, 1, currentGridSide + 6);
    }

    scene.fog.far = Math.max(88, currentGridSide * 1.6);
    camera.far = Math.max(180, currentGridSide * 2.4);
    camera.updateProjectionMatrix();
  }

  function buildDefaultLevelText() {
    if (currentGridSide === 64) {
      return buildExampleLevel(64, {
        startSize: 10,
        islandSize: 9,
        platformSize: 2,
        topIslandWidth: 10,
        topIslandHeight: 7,
        startX: 4,
        startZ: 49,
        firstPlatforms: [
          [ 15, 51 ],
          [ 20, 47 ],
          [ 25, 43 ]
        ],
        islandA: { x: 29, z: 39 },
        islandB: { x: 39, z: 29 },
        islandC: { x: 49, z: 12 },
        secondPlatforms: [
          [ 35, 36 ],
          [ 43, 24 ],
          [ 51, 21 ],
          [ 56, 18 ]
        ],
        doublePlatforms: [
          [ 47, 27 ],
          [ 54, 15 ]
        ]
      });
    }

    if (currentGridSide === 256) {
      return buildExampleLevel(256, {
        startSize: 24,
        islandSize: 28,
        platformSize: 5,
        topIslandWidth: 34,
        topIslandHeight: 20,
        startX: 14,
        startZ: 204,
        firstPlatforms: [
          [ 42, 210 ],
          [ 60, 198 ],
          [ 80, 186 ],
          [ 96, 174 ]
        ],
        islandA: { x: 104, z: 154 },
        islandB: { x: 144, z: 118 },
        islandC: { x: 182, z: 72 },
        secondPlatforms: [
          [ 126, 146 ],
          [ 148, 126 ],
          [ 168, 106 ],
          [ 190, 92 ]
        ],
        doublePlatforms: [
          [ 140, 138 ],
          [ 176, 98 ]
        ]
      });
    }

    if (currentGridSide === 1024) {
      return buildExampleLevel(1024, {
        startSize: 92,
        islandSize: 110,
        platformSize: 18,
        topIslandWidth: 144,
        topIslandHeight: 82,
        startX: 48,
        startZ: 826,
        firstPlatforms: [
          [ 158, 846 ],
          [ 236, 794 ],
          [ 316, 742 ],
          [ 388, 698 ]
        ],
        islandA: { x: 430, z: 632 },
        islandB: { x: 570, z: 500 },
        islandC: { x: 708, z: 330 },
        secondPlatforms: [
          [ 520, 596 ],
          [ 598, 528 ],
          [ 664, 462 ],
          [ 726, 404 ],
          [ 784, 366 ]
        ],
        doublePlatforms: [
          [ 612, 520 ],
          [ 736, 390 ],
          [ 820, 350 ]
        ],
        extraIslands: [
          { x: 164, z: 808, width: 20, height: 20 },
          { x: 188, z: 790, width: 20, height: 20 },
          { x: 212, z: 772, width: 20, height: 20 },
          { x: 236, z: 754, width: 20, height: 20 },
          { x: 260, z: 736, width: 20, height: 20 },
          { x: 284, z: 718, width: 20, height: 20 },
          { x: 308, z: 700, width: 20, height: 20 },
          { x: 332, z: 682, width: 20, height: 20 },
          { x: 356, z: 664, width: 22, height: 22 },
          { x: 388, z: 648, width: 24, height: 24 },
          { x: 540, z: 600, width: 22, height: 22 },
          { x: 566, z: 576, width: 22, height: 22 },
          { x: 592, z: 552, width: 22, height: 22 },
          { x: 618, z: 528, width: 22, height: 22 },
          { x: 644, z: 504, width: 22, height: 22 },
          { x: 670, z: 480, width: 22, height: 22 },
          { x: 696, z: 456, width: 22, height: 22 },
          { x: 722, z: 432, width: 22, height: 22 },
          { x: 748, z: 408, width: 22, height: 22 },
          { x: 774, z: 384, width: 22, height: 22 }
        ]
      });
    }

    return buildExampleLevel(currentGridSide, {
      startSize: Math.max(8, Math.floor(currentGridSide * 0.09)),
      islandSize: Math.max(10, Math.floor(currentGridSide * 0.11)),
      platformSize: Math.max(2, Math.floor(currentGridSide * 0.018)),
      topIslandWidth: Math.max(12, Math.floor(currentGridSide * 0.14)),
      topIslandHeight: Math.max(8, Math.floor(currentGridSide * 0.09)),
      startX: Math.max(2, Math.floor(currentGridSide * 0.06)),
      startZ: Math.max(2, currentGridSide - Math.max(8, Math.floor(currentGridSide * 0.09)) - Math.floor(currentGridSide * 0.08)),
      firstPlatforms: [
        [ Math.floor(currentGridSide * 0.24), Math.floor(currentGridSide * 0.82) ],
        [ Math.floor(currentGridSide * 0.3), Math.floor(currentGridSide * 0.77) ],
        [ Math.floor(currentGridSide * 0.36), Math.floor(currentGridSide * 0.72) ]
      ],
      islandA: { x: Math.floor(currentGridSide * 0.42), z: Math.floor(currentGridSide * 0.66) },
      islandB: { x: Math.floor(currentGridSide * 0.58), z: Math.floor(currentGridSide * 0.48) },
      islandC: { x: Math.floor(currentGridSide * 0.74), z: Math.floor(currentGridSide * 0.24) },
      secondPlatforms: [
        [ Math.floor(currentGridSide * 0.55), Math.floor(currentGridSide * 0.63) ],
        [ Math.floor(currentGridSide * 0.62), Math.floor(currentGridSide * 0.57) ],
        [ Math.floor(currentGridSide * 0.69), Math.floor(currentGridSide * 0.5) ],
        [ Math.floor(currentGridSide * 0.79), Math.floor(currentGridSide * 0.38) ]
      ],
      doublePlatforms: [
        [ Math.floor(currentGridSide * 0.6), Math.floor(currentGridSide * 0.6) ],
        [ Math.floor(currentGridSide * 0.75), Math.floor(currentGridSide * 0.34) ]
      ]
    });
  }

  function buildExampleLevel(side, config) {
    const grid = Array.from({ length: side }, function () {
      return Array(side).fill("X");
    });

    function fillRect(x1, z1, x2, z2, tile) {
      for (let z = z1; z <= z2; z += 1) {
        for (let x = x1; x <= x2; x += 1) {
          if (x >= 0 && x < side && z >= 0 && z < side) {
            grid[z][x] = tile;
          }
        }
      }
    }

    function stamp(x, z, width, height, tile) {
      fillRect(x, z, x + width - 1, z + height - 1, tile);
    }

    stamp(config.startX, config.startZ, config.startSize, config.startSize, "L");

    const spawnZ = Math.min(side - 2, config.startZ + Math.floor(config.startSize / 2));
    const spawnX = Math.min(side - 2, config.startX + Math.floor(config.startSize / 3));
    grid[spawnZ][spawnX] = "S";

    config.firstPlatforms.forEach(function (entry) {
      stamp(entry[0], entry[1], config.platformSize, config.platformSize, "P");
    });

    stamp(config.islandA.x, config.islandA.z, config.islandSize, config.islandSize, "L");
    stamp(config.islandB.x, config.islandB.z, config.islandSize, config.islandSize, "L");
    stamp(config.islandC.x, config.islandC.z, config.topIslandWidth, config.topIslandHeight, "L");

    stamp(
      config.islandA.x + Math.floor(config.islandSize * 0.28),
      config.islandA.z + Math.floor(config.islandSize * 0.32),
      Math.max(2, Math.floor(config.islandSize * 0.22)),
      Math.max(2, Math.floor(config.islandSize * 0.22)),
      "X"
    );
    stamp(
      config.islandB.x + Math.floor(config.islandSize * 0.2),
      config.islandB.z + Math.floor(config.islandSize * 0.2),
      Math.max(2, Math.floor(config.islandSize * 0.18)),
      Math.max(2, Math.floor(config.islandSize * 0.18)),
      "X"
    );

    config.secondPlatforms.forEach(function (entry) {
      stamp(entry[0], entry[1], config.platformSize, config.platformSize, "P");
    });

    if (config.doublePlatforms) {
      config.doublePlatforms.forEach(function (entry) {
        stamp(entry[0], entry[1], config.platformSize, config.platformSize, "D");
      });
    }

    if (config.extraIslands) {
      config.extraIslands.forEach(function (island) {
        stamp(island.x, island.z, island.width, island.height, "L");
      });
    }

    const goalStartX = Math.min(side - 1, config.islandC.x + Math.floor(config.topIslandWidth * 0.28));
    const goalEndX = Math.min(side - 1, goalStartX + Math.max(4, Math.floor(config.topIslandWidth * 0.5)));
    const goalZ = Math.max(0, config.islandC.z - 1);
    fillRect(goalStartX, goalZ, goalEndX, goalZ, "Z");

    return grid.map(function (row) {
      return row.join("");
    }).join("\n");
  }

  function normalizeLevelText(rawText) {
    const sourceRows = rawText.replace(/\r/g, "").split("\n");
    const normalizedRows = [];
    const warnings = [];
    let startFound = false;

    for (let z = 0; z < currentGridSide; z += 1) {
      const source = (sourceRows[z] || "").toUpperCase();
      const row = [];

      for (let x = 0; x < currentGridSide; x += 1) {
        let tile = source[x] || "X";
        if (tile === " ") {
          tile = "X";
        }

        if (!VALID_TILES.has(tile)) {
          tile = "X";
        }

        if (tile === "S") {
          if (startFound) {
            tile = "L";
            warnings.push("Mehrere Startpunkte entdeckt: nur der erste bleibt `S`.");
          } else {
            startFound = true;
          }
        }

        row.push(tile);
      }

      normalizedRows.push(row.join(""));
    }

    if (!startFound) {
      const fallbackZ = Math.max(1, currentGridSide - 2);
      const fallbackX = Math.min(currentGridSide - 2, 2);
      const fallbackRow = normalizedRows[fallbackZ].split("");
      fallbackRow[fallbackX] = "S";
      normalizedRows[fallbackZ] = fallbackRow.join("");
      warnings.push("Kein Startpunkt gefunden: `S` wurde automatisch gesetzt.");
    }

    if (sourceRows.length !== currentGridSide) {
      warnings.unshift("Das Level wurde auf " + currentGridSide + " Zeilen normalisiert.");
    }

    return {
      rows: normalizedRows,
      text: normalizedRows.join("\n"),
      warnings: dedupeWarnings(warnings)
    };
  }

  function dedupeWarnings(warnings) {
    return [ ...new Set(warnings) ];
  }

  function applyLevelFromEditor() {
    const normalized = normalizeLevelText(levelEditor.value);
    levelEditor.value = normalized.text;
    buildWorld(normalized.rows);
    respawnPlayer("Level geladen");

    if (normalized.warnings.length > 0) {
      levelFeedback.textContent = normalized.warnings.join(" ");
    } else {
      levelFeedback.textContent = "Level geladen und auf " + currentGridSide + " x " + currentGridSide + " Tiles normalisiert.";
    }

    updateStatus();
  }

  function buildWorld(rows) {
    while (dynamicWorldGroup.children.length > 0) {
      const child = dynamicWorldGroup.children[0];
      dynamicWorldGroup.remove(child);
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (Array.isArray(child.material)) {
        child.material.forEach(disposeMaterial);
      } else {
        disposeMaterial(child.material);
      }
    }

    world.rows = rows.map(function (row) {
      return row.split("");
    });
    world.colliderMap = Array.from({ length: currentGridSide }, function () {
      return Array(currentGridSide).fill(null);
    });
    world.colliders = [];
    world.lavaTiles = [];
    world.groundCount = 0;
    world.platformCount = 0;
    world.goalTile = null;

    const groundTiles = [];
    const platformTiles = [];
    const doublePlatformTiles = [];

    for (let z = 0; z < currentGridSide; z += 1) {
      for (let x = 0; x < currentGridSide; x += 1) {
        const tile = world.rows[z][x];
        if (tile === "S") {
          world.startTile = { x: x, z: z };
        }

        if (tile === "X" || tile === "P" || tile === "D") {
          world.lavaTiles.push({ x: x, z: z });
        }

        if (tile === "Z") {
          world.goalTile = { x: x, z: z };
          const collider = makeTileCollider(x, z, GROUND_TOP - GROUND_DEPTH, GROUND_TOP);
          world.colliderMap[z][x] = collider;
          world.colliders.push(collider);
          groundTiles.push({ x: x, z: z, isGoal: true });
          world.groundCount += 1;
        } else if (tile === "L" || tile === "S") {
          const collider = makeTileCollider(x, z, GROUND_TOP - GROUND_DEPTH, GROUND_TOP);
          world.colliderMap[z][x] = collider;
          world.colliders.push(collider);
          groundTiles.push({ x: x, z: z, isGoal: false });
          world.groundCount += 1;
        } else if (tile === "P") {
          const collider = makeTileCollider(x, z, PLATFORM_TOP - PLATFORM_HEIGHT, PLATFORM_TOP);
          world.colliderMap[z][x] = collider;
          world.colliders.push(collider);
          platformTiles.push({ x: x, z: z });
          world.platformCount += 1;
        } else if (tile === "D") {
          const collider = makeTileCollider(x, z, DOUBLE_PLATFORM_TOP - PLATFORM_HEIGHT, DOUBLE_PLATFORM_TOP);
          world.colliderMap[z][x] = collider;
          world.colliders.push(collider);
          doublePlatformTiles.push({ x: x, z: z });
          world.platformCount += 1;
        }
      }
    }

    const anisotropy = renderer.capabilities.getMaxAnisotropy();
    const groundMaterial = new THREE.MeshStandardMaterial({
      map: createTileTexture(128, [ "#65745c", "#7b8d6f", "#9eb087" ], anisotropy),
      roughness: 0.98,
      metalness: 0.01
    });
    const platformMaterial = new THREE.MeshStandardMaterial({
      map: createTileTexture(128, [ "#726a65", "#8a837e", "#aaa29a" ], anisotropy),
      roughness: 1,
      metalness: 0.02
    });
    const doublePlatformMaterial = new THREE.MeshStandardMaterial({
      map: createTileTexture(128, [ "#5c677f", "#7987a3", "#aeb9ca" ], anisotropy),
      roughness: 0.96,
      metalness: 0.04
    });
    const lavaMaterial = new THREE.MeshStandardMaterial({
      map: createLavaTexture(128, anisotropy),
      color: 0xffb347,
      emissive: 0xff5a1f,
      emissiveIntensity: 1.4,
      roughness: 0.35,
      metalness: 0.02
    });

    const groundMesh = createInstancedTileMesh(groundTiles, GROUND_DEPTH, GROUND_TOP - (GROUND_DEPTH / 2), groundMaterial);
    const platformMesh = createInstancedTileMesh(platformTiles, PLATFORM_HEIGHT, PLATFORM_TOP - (PLATFORM_HEIGHT / 2), platformMaterial);
    const doublePlatformMesh = createInstancedTileMesh(doublePlatformTiles, PLATFORM_HEIGHT, DOUBLE_PLATFORM_TOP - (PLATFORM_HEIGHT / 2), doublePlatformMaterial);
    const lavaMesh = createInstancedTileMesh(world.lavaTiles, 0.12, LAVA_SURFACE_Y, lavaMaterial);

    if (groundMesh) {
      dynamicWorldGroup.add(groundMesh);
    }

    if (platformMesh) {
      dynamicWorldGroup.add(platformMesh);
    }

    if (doublePlatformMesh) {
      dynamicWorldGroup.add(doublePlatformMesh);
    }

    if (lavaMesh) {
      lavaMesh.castShadow = false;
      lavaMesh.receiveShadow = false;
      dynamicWorldGroup.add(lavaMesh);
    }

    addGoalFlag();

    tileStatus.textContent = world.groundCount + " Boden / " + world.platformCount + " Plattformen";
  }

  function disposeMaterial(material) {
    if (!material) {
      return;
    }

    if (material.map) {
      material.map.dispose();
    }
    material.dispose();
  }

  function createTileTexture(size, palette, anisotropy) {
    const texture = createProceduralTexture(size, function (ctx, textureSize) {
      ctx.fillStyle = palette[0];
      ctx.fillRect(0, 0, textureSize, textureSize);

      for (let i = 0; i < 2400; i += 1) {
        ctx.fillStyle = "rgba(255,255,255," + (0.02 + Math.random() * 0.04) + ")";
        ctx.fillRect(
          Math.random() * textureSize,
          Math.random() * textureSize,
          1 + Math.random() * 2,
          1 + Math.random() * 2
        );
      }

      for (let i = 0; i < 140; i += 1) {
        const shade = palette[1 + (i % (palette.length - 1))];
        ctx.fillStyle = shade;
        const width = 8 + Math.random() * 30;
        const height = 8 + Math.random() * 30;
        ctx.globalAlpha = 0.08 + Math.random() * 0.1;
        ctx.fillRect(Math.random() * textureSize, Math.random() * textureSize, width, height);
      }

      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(15, 20, 13, 0.12)";
      for (let i = 0; i < 60; i += 1) {
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.beginPath();
        ctx.moveTo(Math.random() * textureSize, Math.random() * textureSize);
        ctx.lineTo(Math.random() * textureSize, Math.random() * textureSize);
        ctx.stroke();
      }
    });

    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.anisotropy = anisotropy;
    return texture;
  }

  function createLavaTexture(size, anisotropy) {
    const texture = createProceduralTexture(size, function (ctx, textureSize) {
      const gradient = ctx.createLinearGradient(0, 0, textureSize, textureSize);
      gradient.addColorStop(0, "#3b0900");
      gradient.addColorStop(0.35, "#8d1c05");
      gradient.addColorStop(0.7, "#ff5f1f");
      gradient.addColorStop(1, "#ffd166");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, textureSize, textureSize);

      for (let i = 0; i < 90; i += 1) {
        ctx.globalAlpha = 0.2 + Math.random() * 0.2;
        ctx.fillStyle = i % 2 === 0 ? "#ffef9f" : "#ff8b2b";
        ctx.beginPath();
        ctx.arc(
          Math.random() * textureSize,
          Math.random() * textureSize,
          6 + Math.random() * 18,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = "#2a0602";
      for (let i = 0; i < 120; i += 1) {
        ctx.lineWidth = 2 + Math.random() * 4;
        ctx.beginPath();
        ctx.moveTo(Math.random() * textureSize, Math.random() * textureSize);
        ctx.lineTo(Math.random() * textureSize, Math.random() * textureSize);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    });

    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.anisotropy = anisotropy;
    return texture;
  }

  function createProceduralTexture(size, painter) {
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = size;
    textureCanvas.height = size;
    const ctx = textureCanvas.getContext("2d");
    painter(ctx, size);
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  function createInstancedTileMesh(tiles, height, centerY, material) {
    if (tiles.length === 0) {
      material.dispose();
      return null;
    }

    const geometry = new THREE.BoxGeometry(1, height, 1);
    const mesh = new THREE.InstancedMesh(geometry, material, tiles.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    for (let i = 0; i < tiles.length; i += 1) {
      const tile = tiles[i];
      const worldPosition = gridToWorld(tile.x, tile.z);
      tempObject.position.set(worldPosition.x, centerY, worldPosition.z);
      tempObject.rotation.set(0, 0, 0);
      tempObject.scale.set(1, 1, 1);
      tempObject.updateMatrix();
      mesh.setMatrixAt(i, tempObject.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }

  function makeTileCollider(gridX, gridZ, minY, maxY) {
    const worldPosition = gridToWorld(gridX, gridZ);
    return {
      minX: worldPosition.x - 0.5,
      maxX: worldPosition.x + 0.5,
      minY: minY,
      maxY: maxY,
      minZ: worldPosition.z - 0.5,
      maxZ: worldPosition.z + 0.5
    };
  }

  function gridToWorld(gridX, gridZ) {
    return {
      x: gridX - currentHalfGrid + 0.5,
      z: gridZ - currentHalfGrid + 0.5
    };
  }

  function worldToGrid(worldX, worldZ) {
    return {
      x: Math.floor(worldX + currentHalfGrid),
      z: Math.floor(worldZ + currentHalfGrid)
    };
  }

  function respawnPlayer(message) {
    const spawn = gridToWorld(world.startTile.x, world.startTile.z);
    player.spawnPosition.set(spawn.x, GROUND_TOP + PLAYER_HALF_SIZE.y + 0.06, spawn.z);
    player.position.copy(player.spawnPosition);
    player.velocity.set(0, 0, 0);
    player.onGround = true;
    player.jumpsUsed = 0;
    player.coyoteTimer = COYOTE_TIME;
    player.jumpBufferTimer = 0;
    player.dashTimer = 0;
    player.dashCooldownTimer = 0;
    player.dashDirection.set(0, 0, 0);
    player.mesh.quaternion.identity();
    world.goalReached = false;
    hideGoalOverlay();

    cameraState.focus.set(player.position.x, player.position.y + PLAYER_EYE_HEIGHT, player.position.z);
    snapCamera();
    showNotice(message);
    updateStatus();
  }

  function showNotice(message) {
    respawnHint.textContent = message;
    noticeTimeLeft = 2.4;
  }

  function updatePointerLockText() {
    const locked = document.pointerLockElement === canvas;
    lockHint.textContent = locked
      ? "Maus aktiv. ESC gibt die Kamera wieder frei."
      : "Dann steuert die Maus die Kamera.";
    updateStatus();
  }

  function frame() {
    const delta = Math.min(clock.getDelta(), 0.1);
    accumulator += delta;

    while (accumulator >= FIXED_DT) {
      simulate(FIXED_DT);
      accumulator -= FIXED_DT;
    }

    updatePlayerVisuals(delta);
    updateCamera(delta);
    updateStatus();
    updateNotice(delta);
    renderer.render(scene, camera);
  }

  function updateNotice(delta) {
    if (noticeTimeLeft <= 0) {
      return;
    }

    noticeTimeLeft = Math.max(0, noticeTimeLeft - delta);
    if (noticeTimeLeft === 0) {
      respawnHint.textContent = "Spring ueber Loecher und Plattformketten.";
    }
  }

  function simulate(dt) {
    if (world.goalReached) {
      player.velocity.set(0, 0, 0);
      player.dashTimer = 0;
      player.jumpBufferTimer = 0;
      return;
    }

    const wasOnGround = player.onGround;

    player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - dt);
    player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
    player.dashTimer = Math.max(0, player.dashTimer - dt);
    player.dashCooldownTimer = Math.max(0, player.dashCooldownTimer - dt);

    const moveDirection = getMoveDirection();
    if (player.dashTimer > 0) {
      player.velocity.x = player.dashDirection.x * DASH_SPEED;
      player.velocity.z = player.dashDirection.z * DASH_SPEED;
    } else {
      const targetSpeed = player.onGround ? GROUND_SPEED : AIR_SPEED;
      const targetVelocityX = moveDirection.x * targetSpeed;
      const targetVelocityZ = moveDirection.z * targetSpeed;
      const acceleration = moveDirection.lengthSq() > 0
        ? (player.onGround ? GROUND_ACCEL : AIR_ACCEL)
        : (player.onGround ? GROUND_DRAG : AIR_DRAG);

      player.velocity.x = moveTowards(player.velocity.x, targetVelocityX, acceleration * dt);
      player.velocity.z = moveTowards(player.velocity.z, targetVelocityZ, acceleration * dt);
    }

    if (player.jumpBufferTimer > 0) {
      const canGroundJump = player.onGround || player.coyoteTimer > 0;
      const canAirJump = !canGroundJump && player.jumpsUsed < 2;

      if (canGroundJump || canAirJump) {
        player.velocity.y = JUMP_SPEED;
        player.onGround = false;
        player.jumpBufferTimer = 0;
        player.coyoteTimer = 0;
        player.jumpsUsed = canGroundJump ? 1 : player.jumpsUsed + 1;

        if (player.jumpsUsed === 2) {
          showNotice("Doppelsprung!");
        }
      }
    }

    player.velocity.y -= GRAVITY * dt;

    movePlayerAxis("x", player.velocity.x * dt);
    movePlayerAxis("z", player.velocity.z * dt);

    player.onGround = false;
    movePlayerAxis("y", player.velocity.y * dt);

    if (!player.onGround && wasOnGround) {
      player.coyoteTimer = COYOTE_TIME;
    }

    if (player.position.y < FALL_RESPAWN_Y) {
      respawnPlayer("Zu tief gefallen. Zurueck zum Start.");
      return;
    }

    if (isTouchingLava()) {
      respawnPlayer("Autsch, Lava. Zurueck zum Start.");
      return;
    }

    if (!world.goalReached && isPlayerOnGoal()) {
      triggerGoal();
    }
  }

  function isTouchingLava() {
    const grid = worldToGrid(player.position.x, player.position.z);
    if (grid.x < 0 || grid.x >= currentGridSide || grid.z < 0 || grid.z >= currentGridSide) {
      return false;
    }

    const tile = world.rows[grid.z][grid.x];
    if (tile !== "X" && tile !== "P" && tile !== "D") {
      return false;
    }

    return player.position.y - PLAYER_HALF_SIZE.y <= LAVA_SURFACE_Y + 0.08;
  }

  function isPlayerOnGoal() {
    const grid = worldToGrid(player.position.x, player.position.z);
    if (grid.x < 0 || grid.x >= currentGridSide || grid.z < 0 || grid.z >= currentGridSide) {
      return false;
    }
    return world.rows[grid.z][grid.x] === "Z" && player.position.y <= GROUND_TOP + PLAYER_HALF_SIZE.y + 0.9;
  }

  function triggerGoal() {
    world.goalReached = true;
    player.velocity.set(0, 0, 0);
    player.onGround = true;
    player.jumpBufferTimer = 0;
    player.coyoteTimer = 0;
    player.dashTimer = 0;
    player.dashCooldownTimer = 0;
    showNotice("Ziel erreicht.");
    showGoalOverlay();
    goalMessage.textContent = "Ziel erreicht";
    window.open(RICKROLL_URL, "_blank", "noopener,noreferrer");
  }

  function showGoalOverlay() {
    goalOverlay.classList.remove("hidden");
  }

  function hideGoalOverlay() {
    goalOverlay.classList.add("hidden");
  }

  function getMoveDirection() {
    tempVector.set(0, 0, 0);

    const forward = tempVectorB.set(-Math.sin(cameraState.yaw), 0, -Math.cos(cameraState.yaw));
    const right = tempVectorC.set(-forward.z, 0, forward.x);

    if (input.forward) {
      tempVector.add(forward);
    }
    if (input.back) {
      tempVector.sub(forward);
    }
    if (input.right) {
      tempVector.add(right);
    }
    if (input.left) {
      tempVector.sub(right);
    }

    if (tempVector.lengthSq() > 0) {
      tempVector.normalize();
    }

    return tempVector;
  }

  function tryDash() {
    if (world.goalReached || player.dashCooldownTimer > 0) {
      return;
    }

    const moveDirection = getMoveDirection();
    if (moveDirection.lengthSq() > 0) {
      player.dashDirection.copy(moveDirection);
    } else {
      player.dashDirection.set(-Math.sin(cameraState.yaw), 0, -Math.cos(cameraState.yaw)).normalize();
    }

    player.dashTimer = DASH_DURATION;
    player.dashCooldownTimer = DASH_COOLDOWN;
    player.velocity.x = player.dashDirection.x * DASH_SPEED;
    player.velocity.z = player.dashDirection.z * DASH_SPEED;
    player.velocity.y = Math.max(player.velocity.y, DASH_LIFT);
    player.onGround = false;
    showNotice("Dash!");
  }

  function movePlayerAxis(axis, amount) {
    if (amount === 0) {
      return;
    }

    player.position[axis] += amount;

    const bounds = getPlayerBounds();
    const colliders = getNearbyColliders(bounds);

    for (let i = 0; i < colliders.length; i += 1) {
      const collider = colliders[i];

      if (!boundsIntersect(bounds, collider)) {
        continue;
      }

      if (axis === "x") {
        if (amount > 0) {
          player.position.x = collider.minX - PLAYER_HALF_SIZE.x - EPSILON;
        } else {
          player.position.x = collider.maxX + PLAYER_HALF_SIZE.x + EPSILON;
        }
        player.velocity.x = 0;
      } else if (axis === "z") {
        if (amount > 0) {
          player.position.z = collider.minZ - PLAYER_HALF_SIZE.z - EPSILON;
        } else {
          player.position.z = collider.maxZ + PLAYER_HALF_SIZE.z + EPSILON;
        }
        player.velocity.z = 0;
      } else if (axis === "y") {
        if (amount > 0) {
          player.position.y = collider.minY - PLAYER_HALF_SIZE.y - EPSILON;
          player.velocity.y = 0;
        } else {
          player.position.y = collider.maxY + PLAYER_HALF_SIZE.y + EPSILON;
          player.velocity.y = 0;
          player.onGround = true;
          player.jumpsUsed = 0;
          player.coyoteTimer = COYOTE_TIME;
        }
      }

      bounds.minX = player.position.x - PLAYER_HALF_SIZE.x;
      bounds.maxX = player.position.x + PLAYER_HALF_SIZE.x;
      bounds.minY = player.position.y - PLAYER_HALF_SIZE.y;
      bounds.maxY = player.position.y + PLAYER_HALF_SIZE.y;
      bounds.minZ = player.position.z - PLAYER_HALF_SIZE.z;
      bounds.maxZ = player.position.z + PLAYER_HALF_SIZE.z;
    }
  }

  function getPlayerBounds() {
    return {
      minX: player.position.x - PLAYER_HALF_SIZE.x,
      maxX: player.position.x + PLAYER_HALF_SIZE.x,
      minY: player.position.y - PLAYER_HALF_SIZE.y,
      maxY: player.position.y + PLAYER_HALF_SIZE.y,
      minZ: player.position.z - PLAYER_HALF_SIZE.z,
      maxZ: player.position.z + PLAYER_HALF_SIZE.z
    };
  }

  function getNearbyColliders(bounds) {
    const minGrid = worldToGrid(bounds.minX - 1, bounds.minZ - 1);
    const maxGrid = worldToGrid(bounds.maxX + 1, bounds.maxZ + 1);
    const colliders = [];

    for (let z = Math.max(0, minGrid.z); z <= Math.min(currentGridSide - 1, maxGrid.z); z += 1) {
      for (let x = Math.max(0, minGrid.x); x <= Math.min(currentGridSide - 1, maxGrid.x); x += 1) {
        const collider = world.colliderMap[z][x];
        if (collider) {
          colliders.push(collider);
        }
      }
    }

    return colliders;
  }

  function boundsIntersect(a, b) {
    return (
      a.maxX > b.minX &&
      a.minX < b.maxX &&
      a.maxY > b.minY &&
      a.minY < b.maxY &&
      a.maxZ > b.minZ &&
      a.minZ < b.maxZ
    );
  }

  function moveTowards(current, target, maxDelta) {
    if (Math.abs(target - current) <= maxDelta) {
      return target;
    }
    return current + Math.sign(target - current) * maxDelta;
  }

  function updatePlayerVisuals(delta) {
    player.mesh.position.copy(player.position);

    const horizontalSpeed = Math.hypot(player.velocity.x, player.velocity.z);
    if (horizontalSpeed > 0.05) {
      tempVector.set(player.velocity.z, 0, -player.velocity.x).normalize();
      tempQuaternion.setFromAxisAngle(tempVector, horizontalSpeed * delta * 1.05);
      player.mesh.quaternion.premultiply(tempQuaternion);
    }

    const surfaceY = getSurfaceHeightUnderPoint(player.position.x, player.position.z);
    const shadowY = surfaceY == null ? VOID_FLOOR_Y : surfaceY;
    const dropDistance = Math.max(0, player.position.y - PLAYER_HALF_SIZE.y - shadowY);
    const shadowScale = THREE.MathUtils.clamp(1.15 - dropDistance * 0.08, 0.35, 1.1);
    const shadowOpacity = surfaceY == null
      ? 0.07
      : THREE.MathUtils.clamp(0.2 - dropDistance * 0.02, 0.05, 0.18);

    player.shadow.position.set(player.position.x, shadowY + 0.02, player.position.z);
    player.shadow.scale.set(shadowScale, shadowScale, shadowScale);
    player.shadow.material.opacity = shadowOpacity;
  }

  function getSurfaceHeightUnderPoint(worldX, worldZ) {
    const grid = worldToGrid(worldX, worldZ);
    if (grid.x < 0 || grid.x >= currentGridSide || grid.z < 0 || grid.z >= currentGridSide) {
      return null;
    }
    const collider = world.colliderMap[grid.z][grid.x];
    return collider ? collider.maxY : null;
  }

  function updateCamera(delta) {
    tempVector.set(player.position.x, player.position.y + PLAYER_EYE_HEIGHT, player.position.z);
    cameraState.focus.copy(tempVector);

    const cosPitch = Math.cos(cameraState.pitch);
    cameraState.desiredPosition.set(
      cameraState.focus.x + Math.sin(cameraState.yaw) * cosPitch * cameraState.distance,
      cameraState.focus.y + Math.sin(cameraState.pitch) * cameraState.distance + 1.35,
      cameraState.focus.z + Math.cos(cameraState.yaw) * cosPitch * cameraState.distance
    );

    const adjustedPosition = resolveCameraCollision(cameraState.focus, cameraState.desiredPosition);
    camera.position.copy(adjustedPosition);
    camera.lookAt(cameraState.focus);
  }

  function snapCamera() {
    const cosPitch = Math.cos(cameraState.pitch);
    camera.position.set(
      cameraState.focus.x + Math.sin(cameraState.yaw) * cosPitch * cameraState.distance,
      cameraState.focus.y + Math.sin(cameraState.pitch) * cameraState.distance + 1.35,
      cameraState.focus.z + Math.cos(cameraState.yaw) * cosPitch * cameraState.distance
    );
    const adjusted = resolveCameraCollision(cameraState.focus, camera.position.clone());
    camera.position.copy(adjusted);
    camera.lookAt(cameraState.focus);
  }

  function resolveCameraCollision(origin, target) {
    cameraDirection.copy(target).sub(origin);
    const maxDistance = cameraDirection.length();
    if (maxDistance <= EPSILON) {
      return target;
    }

    cameraDirection.divideScalar(maxDistance);
    let closestHit = maxDistance;

    for (let i = 0; i < world.colliders.length; i += 1) {
      const hit = rayIntersectExpandedBox(origin, cameraDirection, maxDistance, world.colliders[i], 0.18);
      if (hit != null && hit < closestHit) {
        closestHit = hit;
      }
    }

    if (closestHit < maxDistance) {
      return origin.clone().addScaledVector(cameraDirection, Math.max(2.2, closestHit - 0.2));
    }

    return target;
  }

  function rayIntersectExpandedBox(origin, direction, maxDistance, box, padding) {
    let tMin = 0;
    let tMax = maxDistance;

    for (let i = 0; i < AXIS_NAMES.length; i += 1) {
      const axis = AXIS_NAMES[i];
      const o = origin[axis];
      const d = direction[axis];
      const min = box["min" + axis.toUpperCase()] - padding;
      const max = box["max" + axis.toUpperCase()] + padding;

      if (Math.abs(d) < EPSILON) {
        if (o < min || o > max) {
          return null;
        }
        continue;
      }

      let t1 = (min - o) / d;
      let t2 = (max - o) / d;
      if (t1 > t2) {
        const swap = t1;
        t1 = t2;
        t2 = swap;
      }

      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);

      if (tMin > tMax) {
        return null;
      }
    }

    if (tMin >= 0 && tMin <= maxDistance) {
      return tMin;
    }

    return null;
  }

  function updateStatus() {
    const availableJumps = player.onGround ? 2 : Math.max(0, 2 - player.jumpsUsed);
    const grid = worldToGrid(player.position.x, player.position.z);
    const mouseActive = document.pointerLockElement === canvas;

    jumpStatus.textContent = availableJumps + " / 2";
    positionStatus.textContent = grid.x + ", " + grid.z + " | y " + player.position.y.toFixed(2);
    cameraStatus.textContent = (mouseActive ? "Maus aktiv" : "Maus frei") + " | Zoom " + cameraState.distance.toFixed(1);
  }

  function addGoalFlag() {
    if (!world.goalTile) {
      return;
    }

    const goalPosition = gridToWorld(world.goalTile.x, world.goalTile.z);
    const flagGroup = new THREE.Group();

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.055, 2.6, 10),
      new THREE.MeshStandardMaterial({
        color: 0xd3d6db,
        roughness: 0.45,
        metalness: 0.85
      })
    );
    pole.position.set(goalPosition.x, 1.3, goalPosition.z);
    pole.castShadow = true;
    flagGroup.add(pole);

    const flag = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 0.5, 0.04),
      new THREE.MeshStandardMaterial({
        color: 0xc93636,
        roughness: 0.82,
        metalness: 0.03
      })
    );
    flag.position.set(goalPosition.x + 0.4, 2.05, goalPosition.z);
    flag.castShadow = true;
    flagGroup.add(flag);

    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.24, 12),
      new THREE.MeshStandardMaterial({
        color: 0xf3d27a,
        roughness: 0.4,
        metalness: 0.55
      })
    );
    tip.position.set(goalPosition.x, 2.72, goalPosition.z);
    tip.castShadow = true;
    flagGroup.add(tip);

    dynamicWorldGroup.add(flagGroup);
  }
}());
