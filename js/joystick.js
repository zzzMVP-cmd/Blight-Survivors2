'use strict';

// 屏幕左下角的虚拟摇杆（仅摇杆模式显示）：
// 外圈是白色半透明大圆，内圈是黄色小圆。手指按在外圈内任意位置后，
// 内圈中心跟随手指（限制在外圈内），英雄朝「外圈圆心 → 内圈圆心」的方向以固定速度移动。
const Joystick = {
  active: false,
  touchId: null,
  centerX: 0,
  centerY: 0,
  knobX: 0,
  knobY: 0,
  // 单位方向向量（长度恒为 1），moving 为 false 时英雄不移动
  dx: 0,
  dy: 0,
  moving: false,

  OUTER_R: 80,
  KNOB_R: 34,
  // 圆心距屏幕左边 110px（外圈半径 80 + 30px 留白）
  MARGIN_X: 110,
  // 圆心距屏幕下边 210px：外圈下沿落在离底 130px 处，
  // 底部武器栏实测高 100px（含底部 18px 留白后顶边离底约 118px），
  // 两者上下排布，中间留约 12px 间隙，互不遮挡
  MARGIN_BOTTOM: 210,
  // 死区：内圈离圆心不足外圈半径的 15% 时视为不动，避免手指抖动走位
  DEAD_ZONE: 0.15,
  // 手指稍微偏出外圈也能按住，命中判定多给 12px 容差
  HIT_PAD: 12,

  OUTER_FILL: 'rgba(255,255,255,.10)',
  OUTER_EDGE: 'rgba(255,255,255,.45)',
  KNOB_FILL: 'rgba(255,215,110,.85)',
  KNOB_EDGE: 'rgba(255,215,110,.95)',

  // 圆心随窗口高度变化；未按住时内圈停在圆心
  layout() {
    this.centerX = this.MARGIN_X;
    this.centerY = Game.viewH - this.MARGIN_BOTTOM;
    if (!this.active) {
      this.knobX = this.centerX;
      this.knobY = this.centerY;
    }
  },

  hitTest(x, y) {
    this.layout();
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    const r = this.OUTER_R + this.HIT_PAD;
    return dx * dx + dy * dy <= r * r;
  },

  start(id, x, y) {
    this.layout();
    this.active = true;
    this.touchId = id;
    this.knobX = x;
    this.knobY = y;
    this.updateVector();
  },

  // 返回 true 表示这次移动属于摇杆，调用方不应再当作其他手势处理
  move(id, x, y) {
    if (!this.active || this.touchId !== id) return false;
    this.knobX = x;
    this.knobY = y;
    this.updateVector();
    return true;
  },

  // 内圈中心被限制在外圈内，方向与死区都按「限制后」的位置计算
  updateVector() {
    let dx = this.knobX - this.centerX;
    let dy = this.knobY - this.centerY;
    const len = Math.hypot(dx, dy);

    if (len > this.OUTER_R) {
      dx = (dx / len) * this.OUTER_R;
      dy = (dy / len) * this.OUTER_R;
      this.knobX = this.centerX + dx;
      this.knobY = this.centerY + dy;
    }

    const dist = Math.min(len, this.OUTER_R);
    if (dist < this.OUTER_R * this.DEAD_ZONE) {
      this.dx = 0;
      this.dy = 0;
      this.moving = false;
      return;
    }

    this.dx = dx / dist;
    this.dy = dy / dist;
    this.moving = true;
  },

  // 返回 true 表示这根手指之前由摇杆接管
  end(id) {
    if (!this.active || this.touchId !== id) return false;
    this.reset();
    return true;
  },

  reset() {
    this.active = false;
    this.touchId = null;
    this.moving = false;
    this.dx = 0;
    this.dy = 0;
    this.knobX = this.centerX;
    this.knobY = this.centerY;
  },

  draw(ctx) {
    this.layout();

    ctx.save();

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.OUTER_R, 0, Math.PI * 2);
    ctx.fillStyle = this.OUTER_FILL;
    ctx.fill();
    ctx.strokeStyle = this.OUTER_EDGE;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.knobX, this.knobY, this.KNOB_R, 0, Math.PI * 2);
    ctx.fillStyle = this.KNOB_FILL;
    ctx.fill();
    ctx.strokeStyle = this.KNOB_EDGE;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
};