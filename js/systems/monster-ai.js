'use strict';

// 怪物行为：生成、移动、批量攻击（同帧伤害累加 → 统一结算护盾/血量 → 进无敌帧）
const MonsterAI = {
  spawn(typeKey, player, hp, damage, wave) {
    const t = Monsters.TYPES[typeKey];
    const dist = 360;
    const ang = Math.random() * Math.PI * 2;
    const radius = Monsters.calcRadius(wave, typeKey);
    const shield = Monsters.calcShield(wave);

    return {
      key: typeKey,
      name: t.name,
      x: player.x + Math.cos(ang) * dist,
      y: player.y + Math.sin(ang) * dist,
      radius: radius,
      hp: hp,
      maxHp: hp,
      shield: shield,
      maxShield: shield,
      speed: t.speed,
      damage: damage,
      color: t.color,
      eyeColor: t.eyeColor,
      kbVx: 0,
      kbVy: 0,
      kbTimer: 0
    };
  },

  move(m, dt) {
    if (m.kbTimer > 0) {
      m.kbTimer -= dt;
      m.x += m.kbVx * dt;
      m.y += m.kbVy * dt;
      return;
    }

    const px = Game.player.x;
    const py = Game.player.y;
    const dx = px - m.x;
    const dy = py - m.y;
    const d = Math.hypot(dx, dy) || 1;
    m.x += (dx / d) * m.speed * dt;
    m.y += (dy / d) * m.speed * dt;
  },

  // 同一帧内批量处理所有怪物的攻击：
  // 先收集所有碰撞伤害，再统一结算（护盾优先扣）并进无敌帧，
  // 避免一个怪物先触发无敌帧导致同帧其他怪物伤害被吞。
  // 怪物本身没有攻击间隔，节奏完全由玩家无敌帧控制。
  processAttacks(monsters, dt) {
    if (Game.player.invTime > 0) return;

    let totalDamage = 0;
    const hitList = [];

    for (const m of monsters) {
      const px = Game.player.x;
      const py = Game.player.y;
      const dx = m.x - px;
      const dy = m.y - py;
      const d = Math.hypot(dx, dy);

      if (d < m.radius + Game.player.r) {
        totalDamage += m.damage;
        hitList.push({ m, dx, dy, d });
      }
    }

    if (totalDamage > 0) {
      Shield.applyDamage(Game.player, totalDamage);
      Game.onHit();

      for (const h of hitList) {
        const kb = h.m.speed * 0.1;
        const nd = h.d || 1;
        h.m.x += (h.dx / nd) * kb;
        h.m.y += (h.dy / nd) * kb;
      }
    }
  }
};