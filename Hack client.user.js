// ==UserScript==
// @name         Hack client
// @namespace    Hackudek client
// @version      0.5
// @description  FLY, NOCLIP, KILLAURA GUYS THIS IS A BLATANT HACK
// @author       JamjestAdolf
// @match        https://bloxd.io/*
// @license      MIT
// @downloadURL https://update.greasyfork.org/scripts/567732/Hack%20client.user.js
// @updateURL https://update.greasyfork.org/scripts/567732/Hack%20client.meta.js
// ==/UserScript==

(() => {
  // src/utils.js
  var keys = (obj) => Object.keys(obj ?? {}), values = (obj) => keys(obj).map((key) => obj[key]), entries = (obj) => Object.entries(obj ?? {}), attempt = (fn, fallback = null) => {
    try {
      return fn();
    } catch {
      return fallback;
    }
  }, clone = typeof structuredClone == "function" ? structuredClone : (obj) => obj && JSON.parse(JSON.stringify(obj)), style = (el3, props) => Object.assign(el3.style, props), el = (tag) => document.createElement(tag), floor = Math.floor;

  // src/config.js
  var config = {
    keyMap: {},
    killaura: { delay: 120, range: 6.8, jitterRatio: 0.4 },
    scaffold: { interval: 20 },
    slowSwing: { duration: 2e3 }
  }, moduleNames = [
    "Killaura",
    "Scaffold",
    "SlowSwing",
    "CoordsList",
    "ESP",
    "Bhop"
  ], defaults = {
    Killaura: "KeyK",
    ESP: "KeyE",
    CoordsList: "KeyL",
    Scaffold: "KeyG",
    SlowSwing: "KeyH",
    Bhop: "KeyB"
  }, binds = {}, cookieTag = (name) => `poop_${name}_keybind`, readCookie = (name) => document.cookie.split("; ").find((row) => row.startsWith(cookieTag(name) + "="))?.split("=")[1] ?? null, writeCookie = (name, code) => {
    document.cookie = `${cookieTag(name)}=${code}; path=/; max-age=31536000`;
  }, clearKey = (code) => {
    let mod = config.keyMap[code];
    mod && (delete config.keyMap[code], binds[mod] = null);
  }, setBind = (name, code) => {
    let trimmed = (code ?? "").trim();
    if (binds[name] && delete config.keyMap[binds[name]], !trimmed) {
      binds[name] = null, writeCookie(name, "");
      return;
    }
    clearKey(trimmed), binds[name] = trimmed, config.keyMap[trimmed] = name, writeCookie(name, trimmed);
  }, initBinds = () => {
    moduleNames.forEach(
      (name) => setBind(name, readCookie(name) || defaults[name])
    );
  };
  var getBindsSnapshot = () => {
    let snapshot = {};
    return moduleNames.forEach((name) => {
      snapshot[name] = binds[name] ?? "";
    }), snapshot;
  };

  // src/bloxd.js
  var B = {
    wpRequire: null,
    _noa: null,
    bloxdProps: null,
    get noa() {
      return !this._noa && this.bloxdProps && (this._noa = values(this.bloxdProps).find((p) => p?.entities)), this._noa;
    },
    clear() {
      this.wpRequire = null, this._noa = null, this.bloxdProps = null;
    },
    init(force = !1) {
      if (this.wpRequire && !force) return;
      this.clear();
      let descriptors = Object.getOwnPropertyDescriptors(window), chunkKey = Object.keys(descriptors).find((key) => {
        let setter = descriptors[key]?.set;
        return setter && setter.toString().includes("++");
      });
      if (chunkKey || (chunkKey = Object.keys(window).find((key) => {
        let value = window[key];
        return Array.isArray(value) && typeof value.push == "function";
      })), !chunkKey) throw new Error("Unable to locate webpack chunk");
      let chunk = window[chunkKey], randomID = Math.floor(Math.random() * 9999999) + 1;
      chunk.push([[randomID], {}, (req) => this.wpRequire = req]), this.bloxdProps = values(this.findModule("nonBlocksClient:")).find(
        (o) => typeof o == "object"
      ), this._noa = null;
    },
    findModule(str) {
      if (!this.wpRequire) return null;
      let mods = this.wpRequire.m;
      for (let id in mods) {
        let modFn = mods[id];
        if (modFn && modFn.toString().includes(str))
          return this.wpRequire(id);
      }
      return null;
    }
  }, getImpKey = () => attempt(() => {
    let entities = B.noa.entities, target = values(entities)[2];
    return entries(entities).find(([, val]) => val === target)?.[0] ?? null;
  }), getInventoryContext = () => {
    let noa = B.noa;
    if (!noa) return null;
    let entities = noa.entities, impKey = getImpKey();
    if (!impKey) return null;
    let entity = entities[impKey];
    if (!entity) return null;
    let inventoryWrapper = values(entity).find(
      (value) => value?.list?.[0]?._blockItem
    );
    if (!inventoryWrapper?.list?.length) return null;
    let listItem = inventoryWrapper.list[0];
    return { impKey, entity, inventoryWrapper, listItem };
  }, getHeldBlockContext = () => {
    let ctx = getInventoryContext();
    if (!ctx) return null;
    let heldBlock = ctx.listItem?._blockItem;
    if (!heldBlock) return null;
    let playerEntity = values(ctx.listItem).find(
      (value) => typeof value?.checkTargetedBlockCanBePlacedOver == "function"
    );
    if (!playerEntity) return null;
    let worldInstanceKey, worldInstance;
    if (keys(heldBlock).some((key) => {
      let value = heldBlock[key];
      return value && typeof value == "object" ? (worldInstanceKey = key, worldInstance = value, !0) : !1;
    }), !worldInstanceKey || !worldInstance) return null;
    let targetedBlockKey = null, targetedBlock = null;
    return keys(worldInstance).some((key) => {
      let value = worldInstance[key];
      return value && typeof value == "object" && (value.normal || value.position) ? (targetedBlockKey = key, targetedBlock = value, !0) : !1;
    }), {
      heldBlock,
      worldInstanceKey,
      worldInstance,
      targetedBlockKey,
      targetedBlock,
      playerEntity
    };
  }, createSpoofedContext = (context, position) => {
    let {
      heldBlock,
      worldInstanceKey,
      worldInstance,
      targetedBlockKey,
      targetedBlock
    } = context, safeTarget = clone(targetedBlock) || {
      normal: [0, 1, 0],
      position: [...position],
      blockPosition: position.map(floor),
      hitPoint: [...position]
    };
    return safeTarget.position = [...position], safeTarget.blockPosition = safeTarget.blockPosition ?? position.map(floor), safeTarget.normal = safeTarget.normal ?? [0, 1, 0], safeTarget.hitPoint = safeTarget.hitPoint ?? [...position], new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === worldInstanceKey)
            return new Proxy(worldInstance, {
              get(inner, key) {
                return key === targetedBlockKey ? safeTarget : inner[key];
              }
            });
          if (prop === "checkTargetedBlockCanBePlacedOver") return () => !0;
          let value = heldBlock[prop];
          return typeof value == "function" ? value.bind(heldBlock) : value;
        }
      }
    );
  }, placeSpoofedBlock = (position, context) => {
    let ctx = context ?? getHeldBlockContext();
    return ctx?.heldBlock?.placeBlock ? attempt(() => {
      let spoofed = createSpoofedContext(ctx, position);
      return ctx.heldBlock.placeBlock.call(spoofed), !0;
    }, !1) : !1;
  };

  // src/modules/base.js
  var Module = class {
    constructor(name) {
      this.name = name, this.enabled = !1;
    }
    onEnable() {
    }
    onDisable() {
    }
    onRender() {
    }
    toggle() {
      this.enabled ? this.disable() : this.enable();
    }
    enable() {
      this.enabled || (this.enabled = !0, this.onEnable());
    }
    disable() {
      this.enabled && (this.enabled = !1, this.onDisable());
    }
  }, base_default = Module;

  // src/game.js
  var game = {
    getPosition: (id) => attempt(() => B.noa.entities.getState(id, "position").position),
    getMoveState: (id) => attempt(() => B.noa.entities.getState(id, "movement")),
    get registry() {
      return attempt(() => values(B.noa)[17], {});
    },
    get getSolidity() {
      return values(this.registry)[5];
    },
    get getBlockID() {
      return attempt(
        () => {
          let names = Object.getOwnPropertyNames(
            B.noa.bloxd.constructor.prototype
          );
          return B.noa.bloxd[names[3]].bind(B.noa.bloxd);
        },
        () => 0
      );
    },
    getHeldItemGetter() {
      return attempt(
        () => values(B.noa.entities).find((fn) => {
          if (typeof fn != "function" || fn.length !== 1) return !1;
          let body = fn.toString();
          return body.length < 80 && body.includes(").") && !body.includes("opWrapper");
        })
      );
    },
    safeHeld(id) {
      let getter = this.getHeldItemGetter();
      return getter ? attempt(() => getter(id)) : null;
    },
    get playerList() {
      return attempt(() => {
        let ids = B.noa?.bloxd?.getPlayerIds?.();
        return ids ? Object.values(ids).map(Number).filter((id) => id && id !== 1 && this.safeHeld(id)) : [];
      }, []);
    },
    get doAttack() {
      let held = this.safeHeld(1);
      if (!held) return () => {
      };
      let attack = held.doAttack || held.breakingItem?.doAttack;
      return attack ? attack.bind(held) : () => {
      };
    },
    touchingWall() {
      let pos = this.getPosition(1);
      if (!pos) return !1;
      let r = 0.35, offsets = [
        [0, 0],
        [r, 0],
        [-r, 0],
        [0, r],
        [0, -r],
        [r, r],
        [r, -r],
        [-r, r],
        [-r, -r]
      ], heights = [0, 1, 2], getId = this.getBlockID;
      for (let [ox, oz] of offsets)
        for (let h of heights) {
          let id = attempt(
            () => getId(floor(pos[0] + ox), floor(pos[1]) + h, floor(pos[2] + oz)),
            null
          );
          if (id !== null && this.getSolidity(id)) return !0;
        }
      return !1;
    },
    getHeldItemState() {
      return getHeldBlockContext()?.playerEntity?.heldItemState || null;
    }
  };

  // src/math.js
  var math = {
    norm(v) {
      let s = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
      if (!s) return v;
      let i = 1 / Math.sqrt(s);
      return [v[0] * i, v[1] * i, v[2] * i];
    },
    dist(a, b) {
      let dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },
    distSq(a, b) {
      let dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
      return dx * dx + dy * dy + dz * dz;
    }
  };

  // src/modules/killaura.js
  var Killaura = class extends base_default {
    constructor() {
      super("Killaura"), this.lastSwing = 0;
    }
    onEnable() {
      this.lastSwing = 0;
    }
    onRender() {
      let now = Date.now(), baseDelay = config.killaura.delay, jitter = baseDelay * config.killaura.jitterRatio * (Math.random() - 0.5), effectiveDelay = Math.max(25, baseDelay + jitter);
      if (now - this.lastSwing < effectiveDelay)
        return;
      this.lastSwing = now;
      let playerPosition = game.getPosition(1);
      if (!playerPosition)
        return;
      let killRadius = config.killaura.range, killRadiusSq = killRadius * killRadius;
      game.playerList.forEach((playerId, index) => {
        let enemyPos = game.getPosition(playerId);
        if (!enemyPos || math.distSq(playerPosition, enemyPos) > killRadiusSq)
          return;
        let vector = math.norm([
          enemyPos[0] - playerPosition[0],
          enemyPos[1] - playerPosition[1],
          enemyPos[2] - playerPosition[2]
        ]);
        try {
          game.doAttack(vector, playerId.toString(), "BodyMesh");
          let safeHeld = game.safeHeld(1);
          safeHeld?.trySwingBlock && safeHeld.trySwingBlock();
          let moveState2 = game.getMoveState(1);
          moveState2?.setArmsAreSwinging && moveState2.setArmsAreSwinging();
        } catch (error) {
          console.debug("[KILLAURA] Killaura attack failed:", error), console.error("[KILLAURA] Error details:", error.message, error.stack);
        }
      });
    }
  }, killaura_default = Killaura;

  // src/modules/scaffold.js
  var Scaffold = class extends base_default {
    constructor() {
      super("Scaffold"), this.interval = null;
    }
    onEnable() {
      this.startInterval();
    }
    onDisable() {
      clearInterval(this.interval), this.interval = null;
    }
    startInterval() {
      clearInterval(this.interval);
      let delay = Math.max(5, config.scaffold?.interval ?? 20);
      this.interval = setInterval(() => this.enabled && this.tryPlace(), delay), this.tryPlace();
    }
    tryPlace() {
      let context = getHeldBlockContext();
      if (!context?.playerEntity || context.playerEntity.heldItemState?.heldType !== "CubeBlock") return;
      let pos = game.getPosition(1);
      if (!pos) return;
      let blockX = floor(pos[0]), blockY = floor(pos[1]), blockZ = floor(pos[2]), checkPlace = (x, y, z) => attempt(
        () => context.playerEntity.checkTargetedBlockCanBePlacedOver?.([x, y, z]),
        !1
      ) ? !0 : attempt(() => !game.getSolidity(game.getBlockID(x, y, z)), !1), target = [blockX, blockY - 1, blockZ];
      if (placeSpoofedBlock(target, context) || checkPlace(...target) && placeSpoofedBlock(target, context)) return;
      let dx = pos[0] - blockX, dz = pos[2] - blockZ, offsets = [];
      dx < 0.3 && offsets.push([-1, 0]), dx > 0.7 && offsets.push([1, 0]), dz < 0.3 && offsets.push([0, -1]), dz > 0.7 && offsets.push([0, 1]), offsets.some(([ox, oz]) => {
        let coords = [blockX + ox, blockY - 1, blockZ + oz];
        return checkPlace(...coords) && placeSpoofedBlock(coords, context);
      });
    }
  }, scaffold_default = Scaffold;

  // src/modules/slowswing.js
  var SlowSwing = class extends base_default {
    constructor() {
      super("SlowSwing"), this.slowDuration = config.slowSwing.duration || 2e3, this.normalDuration = 200;
    }
    setSwing(duration) {
      let heldState = game.getHeldItemState();
      heldState && (heldState.swingDuration = duration);
    }
    onEnable() {
      this.setSwing(this.slowDuration);
    }
    onDisable() {
      this.setSwing(this.normalDuration);
    }
  }, slowswing_default = SlowSwing;

  // src/modules/coordsList.js
  var CoordsList = class extends base_default {
    constructor() {
      super("CoordsList"), this.disabled = !0, this.ondisabled = !1;
    }
    onEnable() {
      this.disabled = !1, this.ondisabled = !1;
    }
    onDisable() {
      this.disabled = !0, this.ondisabled = !1;
    }
    onRender() {
      if (!(this.disabled && this.ondisabled) && B?.noa.bloxd?.entityNames)
        try {
          for (let entityId in B.noa.bloxd.entityNames) {
            if (entityId === "1")
              continue;
            let entityData = B.noa.bloxd.entityNames[entityId], positionData = B.noa.entities?.getState?.(entityId, "position");
            if (!positionData || !positionData.position)
              continue;
            let position = positionData.position, x = Math.round(position[0]), y = Math.round(position[1]), z = Math.round(position[2]), baseName = entityData.entityName.replace(/\s*\(\-?\d+,\s*\-?\d+,\s*\-?\d+\)$/, "");
            if (!this.ondisabled && this.disabled) {
              entityData.entityName = baseName, this.ondisabled = !0;
              continue;
            }
            entityData.entityName = `${baseName} (${x}, ${y}, ${z})`;
          }
        } catch (error) {
          console.error("Error updating player coords:", error);
        }
    }
  }, coordsList_default = CoordsList;

  // src/modules/esp.js
  var ESP = class extends base_default {
    constructor() {
      super("ESP"), this.interval = null;
    }
    update(state) {
      if (!B.noa) return;
      let rendering = values(B.noa)[12];
      if (!rendering) return;
      let thinMeshes = values(rendering).find(
        (value) => value?.thinMeshes
      )?.thinMeshes;
      if (!Array.isArray(thinMeshes)) return;
      let renderingGroupId = state ? 2 : 0;
      for (let item of thinMeshes) {
        let mesh = item?.meshVariations?.__DEFAULT__?.mesh;
        mesh && typeof mesh.renderingGroupId == "number" && (mesh.renderingGroupId = renderingGroupId);
      }
    }
    onEnable() {
      this.update(!0), this.interval = setInterval(() => this.update(!0), 300);
    }
    onDisable() {
      clearInterval(this.interval), this.interval = null, this.update(!1);
    }
    onRender() {
      this.enabled && this.update(!0);
    }
  }, esp_default = ESP;

  // src/modules/bhop.js
  var bhopInterval = null, moveState = null, movement = null, bunnyhopping = !1;
  function initBhop() {
    moveState = game.getMoveState(1), moveState && (movement = attempt(() => B.noa.entities.getState(1, "movement")));
  }
  function bhopTick() {
    if (!moveState) return;
    let touchScreen = !1;
    moveState._isAlive ? moveState.crouching || moveState.speed < 0.05 || movement?._flying ? bunnyhopping && (touchScreen ? moveState.jumping = !1 : B.noa?.inputs?.state && (B.noa.inputs.state.jump = !1), bunnyhopping = !1) : (bunnyhopping || (bunnyhopping = !0), movement?.isOnGround?.() ? touchScreen ? moveState.jumping = !0 : B.noa?.inputs?.state && (B.noa.inputs.state.jump = !0) : touchScreen ? moveState.jumping = !1 : B.noa?.inputs?.state && (B.noa.inputs.state.jump = !1)) : moveState.speedMultiplier?.multipliers && (moveState.speedMultiplier.multipliers.bhop = 1);
  }
  function startBhop() {
    bhopInterval || (initBhop(), bhopInterval = setInterval(() => {
      moveState || initBhop(), bhopTick();
    }, 1));
  }
  function stopBhop() {
    bhopInterval && (clearInterval(bhopInterval), bhopInterval = null), moveState?.speedMultiplier?.multipliers && (moveState.speedMultiplier.multipliers.bhop = 1), bunnyhopping = !1, moveState = null, movement = null;
  }
  var Bhop = class extends base_default {
    constructor() {
      super("Bhop");
    }
    onEnable() {
      startBhop();
    }
    onDisable() {
      stopBhop();
    }
  };

  // src/modules/index.js
  var modules = [
    new killaura_default(),
    new scaffold_default(),
    new slowswing_default(),
    new coordsList_default(),
    new esp_default(),
    new Bhop()
  ];

  // src/ui.js
  var setupUI = (modules2, reinject2) => {
    let listBox = el("div");
    style(listBox, {
      position: "fixed",
      top: "10px",
      left: "40px",
      background: "rgba(0,0,0,.6)",
      color: "#fff",
      padding: "6px 8px",
      borderRadius: "4px",
      font: "12px sans-serif",
      zIndex: 999999
    }), document.body.appendChild(listBox);
    let toggleBtn = el("button");
    toggleBtn.textContent = "\u2261", style(toggleBtn, {
      position: "fixed",
      top: "10px",
      left: "10px",
      width: "24px",
      height: "24px",
      cursor: "pointer",
      zIndex: 1e6
    }), document.body.appendChild(toggleBtn), toggleBtn.onclick = () => {
      listBox.style.display = listBox.style.display === "none" ? "block" : "none";
    };
    let gear = el("button");
    gear.textContent = "\u2699\uFE0F", style(gear, {
      position: "fixed",
      top: "10px",
      right: "10px",
      cursor: "pointer",
      zIndex: 1e6
    }), document.body.appendChild(gear);
    let panel2 = el("div");
    style(panel2, {
      position: "fixed",
      top: "45px",
      right: "10px",
      background: "rgba(0,0,0,.8)",
      color: "#fff",
      padding: "10px",
      borderRadius: "5px",
      font: "12px sans-serif",
      zIndex: 1e6,
      display: "none",
      overflow: "scroll"
    }), panel2.innerHTML = `
    <h2><strong>Generic Skid Clientâ‚‚</strong></h2>
<details>
    <summary><strong>Keybinds</strong></summary>
    <div id="kb"></div>
</details>
    <hr>
<details>
  <summary>
<strong>Killaura</strong>
</summary>
<br>
Delay <input id="ka-d" type="number" style="width:60px"> ms<br>
Range <input id="ka-r" type="number" style="width:60px"><br>
Jitter Ratio <input id="ka-j" type="number" step="0.05" style="width:60px">
</details>

    <hr>
<details>
<summary>
<strong>Scaffold</strong></summary><br>
Delay <input id="sc-i" type="number" style="width:60px"> ms<br>
</details>
    <hr>
<summary><strong>SlowSwing</strong></<ummary><br>
Duration <input id="ss-d" type="number" style="width:60px"> ms<br>
<hr>
<button id="manual-reinject">Re-Inject Client</button>
  `, document.body.appendChild(panel2), gear.onclick = () => {
      panel2.style.display = panel2.style.display === "none" ? "block" : "none";
    };
    let refreshList2 = () => {
      listBox.innerHTML = "", modules2.forEach((module) => {
        let row = el("div");
        row.textContent = module.name, row.style.cursor = "pointer", row.style.font="18px sans-serif", row.style.color = module.enabled ? "#0f0" : "#f00", row.onclick = () => {
          module.toggle(), refreshList2();
        }, listBox.appendChild(row);
      });
    }, drawKeyInputs2 = () => {
      let kb = panel2.querySelector("#kb");
      kb.innerHTML = "";
      let snapshot = getBindsSnapshot();
      moduleNames.forEach((name) => {
        let row = el("div");
        row.innerHTML = `${name}: <input data-mod="${name}" value="${snapshot[name]}" style="width:80px">`, kb.appendChild(row);
      }), kb.querySelectorAll("input").forEach((input) => {
        input.onchange = (e) => {
          let mod = e.target.dataset.mod;
          setBind(mod, e.target.value), drawKeyInputs2();
        };
      });
    };
    return panel2.querySelector("#manual-reinject").onclick = () => reinject2(refreshList2), {
      panel: panel2,
      refreshList: refreshList2,
      drawKeyInputs: drawKeyInputs2
    };
  };

  // src/listeners.js
  var setupKeyListener = (modules2, refreshList2) => {
    window.addEventListener(
      "keydown",
      (e) => {
        if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
        let modName = config.keyMap[e.code];
        if (!modName) return;
        e.preventDefault();
        let module = modules2.find((m) => m.name === modName);
        module && (module.toggle(), refreshList2());
      },
      !0
    );
  };

  // src/loop.js
  var startLoop = (modules2) => {
    let loop = () => {
      modules2.forEach((module) => module.enabled && module.onRender()), requestAnimationFrame(loop);
    };
    loop();
  };

  // src/index.js
  initBinds();
  attempt(() => B.init());
  window.gensc = { B, modules };
  var reinject = (refreshList2) => {
    try {
      B.init(!0);
    } catch (error) {
      console.warn("Re-inject init failed", error);
    }
    modules.forEach((module) => {
      if (module.enabled)
        try {
          module.onDisable?.();
        } catch (error) {
          console.debug(`Disable ${module.name} failed`, error);
        }
    }), modules.forEach((module) => {
      if (module.enabled)
        try {
          module.onEnable?.();
        } catch (error) {
          console.debug(`Enable ${module.name} failed`, error);
        }
    }), refreshList2();
  }, { panel, refreshList, drawKeyInputs } = setupUI(modules, reinject), delayInput = panel.querySelector("#ka-d"), rangeInput = panel.querySelector("#ka-r"), jitterInput = panel.querySelector("#ka-j"), scaffoldDelayInput = panel.querySelector("#sc-i"), slowSwingDurationInput = panel.querySelector("#ss-d");
  delayInput && (delayInput.value = config.killaura.delay, delayInput.onchange = (e) => config.killaura.delay = +e.target.value);
  rangeInput && (rangeInput.value = config.killaura.range, rangeInput.onchange = (e) => config.killaura.range = +e.target.value);
  jitterInput && (jitterInput.value = config.killaura.jitterRatio, jitterInput.onchange = (e) => config.killaura.jitterRatio = +e.target.value);
  scaffoldDelayInput && (scaffoldDelayInput.value = config.scaffold.interval, scaffoldDelayInput.onchange = (e) => config.scaffold.interval = +e.target.value);
  slowSwingDurationInput && (slowSwingDurationInput.value = config.slowSwing.duration, slowSwingDurationInput.onchange = (e) => config.slowSwing.duration = +e.target.value);
  refreshList();
  drawKeyInputs();
  setupKeyListener(modules, refreshList);
  startLoop(modules);
})();