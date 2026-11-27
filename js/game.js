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

  // 鼠标位置（屏幕坐标），蓄力攻击朝向由它决定
  mouse: { x: 0, y: 0, valid: false },

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.keys = {};
    const setKey = (code, down) => { this.keys[code] = down; };
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      setKey(e.code, true);
      if (e.code === 'Escape' && this.running && !Upgrade.showing) {
        if (this.paused) this.resume();
        else this.pause();
      }
    });
    window.addEventListener('keyup', (e) => setKey(e.code, false));

    // 数字键切换武器蓄力开关（1 = 武器栏最左侧的可蓄力武器）
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (!this.running || this.paused || Upgrade.showing) return;
      const idx = this.digitIndex(e.code);
      if (idx >= 0) this.toggleWeaponCharge(idx);
    });

    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.valid = true;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      this.zoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, this.zoom * factor));
    }, { passive: false });

    // 蓄力：画布上按下左键进入蓄力，松开结束（暂停中松手不取消，恢复后才结算）
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.valid = true;
      if (!this.running || this.paused || Upgrade.showing) return;
      Charge.start();
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button !== 0) return;
      if (!this.running || !Charge.holding) return;
      if (Upgrade.showing) { Charge.reset(); return; }
      Charge.end(this.player, this.mouseAngle());
    });
  },

  // 鼠标指向的世界方向（相机恒定把玩家放在画面正中，缩放对角度无影响）
  mouseAngle() {
    if (!this.mouse.valid || !this.canvas) return Weapon.moveAngle;
    return Math.atan2(
      this.mouse.y - this.canvas.height / 2,
      this.mouse.x - this.canvas.width / 2
    );
  },

  // 数字键 → 从 0 开始的序号；非 1~9 的数字键返回 -1
  digitIndex(code) {
    const m = /^(?:Digit|Numpad)([1-9])$/.exec(code);
    return m ? parseInt(m[1], 10) - 1 : -1;
  },

  // 切换武器蓄力开关：可蓄力 → 不可蓄力 → 可蓄力
  toggleWeaponCharge(idx) {
    const list = HUD.chargeWeapons || [];
    const w = list[idx];
    if (!w) return;
    w.chargeEnabled = w.chargeEnabled === false;
    Charge.cancelIfDisabled();
    HUD.updateWeaponCharge();
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
      weapons: [{
        name: this.hero.weapon,
        icon: this.hero.weaponIcon,
        canCharge: this.hero.weaponCanCharge !== false,
        chargeEnabled: true
      }],
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
      effectiveInterval: this.hero.attackInterval,
      // 钝器伤基础值：由破阵斩的大质变累积（大质变只能获取一次）
      bluntDamage: 0,
      // 大质变是否已获取，获取后不再出现在卡池
      bluntMutationTaken: false,
      // 击退速度：基础值来自 Attack.KNOCKBACK_SPEED，可被武器强化提升
      knockbackSpeed: Attack.KNOCKBACK_SPEED,
      // 武器强化各方向已选次数（key 见 Upgrade.WEAPON_UPG）
      weaponUpg: {}
    };
    this.shakeTime = 0;
    this.hitFlashTime = 0;
    this.accumulator = 0;
    Weapon.init(this.hero);
    Upgrade.recalcDisplayAug(this.player);
    Charge.reset();
    ExpOrbs.clear();
    DamageNumbers.clear();
    Upgrade.resetRun();
    Shield.refresh(this.player);
    Menu.hide();
    HUD.build();
    HUD.setWeapons(this.player.weapons);
    Charge.bind(this.player.weapons);
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
    if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;

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
        ExpOrbs.spawn(m.x, m.y, m.maxHp + m.maxShield);
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

  // 场上每一只怪物都会被绘制，不再有渲染数量上限（同屏总量由 Wave.MAX_ALIVE 控制）。
  // 按距玩家的距离从远到近排序：远处的先画，近处的后画压在上面，重叠时层次正确。
  // 同时剔除视口外的怪物：它们本来就画在画布之外，跳过不画视觉上完全等价，
  // 但能省掉一圈绘制开销（同屏上限 400 时约省 20%）。
  renderMonsters() {
    const list = Wave.monsters;
    if (list.length === 0) return list;

    const px = this.player.x;
    const py = this.player.y;
    const hw = this.canvas.width / (2 * this.zoom);
    const hh = this.canvas.height / (2 * this.zoom);

    const order = [];
    for (const m of list) {
      const dx = m.x - px;
      const dy = m.y - py;
      const r = m.radius + 8;
      if (dx < -hw - r || dx > hw + r || dy < -hh - r || dy > hh + r) continue;
      order.push({ m, d: dx * dx + dy * dy });
    }
    order.sort((a, b) => b.d - a.d);

    const out = new Array(order.length);
    for (let i = 0; i < order.length; i++) out[i] = order[i].m;
    return out;
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

    const monsters = this.renderMonsters();
    Monsters.drawShieldRings(ctx, monsters);
    for (const m of monsters) {
      Monsters.draw(ctx, m);
    }
    Monsters.drawShieldTexts(ctx, monsters);

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