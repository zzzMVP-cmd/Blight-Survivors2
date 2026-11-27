const fs = require('fs');
const vm = require('vm');

// ===== 满配参数（来自 heroes.js + upgrade.js 的上限推导）=====
const BASE_RANGE = 120;
const RANGE_PER_UPG = 12;
const UPG_MAX = 4;
const BASE_FAN = Math.PI / 2;
const FAN_PER_UPG = 15 * Math.PI / 180;

const ATTACK_RANGE = BASE_RANGE + RANGE_PER_UPG * UPG_MAX;
const FAN_ANGLE = BASE_FAN + FAN_PER_UPG * UPG_MAX;

const AIM_DURATION = 0.08;
const SWING_DURATION = 0.12;
const MIN_CYCLE = AIM_DURATION + SWING_DURATION;
const INTERVAL_CAP = 0.2;
const DIRECT_CYCLE = Math.max(INTERVAL_CAP, MIN_CYCLE);

const MOVE_SPEED_CAP = 400;
const SCENARIO = process.argv[2] || 'still';
const MAX_ALIVE_ARG = Number(process.argv[3] || 0);
const KITE_RADIUS = 200;
const MAX_T = 20000;

const ctx = { console, Math, Set, Map };
ctx.Game = {
  FIXED_DT: 0.02,
  player: { x: 0, y: 0, r: 18, level: 300, invTime: 0 },
  onHit() { this.player.invTime = 0.5; }
};
ctx.Shield = { applyDamage() {} };
vm.createContext(ctx);

function load(file, name) {
  vm.runInContext(
    fs.readFileSync(file, 'utf8') + '\nthis.' + name + ' = ' + name + ';',
    ctx,
    { filename: file }
  );
}

load('js/systems/monsters.js', 'Monsters');
load('js/systems/monster-ai.js', 'MonsterAI');
load('js/systems/wave.js', 'Wave');

const Wave = ctx.Wave;
const Monsters = ctx.Monsters;
const Game = ctx.Game;
const DT = 0.02;

Wave.init();
if (MAX_ALIVE_ARG > 0) Wave.MAX_ALIVE = MAX_ALIVE_ARG;

let t = 0;
let nextSwing = 0.3;
let kills = 0;
let curWave = 0;
let startT = 0;
let killsAtStart = 0;
let queueAtStart = 0;
let arcs = 0;
let arcHits = 0;
let rows = [];
let kiteAngle = 0;

function queueTotal() {
  let n = 0;
  for (const b of Wave.spawnQueue) n += b.count;
  return n;
}

// 忠实复刻 Weapon.findTarget：目标搜索只用 ATTACK_RANGE，不含怪物半径
function findTarget() {
  const p = Game.player;
  let best = null;
  let bestD = Infinity;
  for (const m of Wave.monsters) {
    if (m.hp <= 0) continue;
    const dx = m.x - p.x;
    const dy = m.y - p.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < ATTACK_RANGE * ATTACK_RANGE && d2 < bestD) { bestD = d2; best = m; }
  }
  return best;
}

// 忠实复刻 Attack.processWarrior 的扇形判定：reach = 攻击范围 + 怪物半径
function swing() {
  const p = Game.player;
  const target = findTarget();
  if (!target) return;
  const a = Math.atan2(target.y - p.y, target.x - p.x);
  arcs++;

  let n = 0;
  for (const m of Wave.monsters) {
    if (m.hp <= 0) continue;
    const dx = m.x - p.x;
    const dy = m.y - p.y;
    const reach = ATTACK_RANGE + m.radius;
    if (dx > reach || dx < -reach || dy > reach || dy < -reach) continue;
    if (dx * dx + dy * dy >= reach * reach) continue;

    let diff = Math.atan2(dy, dx) - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) < FAN_ANGLE / 2) { m.hp = 0; n++; }
  }
  arcHits += n;
}

function processKills() {
  const list = Wave.monsters;
  let write = 0;
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    if (m.hp <= 0) kills++;
    else list[write++] = m;
  }
  list.length = write;
}

while (t < MAX_T) {
  if (SCENARIO === 'kite') {
    kiteAngle += (MOVE_SPEED_CAP / KITE_RADIUS) * DT;
    Game.player.x = Math.cos(kiteAngle) * KITE_RADIUS;
    Game.player.y = Math.sin(kiteAngle) * KITE_RADIUS;
  }

  Wave.update(DT);

  if (Wave.wave !== curWave) {
    if (curWave > 0) {
      rows.push({
        wave: curWave,
        dur: t - startT,
        kills: kills - killsAtStart,
        queue: queueAtStart,
        queueEnd: queueTotal()
      });
    }
    curWave = Wave.wave;
    startT = t;
    killsAtStart = kills;
    queueAtStart = queueTotal();
    if (curWave > 80) break;
  }

  if (t >= nextSwing) { swing(); nextSwing += DIRECT_CYCLE; }
  processKills();
  t += DT;
}

const r80 = Monsters.calcRadius(80, 'slime');
const discR = ATTACK_RANGE + r80;
const discArea = Math.PI * discR * discR;
const monArea = Math.PI * r80 * r80;
const discCap = Math.floor(discArea * 0.85 / monArea);
const fanShare = FAN_ANGLE / (Math.PI * 2);
const travel = 480 - discR;
const arrivalCap = Wave.MAX_ALIVE / (travel / 40);

const out = [];
out.push('=== 满配参数（英雄初始值 + 全部强化取满）===');
out.push('同屏上限 MAX_ALIVE = ' + Wave.MAX_ALIVE);
out.push('挥剑半径 120 → ' + ATTACK_RANGE + '（长锋 +12 × 4）');
out.push('扇形角度 90° → ' + (FAN_ANGLE * 180 / Math.PI).toFixed(0) + '°（阔斩 +15° × 4）');
out.push('攻击间隔上限 ' + INTERVAL_CAP + 's，但瞄准 ' + AIM_DURATION + ' + 挥砍 ' + SWING_DURATION +
  ' = ' + MIN_CYCLE.toFixed(2) + 's → 直接攻击真实循环 ' + DIRECT_CYCLE.toFixed(2) + 's');
out.push('移速上限 ' + MOVE_SPEED_CAP + '，暴击率 100%（暴伤 log₂(lv) 倍），伤害远超怪物耐久（可秒杀）');
out.push('锐器伤 25 → 30（淬刃 +1/+1/+1/+2），钝器伤 +2（大质变）');
out.push('');
out.push('=== 第 80 波几何 ===');
out.push('怪物半径 ' + r80.toFixed(2) + 'px，触及半径 ' + discR.toFixed(2) + 'px');
out.push('击杀圆盘面积 ' + discArea.toFixed(0) + 'px²，单只占地 ' + monArea.toFixed(0) +
  'px² → 圆盘最多塞 ' + discCap + ' 只');
out.push('扇形占圆周 ' + (fanShare * 100).toFixed(1) + '% → 一刀理论覆盖 ' +
  (discCap * fanShare).toFixed(1) + ' 只');
out.push('到场时间 (480-' + discR.toFixed(0) + ')/40 = ' + (travel / 40).toFixed(2) +
  's → 到场吞吐上限 ' + arrivalCap.toFixed(1) + ' 只/s');
out.push('');

const pick = [40, 41, 42, 45, 50, 55, 60, 65, 70, 75, 79, 80];
out.push('波次 | 耗时(s) | 击杀 | 吞吐(只/s) | 开始排队 | 结束排队');
for (const r of rows) {
  if (pick.indexOf(r.wave) < 0) continue;
  out.push(
    String(r.wave).padStart(4) + ' | ' +
    r.dur.toFixed(1).padStart(7) + ' | ' +
    String(r.kills).padStart(6) + ' | ' +
    (r.dur > 0 ? (r.kills / r.dur).toFixed(1) : '0').padStart(11) + ' | ' +
    String(r.queue).padStart(8) + ' | ' +
    String(r.queueEnd).padStart(8)
  );
}

const w40 = rows.find((r) => r.wave === 40);
const w80 = rows.find((r) => r.wave === 80);
out.push('');
out.push('=== 关键波耗时（场景：' + (SCENARIO === 'kite' ? '绕圈风筝 400px/s' : '原地站桩') + '）===');
if (w40) {
  out.push('第 40 波：' + w40.dur.toFixed(0) + 's（' + (w40.dur / 60).toFixed(1) + ' 分钟），击杀 ' +
    w40.kills + ' 只，吞吐 ' + (w40.kills / w40.dur).toFixed(1) + ' 只/s');
} else {
  out.push('第 40 波在 ' + (MAX_T / 60).toFixed(0) + ' 分钟内没有结束');
}
if (w80) {
  out.push('第 80 波：' + w80.dur.toFixed(0) + 's（' + (w80.dur / 60).toFixed(1) + ' 分钟），击杀 ' +
    w80.kills + ' 只，吞吐 ' + (w80.kills / w80.dur).toFixed(1) + ' 只/s');
} else {
  out.push('第 80 波在 ' + (MAX_T / 60).toFixed(0) + ' 分钟模拟上限内没有结束（开始时排队 ' +
    (rows.length ? rows[rows.length - 1].queueEnd : 0) + ' 只）');
}

let totalKills = 0;
let totalDur = 0;
for (const r of rows) { totalKills += r.kills; totalDur += r.dur; }
out.push('');
out.push('0~80 波全程：' + (totalDur / 60).toFixed(1) + ' 分钟，击杀 ' + totalKills + ' 只，平均吞吐 ' +
  (totalKills / Math.max(1, totalDur)).toFixed(1) + ' 只/s');
out.push('总挥砍 ' + arcs + ' 刀，平均每刀命中 ' + (arcs ? (arcHits / arcs).toFixed(1) : '0') + ' 只');
out.push('平均每刀间隔 ' + (totalDur / Math.max(1, arcs)).toFixed(2) + 's');

fs.writeFileSync('_tmp_wave_out_' + SCENARIO + '_' + Wave.MAX_ALIVE + '.txt', out.join('\n') + '\n', 'utf8');
console.log('done ' + SCENARIO);