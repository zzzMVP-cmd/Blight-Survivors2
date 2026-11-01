'use strict';

// 游戏主循环：固定步长 0.02s/帧，同一帧内多怪物伤害累加后再进无敌帧。
const Game = {
  canvas: null,
  ctx: null,
  hero: null,
  player: null,
  running: false,
  paused: false,
  rafId: null,
  lastTime: 0,
  keys: {},

  accumulator: 0,
  FIXED_DT: 0.02,

  shakeTime: 0,
  shakeIntensity: 8,
  hitFlashTime: 0,
  INV_DURATION: 0.5,

  zoom: 1,
  MIN_ZOOM: 0.3,
  MAX_ZOOM: 3,

  MAX_RENDER_MONSTERS: 100,
  RENDER_SPACING: 1.5,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.keys = {};
    const setKey = (code, down) => { this.keys[code] = down; };
    window.addEventListener('keydown', (e) => {
      setKey(e.code, true);
      if (e.code === 'Escape' && this.running) {
        if (this.paused) this.resume();
        else this.pause();
      }
    });
    window.addEventListener('keyup', (e) => setKey(e.code, false));

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      this.zoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, this.zoom * factor));
    }, { passive: false });
  },

  start(heroKey) {
    this.hero = HEROES[heroKey];
    this.player = {
      key: heroKey,
      x: 0,
      y: 0,
      r: 18,
      hp: this.hero.hp,
      maxHp: this.hero.hp,
      shieldMult: 1,
      shield: 0,
      maxShield: 0,
      speed: this.hero.speed,
      weapons: [{ name: this.hero.weapon, icon: this.hero.weaponIcon }],
      items: [],
      level: 1,
      exp: 0,
      expNext: 100,
      invTime: 0,
      recoveryLv: 0,
      critRate: 0,
      critComp: 0,
      weaponSpeedAug: 1,
      weaponPowerAug: 1,
      globalSpeedAug: 1,
      globalPowerAug: 1,
      displaySpeedAug: 1,
      displayPowerAug: 1,
      overflowDmgMult: 1,
      effectiveInterval: this.hero.attackInterval
    };
    this.shakeTime = 0;
    this.hitFlashTime = 0;
    this.accumulator = 0;
    Weapon.init(this.hero);
    ExpOrbs.clear();
    DamageNumbers.clear();
    Upgrade.resetRun();
    Shield.refresh(this.player);
    Menu.hide();
    HUD.build();
    HUD.setWeapons(this.player.weapons);
    HUD.update(this.player);
    Wave.init();
    this.running = true;
    this.paused = false;
    this.zoom = 1;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  },

  loop(t) {
    if (!this.running) return;
    const elapsed = Math.min(0.1, (t - this.lastTime) / 1000);
    this.lastTime = t;

    if (!this.paused) {
      this.accumulator += elapsed;

      while (this.accumulator >= this.FIXED_DT) {
        this.fixedUpdate(this.FIXED_DT);
        this.accumulator -= this.FIXED_DT;
      }
    }

    this.draw();
    HUD.update(this.player);

    this.rafId = requestAnimationFrame((tt) => this.loop(tt));
  },

  fixedUpdate(dt) {
    if (this.player.invTime > 0) this.player.invTime -= dt;
    if (this.shakeTime > 0) this.shakeTime -= dt;
    if (this.hitFlashTime > 0) this.hitFlashTime -= dt;

    this.updatePlayer(dt);
    Recovery.update(dt, this.player);
    Wave.update(dt);
    Weapon.update(dt, this.player, Wave.monsters);
    Attack.processWarrior(this.player, Weapon, Wave.monsters);
    this.processKills();
    ExpOrbs.update(dt, this.player);
    DamageNumbers.update(dt);
  },

  updatePlayer(dt) {
    let dx = 0, dy = 0;
    if (this.keys['KeyW']) dy -= 1;
    if (this.keys['KeyS']) dy += 1;
    if (this.keys['KeyA']) dx -= 1;
    if (this.keys['KeyD']) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      this.player.x += (dx / len) * this.player.speed * dt;
      this.player.y += (dy / len) * this.player.speed * dt;
    }

    Weapon.setMoveAngle(dx, dy);
  },

  processKills() {
    const dead = Wave.monsters.filter(m => m.hp <= 0);
    for (const m of dead) {
      ExpOrbs.spawn(m.x, m.y, m.maxHp);
    }
    Wave.monsters = Wave.monsters.filter(m => m.hp > 0);
  },

  pause() {
    this.paused = true;
    Menu.showPause();
  },

  resume() {
    this.paused = false;
    this.lastTime = performance.now();
    Menu.hidePause();
  },

  retreat() {
    this.running = false;
    this.paused = false;
    Menu.hidePause();
    HUD.hide();
    Menu.show();
  },

  pauseForUpgrade() {
    this.paused = true;
  },

  resumeFromUpgrade() {
    this.paused = false;
    this.lastTime = performance.now();
  },

  onHit() {
    this.shakeTime = 0.2;
    this.hitFlashTime = 0.3;
    this.player.invTime = this.INV_DURATION;
  },

  // 只渲染距离英雄最近的 MAX_RENDER_MONSTERS 只怪物。
  // 按距离由近到远依次挑选，任意两只被选中怪物的中心距需 ≥ (r1+r2) × RENDER_SPACING，
  // 过近的跳过并继续往后补足，避免同屏怪物叠在一起看不清。
  visibleMonsters() {
    const list = Wave.monsters;
    if (list.length <= this.MAX_RENDER_MONSTERS) return list;

    const px = this.player.x;
    const py = this.player.y;
    const scored = list.map((m) => {
      const dx = m.x - px;
      const dy = m.y - py;
      return { m, d: dx * dx + dy * dy };
    });
    scored.sort((a, b) => a.d - b.d);

    const picked = [];
    for (const o of scored) {
      if (picked.length >= this.MAX_RENDER_MONSTERS) break;

      let ok = true;
      for (const p of picked) {
        const minDist = (p.radius + o.m.radius) * this.RENDER_SPACING;
        const dx = p.x - o.m.x;
        const dy = p.y - o.m.y;
        if (dx * dx + dy * dy < minDist * minDist) {
          ok = false;
          break;
        }
      }
      if (ok) picked.push(o.m);
    }

    return picked;
  },

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, w, h);

    let camX = w / 2 - this.player.x;
    let camY = h / 2 - this.player.y;
    if (this.shakeTime > 0) {
      camX += (Math.random() - 0.5) * 2 * this.shakeIntensity;
      camY += (Math.random() - 0.5) * 2 * this.shakeIntensity;
    }

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-w / 2 + camX, -h / 2 + camY);

    for (const m of this.visibleMonsters()) {
      Monsters.draw(ctx, m);
    }

    const inv = this.player.invTime > 0;
    const visible = !inv || Math.floor(this.player.invTime * 20) % 2 === 0;
    if (visible) {
      ctx.fillStyle = '#ffd76e';
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, this.player.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    Weapon.draw(ctx, this.player);
    ExpOrbs.draw(ctx);
    DamageNumbers.draw(ctx);

    ctx.restore();

    if (this.hitFlashTime > 0) {
      const alpha = Math.min(1, this.hitFlashTime / 0.15) * 0.45;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,30,30,' + alpha + ')';
      ctx.lineWidth = 12;
      ctx.strokeRect(0, 0, w, h);
      ctx.restore();
    }
  }
};