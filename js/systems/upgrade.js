'use strict';

// 升级强化系统：英雄升级时弹出卡牌选择页面
const Upgrade = {
  overlay: null,
  refreshBtn: null,
  cardContainer: null,

  BASE_REFRESH: 1,
  BASE_CARDS: 5,

  refreshBonus: 0,
  cardBonus: 0,

  refreshCount: 1,
  cardCount: 5,

  // 连升多级时排队，一次升级一次选卡
  pending: 0,
  showing: false,

  radiantComp: 0,

  TIER_NAMES: ['铜', '银', '金', '炫彩'],
  TIER_COLORS: ['#cd7f32', '#c0c0c0', '#ffd700', '#ff69b4'],
  TIER_PROBS: [0.42, 0.32, 0.22, 0.04],

  // 质变卡（小质变 / 大质变）的名称颜色与发光色
  MUTATION_COLOR: '#ffd600',

  HP_MULTS: [1.3, 1.6, 2.2, 3.4],
  SHIELD_MULTS: [1.3, 1.6, 2.2, 3.4],
  SPD_MULTS: [1.1, 1.2, 1.4, 1.8],
  SPD_CAP: 400,

  WEAPON_AUG_MULTS: [1.15, 1.30, 1.60, 2.20],
  GLOBAL_AUG_MULTS: [1.08, 1.16, 1.32, 1.64],

  ABSORB_CAP: 300,
  ABSORB_PER_PICK: 30,

  INTERVAL_CAP: 0.2,

  init() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'overlay upgrade-overlay hidden';

    const title = document.createElement('div');
    title.className = 'upgrade-title';
    title.textContent = '选择强化';
    this.overlay.appendChild(title);

    const refreshRow = document.createElement('div');
    refreshRow.className = 'refresh-row';
    this.refreshBtn = document.createElement('button');
    this.refreshBtn.className = 'btn btn-refresh';
    this.refreshBtn.textContent = '刷新 (1)';
    this.refreshBtn.addEventListener('click', () => this.refresh());
    refreshRow.appendChild(this.refreshBtn);
    this.overlay.appendChild(refreshRow);

    this.cardContainer = document.createElement('div');
    this.cardContainer.className = 'card-container';
    this.overlay.appendChild(this.cardContainer);

    document.body.appendChild(this.overlay);
  },

  resetRun() {
    this.refreshBonus = 0;
    this.cardBonus = 0;
    this.refreshCount = this.BASE_REFRESH;
    this.cardCount = this.BASE_CARDS;
    this.radiantComp = 0;
    this.pending = 0;
    this.showing = false;
  },

  // 每次升级调用一次：入队，未在选卡时才立即弹出
  queue(player) {
    this.pending += 1;
    if (!this.showing) this.show(player);
  },

  show(player) {
    this.showing = true;
    this.refreshCount = this.BASE_REFRESH + this.refreshBonus;
    this.cardCount = this.BASE_CARDS + this.cardBonus;
    this.overlay.classList.remove('hidden');
    this.updateRefreshBtn();
    this.generateCards(player);
    Game.pauseForUpgrade();
  },

  // 选完一张卡：还有排队的升级就继续弹，否则关闭并恢复游戏
  finishPick(player) {
    this.pending -= 1;
    if (this.pending > 0) {
      this.show(player);
      return;
    }
    this.showing = false;
    this.hide();
    Game.resumeFromUpgrade();
  },

  hide() {
    this.overlay.classList.add('hidden');
  },

  updateRefreshBtn() {
    this.refreshBtn.textContent = '刷新 (' + this.refreshCount + ')';
    this.refreshBtn.disabled = this.refreshCount <= 0;
  },

  refresh() {
    if (this.refreshCount <= 0) return;
    this.refreshCount--;
    this.updateRefreshBtn();
    const player = Game.player;
    this.generateCards(player);
  },

  generateCards(player) {
    this.cardContainer.innerHTML = '';

    const cards = [];
    for (let i = 0; i < this.cardCount; i++) {
      cards.push(this.randomCard(player));
    }

    cards.forEach((card) => {
      const el = this.createCardElement(card, player);
      this.cardContainer.appendChild(el);
    });
  },

  // 武器强化方向。每个方向可强化 4 次，第 4 次是「小质变」：卡片发黄光；若有 mutDesc/mutApply
  // 则数值比前几次更大（如崩山击退 +80、淬刃伤害 +2），缺省则与普通效果相同。
  // 4 次用完后该方向不再出现在卡池；所有方向都用完后，大质变进入卡池且可无限次获取。
  WEAPON_UPG: {
    warrior: [
      {
        key: 'range',
        name: '长锋',
        desc: '挥剑半径 +12',
        apply(player) { Weapon.ATTACK_RANGE += 12; }
      },
      {
        key: 'angle',
        name: '阔斩',
        desc: '挥剑角度 +15°',
        apply(player) { Weapon.SWING_ANGLE += 15 * Math.PI / 180; }
      },
      {
        key: 'knockback',
        name: '崩山',
        desc: '击退速度 +50',
        mutDesc: '击退速度 +80',
        apply(player) { player.knockbackSpeed += 50; },
        mutApply(player) { player.knockbackSpeed += 80; }
      },
      {
        key: 'sharp',
        name: '淬刃',
        desc: '锐器伤基础伤害 +1',
        mutDesc: '锐器伤基础伤害 +2',
        apply(player) { Weapon.DAMAGE += 1; },
        mutApply(player) { Weapon.DAMAGE += 2; }
      }
    ]
  },

  UPG_MAX: 4,
  BLUNT_PER_MUTATION: 2,

  // 卡池按「方向」平摊概率：角色方向、增幅方向、武器强化方向各算一项，每项权重相同。
  // 先按方向抽，再按方向决定卡面，不再有「卡牌类型」这一层概率。
  randomCard(player) {
    const dirs = this.availableDirections(player);
    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    const tier = dir.tiered ? this.rollTier() : -1;

    if (dir.kind === 'weapon') return this.weaponUpCard(player, dir.dir);
    if (dir.kind === 'bluntMutation') return this.bluntMutationCard(player);
    if (dir.kind === 'globalPower' || dir.kind === 'globalSpeed') {
      return this.randomAugmentCard(player, true, dir.kind === 'globalSpeed', tier);
    }
    if (dir.kind === 'weaponPower' || dir.kind === 'weaponSpeed') {
      return this.randomAugmentCard(player, false, dir.kind === 'weaponSpeed', tier);
    }
    return this.randomCharacterCard(player, dir.kind, tier);
  },

  // 当前可出现的全部方向。已满的武器强化方向、已到上限的属性方向都会从池中移除
  availableDirections(player) {
    const dirs = [];

    dirs.push({ kind: 'hp', tiered: true });
    if (Shield.calcBase(player.level) > 0) dirs.push({ kind: 'shield', tiered: true });
    if (player.speed < this.SPD_CAP) dirs.push({ kind: 'speed', tiered: true });
    dirs.push({ kind: 'recovery' });
    dirs.push({ kind: 'crit' });
    dirs.push({ kind: 'refresh' });
    dirs.push({ kind: 'cardCount' });
    if (ExpOrbs.ATTRACT_RANGE < this.ABSORB_CAP) dirs.push({ kind: 'absorb' });

    dirs.push({ kind: 'globalPower', tiered: true });
    dirs.push({ kind: 'globalSpeed', tiered: true });
    dirs.push({ kind: 'weaponPower', tiered: true });
    dirs.push({ kind: 'weaponSpeed', tiered: true });

    const weaponDirs = this.WEAPON_UPG[player.key] || [];
    let allMaxed = weaponDirs.length > 0;
    for (const d of weaponDirs) {
      if (this.upgCount(player, d.key) < this.UPG_MAX) {
        dirs.push({ kind: 'weapon', dir: d });
        allMaxed = false;
      }
    }
    if (allMaxed) dirs.push({ kind: 'bluntMutation' });

    return dirs;
  },

  upgCount(player, key) {
    return player.weaponUpg[key] || 0;
  },

  weaponUpCard(player, dir) {
    const hero = HEROES[player.key];
    const next = this.upgCount(player, dir.key) + 1;
    const isMut = next >= this.UPG_MAX;

    return {
      cardType: 'weaponUp',
      name: hero.weapon + '·' + dir.name,
      tier: -1,
      glow: isMut,
      desc: (isMut && dir.mutDesc ? dir.mutDesc : dir.desc) + '\n第 ' + next + '/' + this.UPG_MAX + ' 次',
      apply() {
        (isMut && dir.mutApply ? dir.mutApply : dir.apply)(player);
        player.weaponUpg[dir.key] = next;
      }
    };
  },

  bluntMutationCard(player) {
    const hero = HEROES[player.key];
    return {
      cardType: 'weaponUp',
      name: hero.weapon + '·大质变',
      tier: -1,
      glow: true,
      desc: '钝器伤 +2\n当前钝器伤 ' + (player.bluntDamage + this.BLUNT_PER_MUTATION) +
        '\n对带护盾怪物：伤害 × min(y+1,盾)/盾',
      apply() {
        player.bluntDamage += Upgrade.BLUNT_PER_MUTATION;
      }
    };
  },

  randomCharacterCard(player, subType, tier) {
    switch (subType) {
      case 'hp':
        return {
          cardType: 'character',
          name: '血量强化',
          tier: tier,
          desc: this.TIER_NAMES[tier] + '级：最大血量 ×' + this.HP_MULTS[tier],
          apply() {
            player.maxHp = Math.round(player.maxHp * Upgrade.HP_MULTS[tier]);
            player.hp = Math.min(player.hp + Math.round(player.maxHp * (Upgrade.HP_MULTS[tier] - 1)), player.maxHp);
          }
        };

      case 'shield':
        return {
          cardType: 'character',
          name: '护盾强化',
          tier: tier,
          desc: this.TIER_NAMES[tier] + '级：护盾 ×' + this.SHIELD_MULTS[tier] + '\n当前最大护盾 ' + player.maxShield,
          apply() {
            Shield.grow(player, Upgrade.SHIELD_MULTS[tier]);
          }
        };

      case 'speed':
        return {
          cardType: 'character',
          name: '移速强化',
          tier: tier,
          desc: this.TIER_NAMES[tier] + '级：移速 ×' + this.SPD_MULTS[tier] + '（上限' + Upgrade.SPD_CAP + '）',
          apply() {
            player.speed = Math.min(Upgrade.SPD_CAP, Math.round(player.speed * Upgrade.SPD_MULTS[tier]));
          }
        };

      case 'recovery':
        return {
          cardType: 'character',
          name: '恢复强化',
          tier: -1,
          desc: '恢复等级 +1\n每秒回复 ' + (player.recoveryLv + 1) + ' × 英雄等级',
          apply() {
            player.recoveryLv += 1;
          }
        };

      case 'crit':
        return {
          cardType: 'character',
          name: '暴击增强',
          tier: -1,
          desc: '暴击率 +10%\n暴击伤害 = log₂(lv) × 攻击伤害',
          apply() {
            player.critRate = Math.min(1, player.critRate + 0.1);
          }
        };

      case 'refresh':
        return {
          cardType: 'character',
          name: '刷新次数',
          tier: -1,
          desc: '刷新次数永久 +1\n每次升级可刷新 ' + (Upgrade.BASE_REFRESH + Upgrade.refreshBonus + 1) + ' 次',
          apply() {
            Upgrade.refreshBonus += 1;
            Upgrade.refreshCount += 1;
          }
        };

      case 'cardCount':
        return {
          cardType: 'character',
          name: '卡牌数量',
          tier: -1,
          desc: '卡牌数量永久 +2\n每次升级可选 ' + (Upgrade.BASE_CARDS + Upgrade.cardBonus + 2) + ' 张',
          apply() {
            Upgrade.cardBonus += 2;
            Upgrade.cardCount += 2;
          }
        };

      case 'absorb':
        return {
          cardType: 'character',
          name: '吸收范围',
          tier: -1,
          desc: '经验吸收范围 +30（上限' + Upgrade.ABSORB_CAP + '）',
          apply() {
            ExpOrbs.ATTRACT_RANGE = Math.min(Upgrade.ABSORB_CAP, ExpOrbs.ATTRACT_RANGE + Upgrade.ABSORB_PER_PICK);
          }
        };
    }
  },

  randomAugmentCard(player, isGlobal, isSpeed, tier) {
    const hero = HEROES[player.key];
    const mults = isGlobal ? this.GLOBAL_AUG_MULTS : this.WEAPON_AUG_MULTS;
    const scope = isGlobal ? '全体' : '武器';
    const attr = isSpeed ? '速度' : '力量';

    let name;
    if (isGlobal) {
      name = scope + attr + '增幅';
    } else {
      const augNames = hero.weaponAugNames || { speed: '迅捷', power: '强袭' };
      name = hero.weapon + '·' + (isSpeed ? augNames.speed : augNames.power);
    }

    return {
      cardType: 'augment',
      name: name,
      tier: tier,
      desc: this.TIER_NAMES[tier] + '级：' + scope + attr + ' ×' + mults[tier],
      apply() {
        if (isGlobal) {
          if (isSpeed) player.globalSpeedAug *= mults[tier];
          else player.globalPowerAug *= mults[tier];
        } else {
          if (isSpeed) player.weaponSpeedAug *= mults[tier];
          else player.weaponPowerAug *= mults[tier];
        }
        Upgrade.recalcDisplayAug(player);
      }
    };
  },

  recalcDisplayAug(player) {
    player.displaySpeedAug = player.weaponSpeedAug * player.globalSpeedAug;
    player.displayPowerAug = player.weaponPowerAug * player.globalPowerAug;

    const baseInterval = Game.hero.attackInterval;
    const effectiveInterval = baseInterval / player.displaySpeedAug;

    if (effectiveInterval < Upgrade.INTERVAL_CAP) {
      const speedCapAug = baseInterval / Upgrade.INTERVAL_CAP;
      const overflow = player.displaySpeedAug - speedCapAug;
      player.overflowDmgMult = 1 + overflow / speedCapAug;
      player.effectiveInterval = Upgrade.INTERVAL_CAP;
    } else {
      player.overflowDmgMult = 1;
      player.effectiveInterval = effectiveInterval;
    }

    Weapon.ATTACK_INTERVAL = player.effectiveInterval;
  },

  rollTier() {
    const radiantProb = this.TIER_PROBS[3] + this.radiantComp;
    const probs = [this.TIER_PROBS[0], this.TIER_PROBS[1], this.TIER_PROBS[2], radiantProb];

    let r = Math.random();
    let cum = 0;
    for (let i = 0; i < probs.length; i++) {
      cum += probs[i];
      if (r <= cum) {
        if (i === 3) {
          this.radiantComp = 0;
        } else {
          this.radiantComp += this.TIER_PROBS[3];
          if (this.radiantComp > 1 - this.TIER_PROBS[3]) this.radiantComp = 1 - this.TIER_PROBS[3];
        }
        return i;
      }
    }
    this.radiantComp += this.TIER_PROBS[3];
    return 0;
  },

  createCardElement(card, player) {
    const el = document.createElement('div');
    el.className = 'upgrade-card card-' + card.cardType;

    const tierColor = card.tier >= 0 ? this.TIER_COLORS[card.tier] : '#888';
    const tierName = card.tier >= 0 ? this.TIER_NAMES[card.tier] : '';
    const nameColor = card.glow ? this.MUTATION_COLOR : tierColor;

    if (card.tier >= 0) {
      el.style.borderColor = tierColor;
    }

    if (card.tier === 3) {
      el.classList.add('card-radiant');
    }

    // 质变卡（小质变与大质变）发黄光
    if (card.glow) {
      el.classList.add('card-mutation');
    }

    el.innerHTML =
      '<div class="card-name" style="color:' + nameColor + '">' + card.name + '</div>' +
      (tierName ? '<div class="card-tier" style="color:' + tierColor + '">' + tierName + '</div>' : '') +
      '<div class="card-desc">' + card.desc.replace(/\n/g, '<br>') + '</div>';

    el.addEventListener('click', () => {
      card.apply();
      this.finishPick(player);
    });

    return el;
  }
};