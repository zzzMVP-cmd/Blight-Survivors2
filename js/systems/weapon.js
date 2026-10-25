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

  arcs: [],

  SWORD_LENGTH: 40,
  ATTACK_RANGE: 120,
  ATTACK_INTERVAL: 2,
  AIM_DURATION: 0.12,
  SWING_DURATION: 0.18,
  ARC_DURATION: 0.25,
  DAMAGE: 25,
  SWING_ANGLE: Math.PI / 2,

  init(heroData) {
    this.state = 'idle';
    this.angle = 0;
    this.moveAngle = 0;
    this.target = null;
    this.arcs = [];
    this.SWORD_LENGTH = heroData.swordLength || 40;
    this.ATTACK_RANGE = heroData.attackRange || 120;
    this.ATTACK_INTERVAL = heroData.attackInterval || 0.8;
    this.DAMAGE = heroData.weaponDamage || 25;
    this.SWING_ANGLE = heroData.swingAngle || Math.PI / 2;
  },

  update(dt, player, monsters) {
    for (let i = this.arcs.length - 1; i >= 0; i--) {
      this.arcs[i].timer -= dt;
      if (this.arcs[i].timer <= 0) this.arcs.splice(i, 1);
    }

    switch (this.state) {
      case 'idle': this.updateIdle(dt, player, monsters); break;
      case 'aiming': this.updateAiming(dt, player, monsters); break;
      case 'swinging': this.updateSwinging(dt, player, monsters); break;
      case 'cooldown': this.updateCooldown(dt, player); break;
    }
  },

  updateIdle(dt, player, monsters) {
    this.angle = this.moveAngle;

    const target = this.findTarget(player, monsters);
    if (target) {
      this.target = target;
      this.targetAngle = Math.atan2(target.y - player.y, target.x - player.x);
      this.state = 'aiming';
      this.aimTimer = this.AIM_DURATION;
    }
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
      this.swingStartAngle = this.angle - this.SWING_ANGLE / 2;
    }
  },

  updateSwinging(dt, player, monsters) {
    this.swingTimer -= dt;
    const progress = 1 - Math.max(0, this.swingTimer) / this.SWING_DURATION;
    this.angle = this.swingStartAngle + progress * this.SWING_ANGLE;

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
        hitSet: new Set()
      });

      this.state = 'cooldown';
      this.cooldownTimer = Math.max(0, this.ATTACK_INTERVAL - this.AIM_DURATION - this.SWING_DURATION);
    }
  },

  updateCooldown(dt, player) {
    this.cooldownTimer -= dt;
    if (this.cooldownTimer <= 0) {
      this.state = 'idle';
      this.angle = this.moveAngle;
    }
  },

  findTarget(player, monsters) {
    let nearest = null;
    let nearestDist = this.ATTACK_RANGE;
    for (const m of monsters) {
      if (m.hp <= 0) continue;
      const d = Math.hypot(m.x - player.x, m.y - player.y);
      if (d < nearestDist) {
        nearestDist = d;
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

    ctx.fillStyle = '#6b3a1f';
    ctx.fillRect(0, -2.5, 10, 5);

    ctx.fillStyle = '#888';
    ctx.fillRect(8.5, -6, 3, 12);

    ctx.fillStyle = '#d8d8d8';
    ctx.beginPath();
    ctx.moveTo(10, -3.5);
    ctx.lineTo(10 + this.SWORD_LENGTH, 0);
    ctx.lineTo(10, 3.5);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(12, -2.5);
    ctx.lineTo(10 + this.SWORD_LENGTH - 2, 0);
    ctx.lineTo(12, 2.5);
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