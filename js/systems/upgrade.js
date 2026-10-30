'use strict';

// 升级强化系统：英雄升级时弹出卡牌选择页面
const Upgrade = {
  overlay: null,
  refreshBtn: null,
  cardContainer: null,

  refreshCount: 1,
  cardCount: 5,

  radiantComp: 0,

  TIER_NAMES: ['铜', '银', '金', '炫彩'],
  TIER_COLORS: ['#cd7f32', '#c0c0c0', '#ffd700', '#ff69b4'],
  TIER_PROBS: [0.42, 0.32, 0.22, 0.04],

  HP_MULTS: [1.2, 1.4, 1.8, 2.6],
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
    this.refreshCount = 1;
    this.cardCount = 5;
    this.radiantComp = 0;
  },

  show(player) {
    this.overlay.classList.remove('hidden');
    this.updateRefreshBtn();
    this.generateCards(player);
    Game.pauseForUpgrade();
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

  randomCard(player) {
    const types = ['character', 'augment'];
    const weights = [1, 1];

    const hasWeaponUpgrades = false;
    const hasNewWeapons = false;

    if (hasWeaponUpgrades) { types.push('weaponUp'); weights.push(1); }
    if (hasNewWeapons) { types.push('newWeapon'); weights.push(1); }

    const totalW = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalW;
    let type = types[0];
    for (let i = 0; i < types.length; i++) {
      r -= weights[i];
      if (r <= 0) { type = types[i]; break; }
    }

    switch (type) {
      case 'character': return this.randomCharacterCard(player);
      case 'augment': return this.randomAugmentCard(player);
      case 'weaponUp': return { cardType: 'weaponUp', name: player.weapons.map(w => w.name).join('/') + ' 武器强化', desc: '（暂无可用）', tier: -1, apply() {} };
      case 'newWeapon': return { cardType: 'newWeapon', name: '新武器', desc: '（暂无可用）', tier: -1, apply() {} };
    }
  },

  randomCharacterCard(player) {
    const options = [];

    options.push({ subType: 'hp', name: '血量强化', weight: 1 });
    if (player.speed < this.SPD_CAP) {
      options.push({ subType: 'speed', name: '移速强化', weight: 1 });
    }
    options.push({ subType: 'recovery', name: '恢复强化', weight: 1 });
    options.push({ subType: 'crit', name: '暴击增强', weight: 1 });
    options.push({ subType: 'refresh', name: '刷新次数', weight: 1 });
    options.push({ subType: 'cardCount', name: '卡牌数量', weight: 1 });
    if (ExpOrbs.ATTRACT_RANGE < this.ABSORB_CAP) {
      options.push({ subType: 'absorb', name: '吸收范围', weight: 1 });
    }

    const totalW = options.reduce((a, o) => a + o.weight, 0);
    let r = Math.random() * totalW;
    let chosen = options[0];
    for (const o of options) {
      r -= o.weight;
      if (r <= 0) { chosen = o; break; }
    }

    const tier = this.rollTier();

    switch (chosen.subType) {
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
          desc: '刷新机会 +1',
          apply() {
            Upgrade.refreshCount += 1;
          }
        };

      case 'cardCount':
        return {
          cardType: 'character',
          name: '卡牌数量',
          tier: -1,
          desc: '卡牌数 +2',
          apply() {
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

  randomAugmentCard(player) {
    const isGlobal = Math.random() < 0.5;
    const isSpeed = Math.random() < 0.5;
    const tier = this.rollTier();

    const mults = isGlobal ? this.GLOBAL_AUG_MULTS : this.WEAPON_AUG_MULTS;
    const scope = isGlobal ? '全体' : '武器';
    const attr = isSpeed ? '速度' : '力量';

    return {
      cardType: 'augment',
      name: scope + attr + '增幅',
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

    if (card.tier >= 0) {
      el.style.borderColor = tierColor;
    }

    if (card.tier === 3) {
      el.classList.add('card-radiant');
    }

    el.innerHTML =
      '<div class="card-name" style="color:' + tierColor + '">' + card.name + '</div>' +
      (tierName ? '<div class="card-tier" style="color:' + tierColor + '">' + tierName + '</div>' : '') +
      '<div class="card-desc">' + card.desc.replace(/\n/g, '<br>') + '</div>';

    el.addEventListener('click', () => {
      card.apply();
      this.hide();
      Game.resumeFromUpgrade();
    });

    return el;
  }
};