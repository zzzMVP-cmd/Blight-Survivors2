'use strict';

// 游戏内 HUD：顶部经验条、左上角血条+等级+波次信息、左下角武器栏、右侧道具栏（暂空）
const HUD = {
  root: null,
  expFill: null,
  hpFill: null,
  hpText: null,
  levelText: null,
  waveText: null,
  weaponBar: null,
  itemBar: null,

  // 构建 HUD 结构
  build() {
    if (this.root) this.root.remove();
    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.innerHTML =
      '<div class="exp-bar"><div class="exp-fill"></div></div>' +
      '<div class="hp-box">' +
        '<div class="hp-bar"><div class="hp-fill"></div></div>' +
        '<div class="hp-text"></div>' +
        '<div class="level-text"></div>' +
        '<div class="wave-text"></div>' +
      '</div>' +
      '<div class="weapon-bar"></div>' +
      '<div class="item-bar"></div>';
    document.body.appendChild(this.root);
    this.expFill = this.root.querySelector('.exp-fill');
    this.hpFill = this.root.querySelector('.hp-fill');
    this.hpText = this.root.querySelector('.hp-text');
    this.levelText = this.root.querySelector('.level-text');
    this.waveText = this.root.querySelector('.wave-text');
    this.weaponBar = this.root.querySelector('.weapon-bar');
    this.itemBar = this.root.querySelector('.item-bar');
  },

  // 按获得顺序设置武器栏
  setWeapons(weapons) {
    if (!this.weaponBar) return;
    this.weaponBar.innerHTML = '';
    (weapons || []).forEach((w) => {
      const slot = document.createElement('div');
      slot.className = 'weapon-slot';
      slot.innerHTML =
        '<img src="' + w.icon + '" alt="' + w.name + '">' +
        '<span>' + w.name + '</span>';
      this.weaponBar.appendChild(slot);
    });
  },

  // 更新血条、等级、经验条
  update(player) {
    const pct = player.maxHp > 0
      ? Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100))
      : 0;
    if (this.hpFill) this.hpFill.style.width = pct + '%';
    if (this.hpText) this.hpText.textContent = Math.ceil(player.hp) + ' / ' + player.maxHp;
    if (this.levelText) this.levelText.textContent = 'lv.' + player.level;

    const expPct = player.expNext > 0
      ? Math.max(0, Math.min(100, (player.exp / player.expNext) * 100))
      : 0;
    if (this.expFill) this.expFill.style.width = expPct + '%';

    if (this.waveText) this.waveText.textContent = Wave.getStatus();
  },

  hide() {
    if (this.root) this.root.classList.add('hidden');
  },

  remove() {
    if (this.root) { this.root.remove(); this.root = null; }
  }
};