'use strict';

// 初始化入口：确定画布尺寸、构建开始页
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game');
  Game.init(canvas);

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  Menu.init();
  Upgrade.init();
  Charge.init();
});

function resizeCanvas() {
  const canvas = document.getElementById('game');
  const dpr = Math.min(window.devicePixelRatio || 1, Game.MAX_DPR);
  const w = window.innerWidth;
  const h = window.innerHeight;

  // 物理像素 = CSS 像素 × dpr，手机上文字与图标不再发糊；上限 2 兼顾性能
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';

  Game.viewW = w;
  Game.viewH = h;
  Game.dpr = dpr;

  if (Game.ctx) Game.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}