// Smoke test: serve dist, open the app headless with WebGL, screenshot key states, log console errors.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';

const OUT = '/tmp/claude-0/-home-user-AOC/97b28e06-fe38-5c90-8eee-6d9478d21d66/scratchpad/shots';
fs.mkdirSync(OUT, { recursive: true });
const PORT = 4173 + Math.floor(Math.random() * 100);
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: '/home/user/AOC', stdio: 'pipe' });
await sleep(2500);

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + String(e).slice(0, 300)));

const mode = process.argv[2] ?? 'basic';
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
await sleep(3000);
await page.screenshot({ path: `${OUT}/01-map.png` });

if (mode === 'basic' || mode === 'full') {
  // toggle coverage overlay
  await page.getByRole('button', { name: 'Camera coverage' }).click();
  await sleep(600);
  await page.screenshot({ path: `${OUT}/02-coverage.png` });
  // click HQ zone via canvas center-ish: the HQ is at the centre of the default view
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await sleep(2200);
  await page.screenshot({ path: `${OUT}/03-hq.png` });
  // walk capability tabs
  for (const cap of ['Scene', 'Patrol', 'Robotics', 'Aerial', 'Environment', 'Facilities', 'Cyber']) {
    const b = page.getByRole('button', { name: cap, exact: true }).first();
    if (await b.count()) { await b.click(); await sleep(700); await page.screenshot({ path: `${OUT}/04-cap-${cap}.png` }); }
  }
  await page.keyboard.press('Escape');
  await sleep(1200);
  // global views
  for (const v of ['Agents', 'Approvals', 'Incidents', 'Governance', 'Health']) {
    await page.getByRole('button', { name: v, exact: true }).first().click();
    await sleep(700);
    await page.screenshot({ path: `${OUT}/05-view-${v}.png` });
  }
  // command bar
  await page.keyboard.press('Control+K');
  await sleep(300);
  await page.keyboard.type('vehicles through Gate 2 after 2200');
  await page.keyboard.press('Enter');
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/06-command.png` });
  await page.keyboard.press('Escape');
  await sleep(300);
  await page.getByRole('button', { name: 'Camp map', exact: true }).first().click();
  await sleep(500);
}

if (mode === 'full' || mode === 'scenario') {
  // scenario in step mode
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await sleep(800);
  for (let i = 1; i <= 15; i++) {
    await page.getByRole('button', { name: 'Next beat' }).click();
    await sleep(i === 7 ? 1200 : 900);
    if ([2, 4, 6, 7, 8, 10, 11, 13, 14, 15].includes(i)) await page.screenshot({ path: `${OUT}/07-beat-${String(i).padStart(2, '0')}.png` });
  }
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/08-end.png` });
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await sleep(800);
  await page.screenshot({ path: `${OUT}/09-reset.png` });
}

console.log('ERRORS:', errors.length);
for (const e of [...new Set(errors)].slice(0, 20)) console.log(' -', e);
await browser.close();
server.kill();
process.exit(0);
