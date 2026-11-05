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
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    m.x += (dx / d) * m.speed * dt;
    m.y += (dy / d) * m.speed * dt;
  },

  // 分离力：把互相重叠的怪物沿连线推开，避免全部堆叠在英雄身上。
  // 用空间网格（48px 格子）把邻居查找限制在相邻 9 格内，按「本格 → 上下左右 → 对角」
  // 由近到远扫描，每只最多扫描 24 个候选、命中 12 个重叠邻居，避免 O(n²)。
  SEPARATION_SPEED: 150,
  CELL_SIZE: 48,
  MAX_NEIGHBORS: 12,
  MAX_SCAN: 24,
  // 邻居格偏移（按距离从近到远：本格 → 上下左右 → 四个对角）。
  NEIGHBOR_OFFSETS: [0, -100000, 100000, -1, 1, -100001, 99999, -99999, 100001],

  separate(monsters) {
    if (monsters.length < 2) return;

    const size = this.CELL_SIZE;
    const grid = new Map();
    for (const m of monsters) {
      const key = Math.floor(m.x / size) * 100000 + Math.floor(m.y / size);
      const cell = grid.get(key);
      if (cell) cell.push(m);
      else grid.set(key, [m]);
    }

    const offsets = this.NEIGHBOR_OFFSETS;
    const maxStep = this.SEPARATION_SPEED * Game.FIXED_DT;

    for (const m of monsters) {
      const base = Math.floor(m.x / size) * 100000 + Math.floor(m.y / size);
      let pushX = 0;
      let pushY = 0;
      let checks = 0;
      let scans = 0;

      for (let i = 0; i < offsets.length; i++) {
        if (checks >= this.MAX_NEIGHBORS || scans >= this.MAX_SCAN) break;

        const cell = grid.get(base + offsets[i]);
        if (!cell) continue;

        for (let k = 0; k < cell.length; k++) {
          if (checks >= this.MAX_NEIGHBORS || scans >= this.MAX_SCAN) break;
          scans++;

          const o = cell[k];
          if (o === m) continue;

          const dx = m.x - o.x;
          const dy = m.y - o.y;
          const minDist = m.radius + o.radius;
          const d2 = dx * dx + dy * dy;
          if (d2 >= minDist * minDist) continue;

          if (d2 > 1e-4) {
            const d = Math.sqrt(d2);
            const overlap = (minDist - d) / minDist;
            pushX += (dx / d) * overlap;
            pushY += (dy / d) * overlap;
          } else {
            // 完全重合时用随机方向拆开
            const a = Math.random() * Math.PI * 2;
            pushX += Math.cos(a);
            pushY += Math.sin(a);
          }

          checks++;
        }
      }

      const len2 = pushX * pushX + pushY * pushY;
      if (len2 <= 1e-6) continue;

      const len = Math.sqrt(len2);
      const step = Math.min(maxStep, len * m.radius);
      m.x += (pushX / len) * step;
      m.y += (pushY / len) * step;
    }
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
      const d = Math.sqrt(dx * dx + dy * dy);

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