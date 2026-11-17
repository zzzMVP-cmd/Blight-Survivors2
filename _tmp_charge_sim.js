const fs = require('fs');
const vm = require('vm');

const ctx = { console, Math, Set };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('js/systems/attack/charge.js', 'utf8') + '\nthis.Charge = Charge;', ctx, { filename: 'charge.js' });
vm.runInContext(fs.readFileSync('js/systems/attack/weapon.js', 'utf8') + '\nthis.Weapon = Weapon;', ctx, { filename: 'weapon.js' });

const Weapon = ctx.Weapon;
const Charge = ctx.Charge;

const HERO = { swordLength: 40, attackRange: 120, attackInterval: 2, weaponDamage: 25, swingAngle: Math.PI / 2 };
const DT = 0.02;
const DURATION = 120;

function makeMonster(x, y) {
  return { x, y, radius: 17, hp: 1e12, maxHp: 1e12, shield: 0, maxShield: 0 };
}

function run(name, decide, angleOf) {
  Weapon.init(HERO);
  Charge.reset();

  const player = { x: 0, y: 0, r: 14, level: 1 };
  const monsters = [makeMonster(60, 0)];

  const seen = new Set();
  const hitTimes = [];
  const arcAngles = [];
  let totalTimes = 0;

  for (let i = 0; i < DURATION / DT; i++) {
    const t = i * DT;
    const hold = decide(t);
    if (hold && !Charge.holding) Charge.start();
    if (!hold && Charge.holding) Charge.end(player, angleOf ? angleOf() : 0);

    Charge.update(DT);
    Weapon.update(DT, player, monsters);

    for (const a of Weapon.arcs) {
      if (seen.has(a)) continue;
      seen.add(a);
      hitTimes.push(t + DT);
      arcAngles.push(a.facingAngle);
      totalTimes += a.charged ? a.chargeCount : 1;
    }
  }

  const dmg = totalTimes * HERO.weaponDamage;
  return {
    name,
    swings: hitTimes.length,
    attacks: totalTimes,
    dmg,
    dps: dmg / DURATION,
    first: hitTimes.length ? hitTimes[0] : -1,
    hitTimes,
    arcAngles
  };
}

// 直接攻击：从不蓄力
const direct = run('A 直接攻击', () => false);

// 满蓄：冷却结束立刻按住，满条即放
function fullChargeDecide() {
  if (Charge.holding) return !Charge.isFull();
  return Weapon.state === 'cooldown' || Weapon.state === 'idle';
}
const full = run('B 满蓄(8次)即放', fullChargeDecide);

function fixedHold(sec) {
  let holding = false;
  let held = 0;
  return () => {
    if (!holding) {
      if (Weapon.state === 'cooldown' || Weapon.state === 'idle') { holding = true; held = 0; return true; }
      return false;
    }
    held += DT;
    if (Charge.isFull() || held >= sec) { holding = false; return false; }
    return true;
  };
}

const out = [];
out.push('攻击间隔=' + HERO.attackInterval + 's  单次伤害=' + HERO.weaponDamage + '  时长=' + DURATION + 's');
out.push('');
out.push('【等速验证：蓄力已不再额外付出 aim+swing 的 0.3s】');
const rows = [direct, full,
  run('C 每次蓄 2s', fixedHold(2.0)),
  run('D 每次蓄 4s', fixedHold(4.0)),
  run('E 每次蓄 6s', fixedHold(6.0))];
for (const r of rows) {
  out.push('  ' + r.name + ' | 挥砍=' + r.swings + ' 攻击次数=' + r.attacks +
    ' 总伤害=' + r.dmg + ' DPS=' + r.dps.toFixed(2) +
    ' 首次=' + (r.first < 0 ? '无' : r.first.toFixed(2) + 's'));
}

out.push('');
out.push('【首次攻击后每次命中的间隔】');
out.push('  直接攻击 = ' + (direct.hitTimes[1] - direct.hitTimes[0]).toFixed(3) + 's');
out.push('  满蓄     = ' + (full.hitTimes[1] - full.hitTimes[0]).toFixed(3) + 's（8 次攻击合并为 1 刀）');

out.push('');
out.push('【蓄力条时间轴：武器 idle 时按下】');
Weapon.init(HERO);
Charge.reset();
Charge.start();
out.push('  rectTimes = ' + Charge.rectTimes.map((v) => v.toFixed(2)).join(', '));
out.push('  total = ' + Charge.total.toFixed(2) + 's');
Charge.reset();

out.push('');
out.push('【蓄力条时间轴：命中后立刻按住（cooldown 1.7s）】');
Weapon.init(HERO);
Weapon.state = 'cooldown';
Weapon.cooldownTimer = 1.7;
Charge.reset();
Charge.start();
out.push('  rectTimes = ' + Charge.rectTimes.map((v) => v.toFixed(2)).join(', '));
out.push('  total = ' + Charge.total.toFixed(2) + 's  第1格 = 直接攻击第1次命中时刻');
Charge.reset();

out.push('');
out.push('【丙：松手时场上无目标，仍然朝鼠标方向挥出】');
Weapon.init(HERO);
Charge.reset();
Charge.start();
Charge.elapsed = 8;
Weapon.arcs.length = 0;
Charge.end({ x: 0, y: 0, r: 14 }, -Math.PI / 2);
const arc = Weapon.arcs[0];
out.push('  holding=' + Charge.holding + ' 武器state=' + Weapon.state +
  ' 剑气=' + (arc ? '已生成' : '无') +
  ' 方向=' + (arc ? (arc.facingAngle / Math.PI).toFixed(2) + 'π（-0.5π = 正上方，即鼠标方向）' : ''));
Charge.reset();

out.push('');
out.push('【蓄力方向 = 鼠标方向】');
Weapon.init(HERO);
Charge.reset();
Charge.start();
Charge.elapsed = 4;
Weapon.arcs.length = 0;
Charge.end({ x: 0, y: 0, r: 14 }, Math.PI);
out.push('  传入 π（正左方）→ 剑气方向=' + (Weapon.arcs[0].facingAngle / Math.PI).toFixed(2) + 'π');
Charge.reset();

out.push('');
out.push('【不可蓄力状态：按住左键不冻结状态机，照常攻击】');
Weapon.init(HERO);
Charge.reset();
Charge.bars = [{ weapon: Weapon, entry: { icon: 'x', canCharge: true, chargeEnabled: false } }];
const player2 = { x: 0, y: 0, r: 14, level: 1 };
const monsters2 = [makeMonster(60, 0)];
let swings2 = 0;
const seen2 = new Set();
for (let i = 0; i < 60 / DT; i++) {
  if (!Charge.holding) Charge.start();
  Charge.update(DT);
  Weapon.update(DT, player2, monsters2);
  for (const a of Weapon.arcs) {
    if (seen2.has(a)) continue;
    seen2.add(a);
    swings2++;
  }
}
out.push('  holding=' + Charge.holding + '（应为 false，不出现蓄力条）');
out.push('  60s 内挥砍=' + swings2 + ' 次，攻击次数=' + swings2 + '（应等于直接攻击的 30 次）');
Charge.reset();

fs.writeFileSync('_tmp_charge_out.txt', out.join('\n') + '\n', 'utf8');