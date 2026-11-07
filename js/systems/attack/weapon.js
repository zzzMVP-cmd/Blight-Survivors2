'use strict';

// 武器系统：剑的状态机（idle → aiming → swinging → cooldown）+ 剑气扇形效果
const Weapon = {
  state: 'idle',
  angle: 0,
  moveAngle: 0,
  target: null,
  targetAngle: 0,
  targetX: 0,
  targetY: 0,

  aimTimer: 0,
  swingTimer: 0,
  swingStartAngle: 0,
  cooldownTimer: 0,

  // 连续攻击：挥砍方向左右交替，连续攻击数决定一个循环内挥砍几次
  SWING_COUNT: 4,
  swingDir: -1,

  // 蓄力松手后补的那一刀携带的攻击次数（0 = 挥空，不造成伤害）
  chargedAttack: false,
  chargeCount: 0,

  arcs: [],

  SWORD_LENGTH: 40,
  ATTACK_RANGE: 120,
  ATTACK_INTERVAL: 2,
  AIM_DURATION: 0.12,
  SWING_DURATION: 0.18,
  ARC_DURATION: 0.25,
  DAMAGE: 25,
  SWING_ANGLE: Math.PI / 2,
  TURN_SPEED: 2.5,

  init(heroData) {
    this.state = 'idle';
    this.angle = 0;
    this.moveAngle = 0;
    this.target = null;
    this.targetX = 0;
    this.targetY = 0;
    this.arcs = [];
    this.swingDir = -1;
    this.chargedAttack = false;
    this.chargeCount = 0;
    this.SWORD_LENGTH = heroData.swordLength || 40;
    this.ATTACK_RANGE = heroData.attackRange || 120;
    this.ATTACK_INTERVAL = heroData.attackInterval || 0.8;
    this.DAMAGE = heroData.weaponDamage || 25;
    this.SWING_ANGLE = heroData.swingAngle || Math.PI / 2;
  },

  // 距离下一次攻击完成还需要的时间（用于蓄力条第 1 个长方形的到达时间）
  remainingInterval() {
    switch (this.state) {
      case 'aiming': return Math.max(0, this.aimTimer) + this.SWING_DURATION;
      case 'swinging': return Math.max(0, this.swingTimer);
      case 'cooldown': return Math.max(0, this.cooldownTimer) + this.AIM_DURATION + this.SWING_DURATION;
      default: return 0;
    }
  },

  // 蓄力松开：立即进入瞄准，下一刀按 count 次攻击合并结算
  // 返回 false 表示攻击范围内没有可攻击目标，攻击判定不会生效，本次不挥砍
  startChargedAttack(player, monsters, count) {
    const target = this.findTarget(player, monsters, true);
    if (!target) return false;

    this.chargedAttack = true;
    this.chargeCount = count;
    this.target = target;
    this.targetAngle = Math.atan2(target.y - player.y, target.x - player.x);
    this.targetX = target.x;
    this.targetY = target.y;

    this.state = 'aiming';
    this.aimTimer = this.AIM_DURATION;
    return true;
  },

  // 蓄力结束但没有打出攻击（蓄力值作废）：攻击间隔视为 0，武器立即回到待机可再攻击
  readyNow() {
    this.chargedAttack = false;
    this.chargeCount = 0;
    this.target = null;
    this.state = 'idle';
    this.aimTimer = 0;
    this.swingTimer = 0;
    this.cooldownTimer = 0;
  },

  update(dt, player, monsters) {
    for (let i = this.arcs.length - 1; i >= 0; i--) {
      this.arcs[i].timer -= dt;
      if (this.arcs[i].timer <= 0) this.arcs.splice(i, 1);
    }

    // 蓄力期间冻结攻击状态机：不挥砍、不推进攻击间隔
    if (Charge.holding) return;

    switch (this.state) {
      case 'idle': this.updateIdle(dt, player, monsters); break;
      case 'aiming': this.updateAiming(dt, player, monsters); break;
      case 'swinging': this.updateSwinging(dt, player, monsters); break;
      case 'cooldown': this.updateCooldown(dt, player, monsters); break;
    }
  },

  updateIdle(dt, player, monsters) {
    const target = this.findTarget(player, monsters);
    if (target) {
      this.target = target;
      this.targetAngle = Math.atan2(target.y - player.y, target.x - player.x);
      this.state = 'aiming';
      this.aimTimer = this.AIM_DURATION;
      return;
    }

    // 不在攻击间隔内时不做缓慢转向，直接对准移动方向
    this.angle = this.moveAngle;
  },

  turnToward(targetAngle, dt) {
    const diff = this.angleDiff(this.angle, targetAngle);
    const maxStep = this.TURN_SPEED * dt;
    if (Math.abs(diff) <= maxStep) this.angle = targetAngle;
    else this.angle += Math.sign(diff) * maxStep;
  },

  updateAiming(dt, player, monsters) {
    this.aimTimer -= dt;
    const progress = 1 - Math.max(0, this.aimTimer) / this.AIM_DURATION;

    if (this.target && this.target.hp > 0) {
      this.targetAngle = Math.atan2(this.target.y - player.y, this.target.x - player.x);
    }

    const diff = this.angleDiff(this.angle, this.targetAngle);
    this.angle += diff * Math.min(1, progress * 3);

    if (this.aimTimer <= 0) {
      this.angle = this.targetAngle;
      this.state = 'swinging';
      this.swingTimer = this.SWING_DURATION;
      this.swingStartAngle = this.angle - this.swingDir * (this.SWING_ANGLE / 2);
    }
  },

  updateSwinging(dt, player, monsters) {
    this.swingTimer -= dt;
    const progress = 1 - Math.max(0, this.swingTimer) / this.SWING_DURATION;
    this.angle = this.swingStartAngle + this.swingDir * progress * this.SWING_ANGLE;

    if (this.target && this.target.hp > 0) {
      this.targetX = this.target.x;
      this.targetY = this.target.y;
    }

    if (this.swingTimer <= 0) {
      const tx = this.targetX || player.x + Math.cos(this.targetAngle) * 60;
      const ty = this.targetY || player.y + Math.sin(this.targetAngle) * 60;
      const facingAngle = Math.atan2(ty - player.y, tx - player.x);

      this.arcs.push({
        playerX: player.x,
        playerY: player.y,
        facingAngle: facingAngle,
        swingAngle: this.SWING_ANGLE,
        radius: this.ATTACK_RANGE,
        timer: this.ARC_DURATION,
        maxTimer: this.ARC_DURATION,
        hitSet: new Set(),
        charged: this.chargedAttack,
        chargeCount: this.chargeCount
      });

      // 连续攻击：下一刀反向挥出，形成 右→左 / 左→右 的交替循环
      this.swingDir = -this.swingDir;
      this.chargedAttack = false;
      this.chargeCount = 0;

      this.state = 'cooldown';
      this.cooldownTimer = Math.max(0, this.ATTACK_INTERVAL - this.AIM_DURATION - this.SWING_DURATION);
    }
  },

  updateCooldown(dt, player, monsters) {
    this.cooldownTimer -= dt;

    this.turnToward(this.moveAngle, dt);

    if (this.cooldownTimer <= 0) {
      const target = this.findTarget(player, monsters);
      if (target) {
        this.target = target;
        this.targetAngle = Math.atan2(target.y - player.y, target.x - player.x);
        this.state = 'aiming';
        this.aimTimer = this.AIM_DURATION;
      } else {
        this.state = 'idle';
      }
    }
  },

  // 找最近的存活怪物。withRadius 为 true 时把怪物半径计入攻击距离，
  // 与 Attack.processWarrior 的扇形判定（reach = 攻击范围 + 怪物半径）保持一致
  findTarget(player, monsters, withRadius) {
    let nearest = null;
    let nearestDist2 = Infinity;
    const px = player.x;
    const py = player.y;
    for (const m of monsters) {
      if (m.hp <= 0) continue;
      const reach = this.ATTACK_RANGE + (withRadius ? m.radius : 0);
      const dx = m.x - px;
      const dy = m.y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < reach * reach && d2 < nearestDist2) {
        nearestDist2 = d2;
        nearest = m;
      }
    }
    return nearest;
  },

  setMoveAngle(dx, dy) {
    if (dx !== 0 || dy !== 0) {
      this.moveAngle = Math.atan2(dy, dx);
    }
  },

  normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  },

  angleDiff(from, to) {
    return this.normalizeAngle(to - from);
  },

  draw(ctx, player) {
    this.drawSword(ctx, player);
    this.drawArcs(ctx);
  },

  drawSword(ctx, player) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(this.angle);
    ctx.translate(0, player.r);

    // 蓄力满：武器整体泛金光
    if (Charge.isFull()) {
      ctx.shadowColor = '#ffd76e';
      ctx.shadowBlur = 16;
    }

    ctx.fillStyle = '#6b3a1f';
    ctx.fillRect(0, -2.5, 10, 5);

    ctx.fillStyle = '#888';
    ctx.fillRect(8.5, -6, 3, 12);

    const bladeLen = this.SWORD_LENGTH * 0.75;
    const tipLen = this.SWORD_LENGTH * 0.25;
    const bladeW = 3.5;

    ctx.fillStyle = Charge.isFull() ? '#ffe9a8' : '#d8d8d8';
    ctx.fillRect(10, -bladeW, bladeLen, bladeW * 2);

    ctx.beginPath();
    ctx.moveTo(10 + bladeLen, -bladeW);
    ctx.lineTo(10 + bladeLen + tipLen, 0);
    ctx.lineTo(10 + bladeLen, bladeW);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, -bladeW, bladeLen, bladeW * 2);

    ctx.beginPath();
    ctx.moveTo(10 + bladeLen, -bladeW);
    ctx.lineTo(10 + bladeLen + tipLen, 0);
    ctx.lineTo(10 + bladeLen, bladeW);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  },

  drawArcs(ctx) {
    for (const arc of this.arcs) {
      const alpha = (arc.timer / arc.maxTimer) * 0.7;
      const halfSwing = arc.swingAngle / 2;

      ctx.save();

      ctx.fillStyle = 'rgba(100,220,255,' + alpha * 0.25 + ')';
      ctx.beginPath();
      ctx.moveTo(arc.playerX, arc.playerY);
      ctx.arc(arc.playerX, arc.playerY, arc.radius, arc.facingAngle - halfSwing, arc.facingAngle + halfSwing);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(100,220,255,' + alpha + ')';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(arc.playerX, arc.playerY, arc.radius, arc.facingAngle - halfSwing, arc.facingAngle + halfSwing);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(200,245,255,' + alpha * 0.6 + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(arc.playerX, arc.playerY, arc.radius * 0.7, arc.facingAngle - halfSwing * 0.85, arc.facingAngle + halfSwing * 0.85);
      ctx.stroke();

      ctx.restore();
    }
  }
};