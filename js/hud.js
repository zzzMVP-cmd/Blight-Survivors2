'use strict';

// 游戏内 HUD：顶部经验条、左上角血条+等级+波次信息、左下角武器栏、右侧道具栏（暂空）
const HUD = {
  root: null,
  expFill: null,
  hpFill: null,
  hpText: null,
  shieldBar: null,
  shieldFill: null,
  shieldText: null,
  levelText: null,
  waveText: null,
  weaponBar: null,
  itemBar: null,
  weaponSlots: null,
  chargeWeapons: null,
  pauseBtn: null,

  // 上一次写入 DOM 的值，只有变化时才写，避免每帧 7 次 DOM 写入触发重排
  cache: null,

  // 构建 HUD 结构
  build() {
    if (this.root) this.root.remove();
    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.innerHTML =
      '<div class="exp-bar"><div class="exp-fill"></div></div>' +
      '<div class="hp-box">' +
        '<div class="hp-wrap">' +
          '<div class="shield-bar"><div class="shield-fill"></div></div>' +
          '<div class="hp-bar"><div class="hp-fill"></div></div>' +
        '</div>' +
        '<div class="hp-text"></div>' +
        '<div class="shield-text"></div>' +
        '<div class="level-text"></div>' +
        '<div class="wave-text"></div>' +
      '</div>' +
      '<div class="weapon-bar"></div>' +
      '<div class="item-bar"></div>' +
      '<button class="pause-btn" id="pauseBtn" aria-label="暂停">❚❚</button>';
    document.body.appendChild(this.root);
    this.expFill = this.root.querySelector('.exp-fill');
    this.hpFill = this.root.querySelector('.hp-fill');
    this.hpText = this.root.querySelector('.hp-text');
    this.shieldBar = this.root.querySelector('.shield-bar');
    this.shieldFill = this.root.querySelector('.shield-fill');
    this.shieldText = this.root.querySelector('.shield-text');
    this.levelText = this.root.querySelector('.level-text');
    this.waveText = this.root.querySelector('.wave-text');
    this.weaponBar = this.root.querySelector('.weapon-bar');
    this.itemBar = this.root.querySelector('.item-bar');
    this.pauseBtn = this.root.querySelector('#pauseBtn');
    this.pauseBtn.addEventListener('click', () => {
      if (Game.running && !Game.paused && !Upgrade.showing) Game.pause();
    });
    this.cache = {};
  },

  // 摇杆模式下武器栏上移，把左下角让给摇杆
  applyControlMode() {
    if (!this.root) return;
    this.root.classList.toggle('joystick-mode', Game.controlMode === 'joystick');
  },

  // 暂停页会盖住 HUD，暂停按钮跟着隐藏，避免重复触发
  setPauseButton(visible) {
    if (this.pauseBtn) this.pauseBtn.classList.toggle('hidden', !visible);
  },

  // 按「可蓄力优先、其余按获得顺序」设置武器栏
  setWeapons(weapons) {
    if (!this.weaponBar) return;
    this.weaponBar.innerHTML = '';
    this.weaponSlots = [];
    this.chargeWeapons = [];

    const ordered = this.orderedWeapons(weapons);
    this.chargeWeapons = ordered.filter((w) => w.canCharge);

    ordered.forEach((w) => {
      const slot = document.createElement('div');
      slot.className = 'weapon-slot';
      if (w.canCharge) {
        slot.classList.add(w.chargeEnabled === false ? 'charge-off' : 'charge-on');
      }
      let html = '<img src="' + w.icon + '" alt="' + w.name + '">';
      if (w.canCharge) {
        html += '<span class="weapon-key">' + (this.chargeWeapons.indexOf(w) + 1) + '</span>';
      }
      html += '<span class="weapon-name">' + w.name + '</span>';
      slot.innerHTML = html;
      if (w.canCharge) {
        // 点图标 = 切换该武器蓄力开关（触屏与鼠标点都生效，等同快捷键）
        const idx = this.chargeWeapons.indexOf(w);
        slot.classList.add('clickable');
        slot.addEventListener('click', () => Game.toggleWeaponCharge(idx));
      }
      this.weaponSlots.push({ el: slot, weapon: w });
      this.weaponBar.appendChild(slot);
    });
  },

  // 可蓄力武器排在前面，其余按获取顺序（sort 为稳定排序，保持获得顺序）
  orderedWeapons(weapons) {
    return (weapons || []).slice().sort((a, b) => {
      const ca = a.canCharge ? 0 : 1;
      const cb = b.canCharge ? 0 : 1;
      return ca - cb;
    });
  },

  // 只刷新蓄力开关的边框状态，不重建整个武器栏
  updateWeaponCharge() {
    if (!this.weaponSlots) return;
    for (const s of this.weaponSlots) {
      if (!s.weapon.canCharge) continue;
      const on = s.weapon.chargeEnabled !== false;
      s.el.classList.toggle('charge-on', on);
      s.el.classList.toggle('charge-off', !on);
    }
  },

  // 更新血条、等级、经验条（只在数值变化时写入 DOM）
  update(player) {
    if (!this.root || !this.cache) return;
    const c = this.cache;

    const hpPct = player.maxHp > 0
      ? Math.max(0, Math.min(100, Math.round((player.hp / player.maxHp) * 1000) / 10))
      : 0;
    if (hpPct !== c.hpPct) {
      c.hpPct = hpPct;
      if (this.hpFill) this.hpFill.style.width = hpPct + '%';
    }

    const hpText = Math.ceil(player.hp) + ' / ' + player.maxHp;
    if (hpText !== c.hpText) {
      c.hpText = hpText;
      if (this.hpText) this.hpText.textContent = hpText;
    }

    const shieldPct = player.maxShield > 0
      ? Math.max(0, Math.min(100, Math.round((player.shield / player.maxShield) * 1000) / 10))
      : 0;
    if (shieldPct !== c.shieldPct) {
      c.shieldPct = shieldPct;
      if (this.shieldFill) this.shieldFill.style.width = shieldPct + '%';
    }

    const noShield = player.maxShield <= 0;
    if (noShield !== c.noShield) {
      c.noShield = noShield;
      if (this.shieldBar) this.shieldBar.classList.toggle('hidden', noShield);
    }

    const shieldText = player.maxShield > 0
      ? Math.ceil(player.shield) + ' / ' + player.maxShield
      : '';
    if (shieldText !== c.shieldText) {
      c.shieldText = shieldText;
      if (this.shieldText) this.shieldText.textContent = shieldText;
    }

    const levelText = 'lv.' + player.level;
    if (levelText !== c.levelText) {
      c.levelText = levelText;
      if (this.levelText) this.levelText.textContent = levelText;
    }

    const expPct = player.expNext > 0
      ? Math.max(0, Math.min(100, Math.round((player.exp / player.expNext) * 1000) / 10))
      : 0;
    if (expPct !== c.expPct) {
      c.expPct = expPct;
      if (this.expFill) this.expFill.style.width = expPct + '%';
    }

    const waveText = Wave.getStatus();
    if (waveText !== c.waveText) {
      c.waveText = waveText;
      if (this.waveText) this.waveText.textContent = waveText;
    }
  },

  hide() {
    if (this.root) this.root.classList.add('hidden');
  },

  remove() {
    if (this.root) { this.root.remove(); this.root = null; }
  }
};