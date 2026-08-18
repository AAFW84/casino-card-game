// Automated smoke + logic test for the Casino game using Playwright + Chromium (headless).
// Runs entirely in-page: drives the UI through the tutorial and several full practice matches
// (classic and Royal mode, mixing quick-suggestion clicks with the manual table-selection UI),
// captures console errors/exceptions, and validates invariants (card conservation, score rules).
const path = require('path');
const { chromium } = require('playwright');

const FILE_URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium/chrome-linux/chrome' , args:['--no-sandbox'] })
    .catch(async () => await chromium.launch({ args:['--no-sandbox'] }));
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push('[console] ' + msg.text()); });
  page.on('pageerror', err => errors.push('[pageerror] ' + err.message));

  await page.goto(FILE_URL);
  await page.waitForSelector('#btnStartTutorial');

  // ---------- TUTORIAL FLOW ----------
  await page.click('#btnStartTutorial');
  await page.waitForSelector('#tutorialScreen.active');

  for (let attempt = 0; attempt < 60; attempt++) {
    const finishVisible = await page.locator('#btnTutorialFinish').isVisible().catch(()=>false);
    if (finishVisible) break;
    const nextVisible = await page.locator('#btnTutorialNext').isVisible().catch(()=>false);
    if (nextVisible) {
      await page.click('#btnTutorialNext');
      await page.waitForTimeout(30);
      continue;
    }
    const cards = await page.locator('#tutHandRow .card').all();
    let advanced = false;
    for (const c of cards) {
      await c.click();
      await page.waitForTimeout(20);
      const btns = await page.locator('#tutActionPanel .action-btn').all();
      for (const b of btns) {
        await b.click();
        await page.waitForTimeout(30);
        if (await page.locator('#btnTutorialNext').isVisible()) { advanced = true; break; }
        // wrong choice: re-open the same card's action panel if still present, else move to next card
      }
      if (advanced) break;
    }
    if (!advanced) {
      await page.waitForTimeout(100);
    }
  }
  await page.waitForSelector('#btnTutorialFinish', { timeout: 8000 });
  console.log('Tutorial completed OK.');
  await page.click('#btnTutorialFinish');
  await page.waitForSelector('#gameScreen.active');

  // ---------- helper: clear any lingering round/match overlay ----------
  async function clearOverlay() {
    for (let i = 0; i < 5; i++) {
      const overlayActive = await page.locator('#overlayModal.active').isVisible().catch(()=>false);
      if (!overlayActive) break;
      const nextRoundBtn = page.locator('#btnNextRound');
      const afterMatchBtn = page.locator('#btnAfterMatch');
      if (await nextRoundBtn.isVisible().catch(()=>false)) await nextRoundBtn.click();
      else if (await afterMatchBtn.isVisible().catch(()=>false)) await afterMatchBtn.click();
      await page.waitForTimeout(40);
    }
  }

  // ---------- helper: play one full match to completion, mixing quick-suggestion
  //            clicks with the manual table-selection UI ----------
  async function playRandomMatch(label, manualProbability) {
    let turns = 0;
    const MAX_TURNS = 4000;
    let matchEnded = false;
    let manualPlaysUsed = 0;
    while (turns < MAX_TURNS) {
      turns++;
      const overlayActive = await page.locator('#overlayModal.active').isVisible().catch(()=>false);
      if (overlayActive) {
        const nextRoundBtn = page.locator('#btnNextRound');
        const afterMatchBtn = page.locator('#btnAfterMatch');
        if (await nextRoundBtn.isVisible().catch(()=>false)) {
          await nextRoundBtn.click();
          await page.waitForTimeout(40);
          continue;
        } else if (await afterMatchBtn.isVisible().catch(()=>false)) {
          console.log(`${label} finished after ${turns} turns (${manualPlaysUsed} manual plays).`);
          matchEnded = true;
          await afterMatchBtn.click(); // dismiss overlay & start a fresh practice game
          await page.waitForTimeout(40);
          break;
        }
      }

      // integrity check via in-page state
      const integrity = await page.evaluate(() => window.__GAME_DEBUG__ ? window.__GAME_DEBUG__() : null);
      if (integrity && !integrity.ok) {
        errors.push(`[integrity] (${label}) ` + JSON.stringify(integrity));
      }

      const isHumanTurn = await page.evaluate(() => window.__IS_HUMAN_TURN__ ? window.__IS_HUMAN_TURN__() : null);
      if (isHumanTurn !== true) { await page.waitForTimeout(15); continue; }

      const handCards = await page.locator('#handRow .card').all();
      if (handCards.length === 0) { await page.waitForTimeout(15); continue; }
      const idx = Math.floor(Math.random() * handCards.length);
      await handCards[idx].click();
      await page.waitForTimeout(10);

      const actions = await page.evaluate(() => window.__SELECTED_ACTIONS__ ? window.__SELECTED_ACTIONS__() : []);
      if (!actions || actions.length === 0) {
        await page.click('#btnCancelSelection').catch(()=>{});
        await page.waitForTimeout(20);
        continue;
      }

      const useManual = Math.random() < manualProbability;
      if (useManual) {
        const chosen = actions[Math.floor(Math.random() * actions.length)];
        const ids = [...(chosen.looseIds||[]), ...(chosen.buildIds||[])];
        let ok = true;
        for (const id of ids) {
          const item = page.locator(`#tableZone [data-id="${id}"]`).first();
          const visible = await item.isVisible().catch(()=>false);
          if (!visible) { ok = false; break; }
          await item.click();
          await page.waitForTimeout(8);
        }
        if (ok) {
          const matchBtns = await page.locator('#manualMatches .action-btn').all();
          if (matchBtns.length > 0) {
            await matchBtns[0].click();
            manualPlaysUsed++;
            await page.waitForTimeout(15);
            continue;
          }
        }
        // manual attempt didn't line up (e.g. table changed underneath us) — fall back below
        await page.click('#btnCancelSelection').catch(()=>{});
        await page.waitForTimeout(8);
        // re-select the same card for a normal quick-suggestion play
        const handCards2 = await page.locator('#handRow .card').all();
        if (handCards2.length === 0) continue;
        await handCards2[Math.floor(Math.random()*handCards2.length)].click();
        await page.waitForTimeout(10);
      }

      const actionBtns = await page.locator('#actionList .action-btn').all();
      if (actionBtns.length === 0) {
        await page.click('#btnCancelSelection').catch(()=>{});
        await page.waitForTimeout(10);
        continue;
      }
      const aidx = Math.floor(Math.random() * actionBtns.length);
      await actionBtns[aidx].click();
      await page.waitForTimeout(15);
    }
    if (!matchEnded) {
      const dbg = await page.evaluate(() => window.__GAME_DEBUG__ ? window.__GAME_DEBUG__() : null);
      errors.push(`${label} exceeded MAX_TURNS (${MAX_TURNS}) — possible infinite loop / stuck state. Debug: ${JSON.stringify(dbg)}`);
    }
  }

  // ---------- CLASSIC MODE: several matches, mixing manual selection in ----------
  const NUM_CLASSIC_MATCHES = 2;
  for (let m = 0; m < NUM_CLASSIC_MATCHES; m++) {
    console.log(`--- Classic Match ${m + 1} ---`);
    if (m > 0) {
      await clearOverlay();
      await page.click('#btnNewMatch');
      await page.waitForTimeout(25);
    }
    const mode = await page.evaluate(() => window.__GAME_MODE__ ? window.__GAME_MODE__() : null);
    if (mode !== 'classic') errors.push(`Classic Match ${m+1}: expected mode 'classic', got '${mode}'`);
    await playRandomMatch(`Classic Match ${m + 1}`, 0.3);
  }

  // ---------- ROYAL MODE: switch mode from the menu, then play several matches ----------
  await clearOverlay();
  await page.click('#btnExitGame');
  await page.waitForSelector('#startScreen');
  await page.click('#modeBtnRoyal');
  await page.waitForTimeout(20);
  await page.click('#btnStartPractice');
  await page.waitForSelector('#gameScreen.active');

  const NUM_ROYAL_MATCHES = 2;
  for (let m = 0; m < NUM_ROYAL_MATCHES; m++) {
    console.log(`--- Royal Match ${m + 1} ---`);
    if (m > 0) {
      await clearOverlay();
      await page.click('#btnNewMatch');
      await page.waitForTimeout(25);
    }
    const mode = await page.evaluate(() => window.__GAME_MODE__ ? window.__GAME_MODE__() : null);
    if (mode !== 'royal') errors.push(`Royal Match ${m+1}: expected mode 'royal', got '${mode}'`);
    await playRandomMatch(`Royal Match ${m + 1}`, 0.3);
  }

  await browser.close();

  if (errors.length) {
    console.error('\n=== ERRORS FOUND ===');
    errors.forEach(e => console.error(e));
    process.exit(1);
  } else {
    console.log(`\nALL TESTS PASSED — no console errors, no integrity violations. Tutorial + ${NUM_CLASSIC_MATCHES} classic matches + ${NUM_ROYAL_MATCHES} Royal matches completed (manual table-selection UI exercised throughout).`);
  }
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
