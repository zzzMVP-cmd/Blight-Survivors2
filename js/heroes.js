'use strict';

// 英雄定义。后续新增英雄时，往 HEROES 里追加并在 HERO_ORDER 登记即可。
const HEROES = {
  warrior: {
    key: 'warrior',
    name: '战士',
    image: 'assets/images/warrior.png',
    desc: '均衡近战英雄，生命值高',
    weapon: '裂地斩',
    weaponIcon: 'assets/images/weapon_warrior.png',
    color: '#ffb84d',
    projColor: '#ffd76e',
    hp: 120,
    speed: 210
  }
};

// 英雄展示顺序
const HERO_ORDER = ['warrior'];