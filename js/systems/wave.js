'use strict';

// 波次管理：3s 准备 → 第一波；两波间隔 15s；清场后 1s 提前下一波。
// 每波数量、血量、伤害均为上波的 1.2 倍（四舍五入）。
// 同屏存活怪物上限 MAX_ALIVE：超出部分进 spawnQueue 排队，每死一只补刷一只，
// 直到队列清空才判定本波清场（排队数跨波累积，不会丢弃，经验总量不减少）。
// 上限同时承担「渲染上限」的作用：不再有独立的渲染筛选，场上每一只都会被绘制。
// 倒计时规则：非清场状态下倒计时到 INTERVAL 时，若刷怪列表还有怪物没刷完（spawnQueue>0），
// 则追加 EXTENSION 秒继续刷，直到队列清空为止；否则强制进入下一波。
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
  EXTENSION: 30,
  CLEAR_BONUS: 1,
  SCALE: 1.2,
  MAX_ALIVE: 150,

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
      if (this.waveElapsed >= this.waveDeadline) {
        if (this.spawnQueue > 0) {
          // 到点时刷怪列表还有怪物没刷完：追加 EXTENSION 秒继续刷
          this.waveDeadline += this.EXTENSION;
        } else {
          this.startWave();
        }
      }
    }
  },

  // 补刷：队列里还有怪物、且同屏未达上限时，把队列按当前波数值生成到场上
  fillField() {
    while (this.spawnQueue > 0 && this.monsters.length < this.MAX_ALIVE) {
      this.spawnQueue -= 1;
      this.monsters.push(MonsterAI.spawn('slime', Game.player, this.waveHp, this.waveDamage, this.wave));
    }
  },

  startWave() {
    this.wave += 1;
    this.waveElapsed = 0;
    this.clearAt = null;
    this.waveDeadline = this.INTERVAL;

    if (this.wave > 1) {
      this.waveCount = Math.round(this.waveCount * this.SCALE);
      this.waveHp = Math.round(this.waveHp * this.SCALE);
      this.waveDamage = Math.round(this.waveDamage * this.SCALE);
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
    } else {
      nextTime = Math.max(0, Math.ceil(this.waveDeadline - this.waveElapsed));
    }
    return '当前波数：' + this.wave + ' 下一波时间：' + nextTime;
  }
};