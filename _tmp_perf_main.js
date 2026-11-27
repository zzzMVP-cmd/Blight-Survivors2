const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

function bench() {
  return new Promise((resolve) => {
    Game.start('warrior');

    Wave.state = 'active';
    Wave.wave = 80;
    Wave.waveDeadline = Infinity;
    Wave.spawnQueue = [];
    Wave.clearAt = null;
    Game.player.invTime = 9999;
    Game.player.critRate = 0;

    const R = 36.89;
    const rows = [];

    function setMonsters(n) {
      Wave.monsters = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 * 7;
        const d = 30 + Math.sqrt(i) * 26;
        Wave.monsters.push({
          key: 'slime', name: '史莱姆',
          x: Math.cos(a) * d, y: Math.sin(a) * d,
          radius: R, hp: 1e12, maxHp: 1e12,
          shield: 1e6, maxShield: 1e6,
          speed: 40, damage: 10, color: '#4ade80', eyeColor: '#0a2a18',
          kbVx: 0, kbVy: 0, kbTimer: 0
        });
      }
    }

    const orig = {
      draw: Monsters.draw,
      rings: Monsters.drawShieldRings,
      texts: Monsters.drawShieldTexts
    };

    function oldRings(ctx, list) {
      const groups = Monsters._ringGroups;
      groups[0].length = 0;
      groups[1].length = 0;
      groups[2].length = 0;
      groups[3].length = 0;
      let total = 0;
      for (const m of list) {
        if (m.maxShield <= 0 || m.shield <= 0) continue;
        groups[Monsters.shieldAlphaLevel(m.shield / m.maxShield)].push(m);
        total += 1;
      }
      if (total === 0) return;
      const gap = 0.7;
      const start = Math.PI / 2 + gap;
      const end = Math.PI / 2 - gap + Math.PI * 2;
      ctx.strokeStyle = Monsters.SHIELD_STROKE;
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        const g = groups[i];
        if (g.length === 0) continue;
        ctx.globalAlpha = Monsters.SHIELD_ALPHA[i];
        ctx.beginPath();
        for (const m of g) {
          ctx.arc(m.x, m.y, m.radius + 5, start, end);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    function setMode(mode) {
      Monsters.draw = orig.draw;
      Monsters.drawShieldRings = orig.rings;
      Monsters.drawShieldTexts = orig.texts;
      if (mode === 'noRings') {
        Monsters.drawShieldRings = function () {};
      } else if (mode === 'oldRings') {
        Monsters.drawShieldRings = oldRings;
      } else if (mode === 'noRingsNoText') {
        Monsters.drawShieldRings = function () {};
        Monsters.drawShieldTexts = function () {};
      } else if (mode === 'bodyOnly') {
        Monsters.draw = function (ctx, m) {
          if (m.key === 'slime') this.drawSlime(ctx, m);
        };
        Monsters.drawShieldRings = function () {};
        Monsters.drawShieldTexts = function () {};
      } else if (mode === 'nothing') {
        Monsters.draw = function () {};
        Monsters.drawShieldRings = function () {};
        Monsters.drawShieldTexts = function () {};
      }
    }

    function measure(n, mode, cb) {
      setMonsters(n);
      setMode(mode);
      const gaps = [];
      let last = 0;
      let frames = 0;
      function tick(ts) {
        if (last > 0) gaps.push(ts - last);
        last = ts;
        frames++;
        if (frames < 100) requestAnimationFrame(tick);
        else cb(gaps);
      }
      requestAnimationFrame(tick);
    }

    const modes = ['full', 'noRings', 'noRingsNoText'];
    const counts = [250, 400, 500];
    let ci = 0;
    let n = counts[0];
    function next(i) {
      if (i >= modes.length) {
        ci += 1;
        if (ci >= counts.length) {
          setMode('full');
          resolve(JSON.stringify({ canvas: Game.canvas.width + 'x' + Game.canvas.height, rows: rows }, null, 2));
          return;
        }
        n = counts[ci];
        i = 0;
      }
      measure(n, modes[i], (gaps) => {
        const avg = gaps.reduce((s, v) => s + v, 0) / gaps.length;
        const sorted = gaps.slice().sort((a, b) => a - b);
        rows.push({
          n: n,
          mode: modes[i],
          avgMs: Math.round(avg * 100) / 100,
          p50: Math.round(sorted[Math.floor(sorted.length * 0.5)] * 100) / 100,
          p95: Math.round(sorted[Math.floor(sorted.length * 0.95)] * 100) / 100,
          fps: Math.round(1000 / avg)
        });
        next(i + 1);
      });
    }
    next(0);
  });
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false,
      backgroundThrottling: false
    }
  });

  await win.loadFile(path.join(__dirname, 'index.html'));
  await new Promise((r) => setTimeout(r, 800));

  try {
    const res = await win.webContents.executeJavaScript('(' + bench.toString() + ')()');
    fs.writeFileSync('_tmp_perf_out.txt', res + '\n', 'utf8');
    console.log(res);
  } catch (e) {
    fs.writeFileSync('_tmp_perf_out.txt', 'ERROR ' + e.message + '\n', 'utf8');
    console.log('ERROR', e.message);
  }
  app.quit();
});