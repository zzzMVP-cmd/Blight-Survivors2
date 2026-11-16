'use strict';

// 波次管理：3s 准备 → 第一波；两波间隔 15s；清场后 1s 提前下一波。
// 第 40 波是关键节点：数量、血量、伤害均为上波的 1.2 倍（四舍五入）。
// 40 波之后数量不再增长，血量与伤害改为每波 1.44 倍（相当于原本「数量 × 血量」的合并增幅）。
// 同屏存活怪物上限 MAX_ALIVE：超出部分进 spawnQueue 排队，每死一只补刷一只，
// 直到队列清空才判定本波清场（排队数跨波累积，不会丢弃，经验总量不减少）。
// 上限同时承担「渲染上限」的作用：不再有独立的渲染筛选，场上每一只都会被绘制。
// 倒计时规则：关键节点波（40 的倍数）不限时，必须清场才进入下一波；
// 其余波次到 INTERVAL 时强制进入下一波，未刷完的排队数继续累积到下一波。
const Wave = {
  state: 'prepare',
  countdown: 0,
  wave: 0,
  waveElapsed: 0,
  clearAt: null,
  monsters: [],
  spawnQueue: 0,
  waveDeadline: 0,

  waveCount: 0,
  waveHp: 0,
  waveDamage: 0,

  PREPARE_TIME: 3,
  INTERVAL: 15,
  CLEAR_BONUS: 1,
  SCALE: 1.2,
  LATE_SCALE: 1.44,
  KEY_WAVE_STEP: 40,
  MAX_ALIVE: 200,

  BASE_COUNT: 4,
  BASE_HP: 30,
  BASE_DAMAGE: 10,

  init() {
    this.state = 'prepare';
    this.countdown = this.PREPARE_TIME;
    this.wave = 0;
    this.waveElapsed = 0;
    this.clearAt = null;
    this.monsters = [];
    this.spawnQueue = 0;
    this.waveDeadline = 0;
    this.waveCount = this.BASE_COUNT;
    this.waveHp = this.BASE_HP;
    this.waveDamage = this.BASE_DAMAGE;
  },

  update(dt) {
    if (this.state === 'prepare') {
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.state = 'active';
        this.startWave();
      }
      return;
    }

    this.fillField();

    for (const m of this.monsters) {
      MonsterAI.move(m, dt);
    }
    MonsterAI.separate(this.monsters);
    MonsterAI.processAttacks(this.monsters, dt);

    this.waveElapsed += dt;

    const cleared = this.monsters.length === 0 && this.spawnQueue === 0;
    if (cleared) {
      this.clearAt = this.clearAt === null ? this.waveElapsed : this.clearAt;
      if (this.waveElapsed - this.clearAt >= this.CLEAR_BONUS) {
        this.startWave();
      }
    } else {
      this.clearAt = null;
      if (this.waveElapsed >= this.waveDeadline) this.startWave();
    }
  },

  // 补刷：队列里还有怪物、且同屏未达上限时，把队列按当前波数值生成到场上
  fillField() {
    while (this.spawnQueue > 0 && this.monsters.length < this.MAX_ALIVE) {
      this.spawnQueue -= 1;
      this.monsters.push(MonsterAI.spawn('slime', Game.player, this.waveHp, this.waveDamage, this.wave));
    }
  },

  // 关键节点波：40 的倍数，不限时，必须清场才进入下一波
  isKeyWave(wave) {
    return wave > 0 && wave % this.KEY_WAVE_STEP === 0;
  },

  startWave() {
    this.wave += 1;
    this.waveElapsed = 0;
    this.clearAt = null;
    this.waveDeadline = this.isKeyWave(this.wave) ? Infinity : this.INTERVAL;

    if (this.wave > 1) {
      if (this.wave <= this.KEY_WAVE_STEP) {
        this.waveCount = Math.round(this.waveCount * this.SCALE);
        this.waveHp = Math.round(this.waveHp * this.SCALE);
        this.waveDamage = Math.round(this.waveDamage * this.SCALE);
      } else {
        // 40 波之后数量封顶，血量与伤害改为每波 1.44 倍
        this.waveHp = Math.round(this.waveHp * this.LATE_SCALE);
        this.waveDamage = Math.round(this.waveDamage * this.LATE_SCALE);
      }
    }

    this.spawnQueue += this.waveCount;
    this.fillField();
  },

  getStatus() {
    if (this.state === 'prepare') {
      return '准备中，还有 ' + Math.ceil(Math.max(0, this.countdown)) + ' 秒第一波';
    }
    let nextTime;
    if (this.monsters.length === 0 && this.spawnQueue === 0) {
      const waited = this.waveElapsed - (this.clearAt || this.waveElapsed);
      nextTime = Math.max(0, Math.ceil(this.CLEAR_BONUS - waited));
    } else if (this.isKeyWave(this.wave)) {
      nextTime = '不限时（清场后进入下一波）';
    } else {
      nextTime = Math.max(0, Math.ceil(this.waveDeadline - this.waveElapsed));
    }
    return '当前波数：' + this.wave + ' 下一波时间：' + nextTime;
  }
};