// Automated smoke + logic test for the Casino game using Playwright + Chromium (headless).
// Runs entirely in-page: drives the UI through the tutorial and several full practice matches,
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

   // ---------- PRACTICE MATCHES (multiple random games) ----------
   const NUM_MATCHES = 5;
    for (let m = 0; m < NUM_MATCHES; m++) {
          console.log(`--- Match ${m + 1} ---`);
          if (m > 0) {
                  // clear any lingering overlay from a match that hit MAX_TURNS mid-round
            for (let i = 0; i < 5; i++) {
                      const overlayActive = await page.locator('#overlayModal.active').isVisible().catch(()=>false);
                      if (!overlayActive) break;
                      const nextRoundBtn = page.locator('#btnNextRound');
                      const afterMatchBtn = page.locator('#btnAfterMatch');
                      if (await nextRoundBtn.isVisible().catch(()=>false)) await nextRoundBtn.click();
                      else if (await afterMatchBtn.isVisible().catch(()=>false)) await afterMatchBtn.click();
                      await page.waitForTimeout(40);
            }
                  await page.click('#btnNewMatch');
                  await page.waitForTimeout(40);
          }
          let turns = 0;
          const MAX_TURNS = 4000;
          let matchEnded = false;
          while (turns < MAX_TURNS) {
                  turns++;
                  // Check for match/round overlay
            const overlayActive = await page.locator('#overlayModal.active').isVisible().catch(()=>false);
                  if (overlayActive) {
                            const nextRoundBtn = page.locator('#btnNextRound');
                            const afterMatchBtn = page.locator('#btnAfterMatch');
                            if (await nextRoundBtn.isVisible().catch(()=>false)) {
                                        await nextRoundBtn.click();
                                        await page.waitForTimeout(40);
                                        continue;
                            } else if (await afterMatchBtn.isVisible().catch(()=>false)) {
                                        console.log(`Match ${m + 1} finished after ${turns} turns.`);
                                        matchEnded = true;
                                        await afterMatchBtn.click(); // dismiss overlay & start a fresh practice game
                              await page.waitForTimeout(40);
                                        break;
                            }
                  }

            // integrity check via in-page state
            const integrity = await page.evaluate(() => {
                      if (!window.__GAME_DEBUG__) return null;
                      return window.__GAME_DEBUG__();
            });
                  if (integrity && !integrity.ok) {
                            errors.push('[integrity] ' + JSON.stringify(integrity));
                  }

            const isHumanTurn = await page.evaluate(() => window.__IS_HUMAN_TURN__ ? window.__IS_HUMAN_TURN__() : null);
                  if (isHumanTurn === false) {
                            await page.waitForTimeout(30);
                            continue;
                  }
                  if (isHumanTurn === null) { await page.waitForTimeout(30); continue; }

            const handCards = await page.locator('#handRow .card').all();
                  if (handCards.length === 0) { await page.waitForTimeout(30); continue; }
                  // pick a random hand card
            const idx = Math.floor(Math.random() * handCards.length);
                  await handCards[idx].click();
                  await page.waitForTimeout(20);
                  const actionBtns = await page.locator('#actionList .action-btn').all();
                  if (actionBtns.length === 0) {
                            await page.click('#btnCancelSelection').catch(()=>{});
                            await page.waitForTimeout(20);
                            continue;
                  }
                  const aidx = Math.floor(Math.random() * actionBtns.length);
                  await actionBtns[aidx].click();
                  await page.waitForTimeout(30);
          }
          if (!matchEnded) {
                  const dbg = await page.evaluate(() => window.__GAME_DEBUG__ ? window.__GAME_DEBUG__() : null);
                  errors.push(`Match ${m + 1} exceeded MAX_TURNS (${MAX_TURNS}) — possible infinite loop / stuck state. Debug: ${JSON.stringify(dbg)}`);
          }
    }

   await browser.close();

   if (errors.length) {
         console.error('\n=== ERRORS FOUND ===');
         errors.forEach(e => console.error(e));
         process.exit(1);
   } else {
         console.log('\nALL TESTS PASSED — no console errors, no integrity violations, tutorial + 5 practice matches completed.');
   }
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
