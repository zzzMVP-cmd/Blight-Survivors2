'use strict';

// 初始化入口：确定画布尺寸、构建开始页
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game');
  Game.init(canvas);

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  Menu.init();
  Upgrade.init();
});

function resizeCanvas() {
  const canvas = document.getElementById('game');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (Game.ctx) {
    Game.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}