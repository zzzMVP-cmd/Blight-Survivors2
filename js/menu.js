'use strict';

// 开始页：顶部一排英雄选择卡片 + 底部"开始游戏"按钮
// 暂停页：继续游戏 / 主动撤离
const Menu = {
  selectedKey: null,
  overlay: null,
  startBtn: null,
  heroCards: [],

  pauseOverlay: null,

  init() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'overlay';
    this.overlay.innerHTML =
      '<h1>Blight Survivors 2</h1>' +
      '<div class="subtitle">选择英雄，在无尽荒芜中生存</div>' +
      '<div class="hero-list" id="heroList"></div>' +
      '<button class="btn start" id="startBtn" disabled>开 始 游 戏</button>';
    document.body.appendChild(this.overlay);

    this.startBtn = this.overlay.querySelector('#startBtn');
    this.startBtn.addEventListener('click', () => {
      if (this.selectedKey) Game.start(this.selectedKey);
    });

    this.buildHeroCards();
    this.buildPauseOverlay();
  },

  buildHeroCards() {
    const list = this.overlay.querySelector('#heroList');
    list.innerHTML = '';
    this.heroCards = [];

    HERO_ORDER.forEach((key) => {
      const h = HEROES[key];
      const card = document.createElement('div');
      card.className = 'hero-card';
      card.dataset.key = key;
      card.innerHTML =
        '<div class="hero-name">' + h.name + '</div>' +
        '<div class="hero-desc">' + h.desc + '</div>' +
        '<div class="hero-weapon"><img src="' + h.weaponIcon + '" alt="武器">' + h.weapon + '</div>';
      card.addEventListener('click', () => this.selectHero(key));
      list.appendChild(card);
      this.heroCards.push(card);
    });
  },

  selectHero(key) {
    this.selectedKey = key;
    this.heroCards.forEach((c) => c.classList.toggle('selected', c.dataset.key === key));
    this.startBtn.disabled = false;
  },

  buildPauseOverlay() {
    this.pauseOverlay = document.createElement('div');
    this.pauseOverlay.className = 'overlay pause-overlay hidden';

    const title = document.createElement('div');
    title.className = 'pause-title';
    title.textContent = '游戏暂停';
    this.pauseOverlay.appendChild(title);

    const resumeBtn = document.createElement('button');
    resumeBtn.className = 'btn';
    resumeBtn.textContent = '继续游戏';
    resumeBtn.addEventListener('click', () => Game.resume());
    this.pauseOverlay.appendChild(resumeBtn);

    const retreatBtn = document.createElement('button');
    retreatBtn.className = 'btn retreat';
    retreatBtn.textContent = '主动撤离';
    retreatBtn.addEventListener('click', () => Game.retreat());
    this.pauseOverlay.appendChild(retreatBtn);

    document.body.appendChild(this.pauseOverlay);
  },

  hide() {
    if (this.overlay) this.overlay.classList.add('hidden');
  },

  show() {
    if (this.overlay) this.overlay.classList.remove('hidden');
  },

  showPause() {
    if (this.pauseOverlay) this.pauseOverlay.classList.remove('hidden');
  },

  hidePause() {
    if (this.pauseOverlay) this.pauseOverlay.classList.add('hidden');
  }
};