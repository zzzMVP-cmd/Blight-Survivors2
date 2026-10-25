'use strict';

// 游戏主循环：固定步长 0.02s/帧，同一帧内多怪物伤害累加后再进无敌帧。
const Game = {
  canvas: null,
  ctx: null,
  hero: null,
  player: null,
  running: false,
  rafId: null,
  lastTime: 0,
  keys: {},

  accumulator: 0,
  FIXED_DT: 0.02,

  shakeTime: 0,
  shakeIntensity: 8,
  hitFlashTime: 0,
  INV_DURATION: 0.3,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.keys = {};
    const setKey = (code, down) => { this.keys[code] = down; };
    window.addEventListener('keydown', (e) => setKey(e.code, true));
    window.addEventListener('keyup', (e) => setKey(e.code, false));
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
      speed: this.hero.speed,
      weapons: [{ name: this.hero.weapon, icon: this.hero.weaponIcon }],
      items: [],
      level: 1,
      exp: 0,
      expNext: 100,
      invTime: 0
    };
    this.shakeTime = 0;
    this.hitFlashTime = 0;
    this.accumulator = 0;
    Weapon.init(this.hero);
    ExpOrbs.clear();
    Menu.hide();
    HUD.build();
    HUD.setWeapons(this.player.weapons);
    HUD.update(this.player);
    Wave.init();
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  },

  loop(t) {
    if (!this.running) return;
    const elapsed = Math.min(0.1, (t - this.lastTime) / 1000);
    this.lastTime = t;
    this.accumulator += elapsed;

    while (this.accumulator >= this.FIXED_DT) {
      this.fixedUpdate(this.FIXED_DT);
      this.accumulator -= this.FIXED_DT;
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
    Wave.update(dt);
    Weapon.update(dt, this.player, Wave.monsters);
    Attack.processWarrior(this.player, Weapon, Wave.monsters);
    this.processKills();
    ExpOrbs.update(dt, this.player);
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

  onHit() {
    this.shakeTime = 0.2;
    this.hitFlashTime = 0.3;
    this.player.invTime = this.INV_DURATION;
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
    ctx.translate(camX, camY);

    for (const m of Wave.monsters) {
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