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

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.keys = {};
    const setKey = (code, down) => { this.keys[code] = down; };
    window.addEventListener('keydown', (e) => {
      setKey(e.code, true);
      if (e.code === 'Escape' && this.running && !Upgrade.showing) {
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

    // 蓄力：画布上按下左键进入蓄力，松开结束（暂停中松手不取消，恢复后才结算）
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (!this.running || this.paused || Upgrade.showing) return;
      Charge.start();
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button !== 0) return;
      if (!this.running || !Charge.holding) return;
      if (Upgrade.showing) { Charge.reset(); return; }
      Charge.end(this.player, Wave.monsters);
    });
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
    Charge.reset();
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
        if (this.paused) break;
        this.fixedUpdate(this.FIXED_DT);
        this.accumulator -= this.FIXED_DT;
      }

      // 暂停时画面静止，跳过整帧绘制与 HUD 写入
      this.draw();
      HUD.update(this.player);
    }

    this.rafId = requestAnimationFrame((tt) => this.loop(tt));
  },

  fixedUpdate(dt) {
    if (this.player.invTime > 0) this.player.invTime -= dt;
    if (this.shakeTime > 0) this.shakeTime -= dt;
    if (this.hitFlashTime > 0) this.hitFlashTime -= dt;

    this.updatePlayer(dt);
    Recovery.update(dt, this.player);
    Wave.update(dt);
    Charge.update(dt);
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

  // 单次遍历完成「掉落经验 + 原地压缩存活列表」，避免每帧分配两个新数组
  processKills() {
    const list = Wave.monsters;
    let write = 0;
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      if (m.hp <= 0) {
        ExpOrbs.spawn(m.x, m.y, m.maxHp);
      } else {
        list[write++] = m;
      }
    }
    list.length = write;
  },

  pause() {
    this.paused = true;
    Menu.showPause();
  },

  resume() {
    this.paused = false;
    this.accumulator = 0;
    this.lastTime = performance.now();
    Menu.hidePause();
  },

  retreat() {
    this.running = false;
    this.paused = false;
    Charge.reset();
    Menu.hidePause();
    HUD.hide();
    Menu.show();
  },

  pauseForUpgrade() {
    this.paused = true;
    Charge.reset();
  },

  resumeFromUpgrade() {
    this.paused = false;
    this.accumulator = 0;
    this.lastTime = performance.now();
  },

  onHit() {
    this.shakeTime = 0.2;
    this.hitFlashTime = 0.3;
    this.player.invTime = this.INV_DURATION;
  },

  // 逐圈筛选：第 n 圈的最小中心距 = (r1+r2) / n。
  // 第一圈系数为 1（刚好贴边），筛完若不足 MAX_RENDER_MONSTERS 只，
  // 就对剩下的怪物用 1/2 的系数再筛一圈，依此类推直到凑满或没有剩余怪物。
  visibleMonsters() {
    const list = Wave.monsters;
    if (list.length === 0) return list;

    const px = this.player.x;
    const py = this.player.y;
    let remaining = list.map((m) => {
      const dx = m.x - px;
      const dy = m.y - py;
      return { m, d: dx * dx + dy * dy };
    });
    remaining.sort((a, b) => a.d - b.d);

    const picked = [];
    let round = 1;
    while (picked.length < this.MAX_RENDER_MONSTERS && remaining.length > 0) {
      const coef = 1 / round;
      const next = [];

      for (const o of remaining) {
        if (picked.length >= this.MAX_RENDER_MONSTERS) {
          next.push(o);
          continue;
        }
        let ok = true;
        for (const p of picked) {
          const minDist = (p.radius + o.m.radius) * coef;
          const dx = p.x - o.m.x;
          const dy = p.y - o.m.y;
          if (dx * dx + dy * dy < minDist * minDist) {
            ok = false;
            break;
          }
        }
        if (ok) picked.push(o.m);
        else next.push(o);
      }

      // 本圈一个都没选上，说明剩下的已经挤到无法再分离，直接补满收尾
      if (next.length === remaining.length) break;
      remaining = next;
      round++;
    }

    for (const o of remaining) {
      if (picked.length >= this.MAX_RENDER_MONSTERS) break;
      picked.push(o.m);
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
    Charge.draw(ctx, this.player);
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