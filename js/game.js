'use strict';

// 游戏主循环（占位实现）。真正的玩法（移动、战斗、升级等）后续在此扩展。
const Game = {
  canvas: null,
  ctx: null,
  hero: null,
  player: null,
  running: false,
  rafId: null,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  },

  // 开始一局。heroKey 为 HEROES 中的键。
  start(heroKey) {
    this.hero = HEROES[heroKey];
    this.player = { key: heroKey, hp: this.hero.hp, speed: this.hero.speed };
    Menu.hide();
    this.running = true;
    this.rafId = requestAnimationFrame(() => this.draw());
  },

  draw() {
    if (!this.running) return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = this.hero ? this.hero.color : '#ffb84d';
    ctx.font = 'bold 44px "Segoe UI", "PingFang SC", sans-serif';
    ctx.fillText('Blight Survivors 2', w / 2, h / 2 - 40);

    ctx.fillStyle = '#e8e8f0';
    ctx.font = '22px "Segoe UI", "PingFang SC", sans-serif';
    ctx.fillText('已选择：' + (this.hero ? this.hero.name : '') + '  — 玩法开发中…', w / 2, h / 2 + 30);

    this.rafId = requestAnimationFrame(() => this.draw());
  }
};