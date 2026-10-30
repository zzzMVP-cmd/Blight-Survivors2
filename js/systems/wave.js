'use strict';

// 波次管理：3s 准备 → 第一波；两波间隔 15s；清场后 1s 提前下一波。
// 每波数量、血量、伤害均为上波的 1.2 倍（四舍五入）。
const Wave = {
  state: 'prepare',
  countdown: 0,
  wave: 0,
  waveElapsed: 0,
  clearAt: null,
  monsters: [],

  waveCount: 0,
  waveHp: 0,
  waveDamage: 0,

  PREPARE_TIME: 3,
  INTERVAL: 15,
  CLEAR_BONUS: 1,
  SCALE: 1.2,

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

    for (const m of this.monsters) {
      MonsterAI.move(m, dt);
    }
    MonsterAI.processAttacks(this.monsters, dt);

    this.waveElapsed += dt;

    const cleared = this.monsters.length === 0;
    if (cleared) {
      if (this.clearAt === null) this.clearAt = this.waveElapsed;
      if (this.waveElapsed - this.clearAt >= this.CLEAR_BONUS) {
        this.startWave();
      }
    } else {
      this.clearAt = null;
      if (this.waveElapsed >= this.INTERVAL) {
        this.startWave();
      }
    }
  },

  startWave() {
    this.wave += 1;
    this.waveElapsed = 0;
    this.clearAt = null;

    if (this.wave > 1) {
      this.waveCount = Math.round(this.waveCount * this.SCALE);
      this.waveHp = Math.round(this.waveHp * this.SCALE);
      this.waveDamage = Math.round(this.waveDamage * this.SCALE);
    }

    for (let i = 0; i < this.waveCount; i++) {
      this.monsters.push(MonsterAI.spawn('slime', Game.player, this.waveHp, this.waveDamage, this.wave));
    }
  },

  getStatus() {
    if (this.state === 'prepare') {
      return '准备中，还有 ' + Math.ceil(Math.max(0, this.countdown)) + ' 秒第一波';
    }
    let nextTime;
    if (this.monsters.length === 0) {
      const waited = this.waveElapsed - (this.clearAt || this.waveElapsed);
      nextTime = Math.max(0, Math.ceil(this.CLEAR_BONUS - waited));
    } else {
      nextTime = Math.max(0, Math.ceil(this.INTERVAL - this.waveElapsed));
    }
    return '当前波数：' + this.wave + ' 下一波时间：' + nextTime;
  }
};