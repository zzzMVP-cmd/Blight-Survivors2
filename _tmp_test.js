const fs = require('fs');
const vm = require('vm');

const ctx = { console, Math, Infinity };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('js/systems/monsters.js', 'utf8') + '\nthis.Monsters = Monsters;', ctx, { filename: 'monsters.js' });
vm.runInContext(fs.readFileSync('js/systems/wave.js', 'utf8') + '\nthis.Wave = Wave;', ctx, { filename: 'wave.js' });

const Monsters = ctx.Monsters;
const Wave = ctx.Wave;

let spawned = [];
ctx.MonsterAI = {
  spawn(type, player, hp, dmg, wave) {
    spawned.push({ hp, dmg });
    return { x: 0, y: 0, radius: Monsters.calcRadius(wave, 'slime'), hp, maxHp: hp, shield: Monsters.calcShield(wave), maxShield: Monsters.calcShield(wave) };
  },
  move() { }, separate() { }, processAttacks() { }
};
ctx.Game = { player: { x: 0, y: 0, r: 20 } };

Wave.init();
const lines = [];
lines.push('wave | count  | waveHp    | waveDmg  | shield  | radius | deadline  | 关键节点');
for (let i = 1; i <= 45; i++) {
  Wave.startWave();
  if ([20, 25, 30, 35, 39, 40, 41, 45].includes(Wave.wave)) {
    const sh = Monsters.calcShield(Wave.wave);
    const r = Monsters.calcRadius(Wave.wave, 'slime');
    lines.push(
      String(Wave.wave).padEnd(4) + ' | ' + String(Wave.waveCount).padEnd(6) + ' | ' +
      String(Wave.waveHp).padEnd(9) + ' | ' + String(Wave.waveDamage).padEnd(8) + ' | ' +
      String(sh).padEnd(7) + ' | ' + r.toFixed(1).padEnd(6) + ' | ' +
      String(Wave.waveDeadline).padEnd(9) + ' | ' + (Wave.isKeyWave(Wave.wave) ? 'YES' : '')
    );
  }
}

Wave.wave = 40;
Wave.state = 'active';
Wave.monsters = [{ hp: 1 }];
Wave.spawnQueue = 5;
Wave.waveElapsed = 1000;
Wave.waveDeadline = Infinity;
Wave.update(0.02);
lines.push('');
lines.push('第40波 elapsed=1000s 后 wave=' + Wave.wave + '（应仍为 40，因为不限时）');

Wave.wave = 41;
Wave.state = 'active';
Wave.monsters = [{ hp: 1 }];
Wave.spawnQueue = 5;
Wave.waveElapsed = 15.02;
Wave.waveDeadline = 15;
Wave.update(0.02);
lines.push('第41波 elapsed=15s 后 wave=' + Wave.wave + '（应为 42，硬推进，队列残留 ' + Wave.spawnQueue + '）');

Wave.wave = 40;
Wave.state = 'active';
Wave.waveElapsed = 50;
Wave.monsters = [];
Wave.spawnQueue = 0;
Wave.clearAt = null;
lines.push('');
lines.push('第40波清场瞬间状态：' + Wave.getStatus());

Wave.monsters = [{ hp: 1 }];
Wave.spawnQueue = 3000;
lines.push('第40波未清场状态：' + Wave.getStatus());

Wave.wave = 41;
Wave.state = 'active';
Wave.waveElapsed = 5;
Wave.waveDeadline = 15;
Wave.monsters = [{ hp: 1 }];
Wave.spawnQueue = 3000;
lines.push('第41波未清场状态：' + Wave.getStatus());

fs.writeFileSync('_tmp_out.txt', lines.join('\n') + '\n');