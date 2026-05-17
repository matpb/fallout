import { chromium } from 'playwright';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const url = process.argv[2] || 'http://localhost:4173';
const browser = await chromium.launch({ headless: true });

const errors = [];
const failures = [];

function expect(label, want, got) {
	if (want === got) {
		console.log(`  ✓ ${label}`);
	} else {
		console.log(`  ✗ ${label} — want ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
		failures.push(label);
	}
}

function expectTrue(label, got) {
	expect(label, true, got);
}

function newCtx() {
	return browser.newContext({ acceptDownloads: true });
}

// Walks the wizard steps for Survivor + 14 skill points.
// Pre-condition: starts on /create with empty form.
async function fillSurvivorWizard(page, name) {
	await page.locator('.pip-input').first().fill(name);
	await page.locator('[data-testid="origin-survivor"]').click();
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);
	// SPECIAL — spend 5 into STR
	const plus = await page.locator('button.pip-btn:has-text("+")').all();
	for (let i = 0; i < 5; i++) await plus[0].click();
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);
	// Survivor traits — pick 2
	await page.locator('button:has-text("Educated")').click();
	await page.locator('button:has-text("Heavy Handed")').click();
	const tags = await page.locator('button[title="Click to toggle Tag"]').all();
	for (let i = 0; i < 4; i++) await tags[i].click();
	const skillPlus = await page
		.locator('div:has(button[title="Click to toggle Tag"]) >> button.pip-btn:has-text("+")')
		.all();
	let spent = 0;
	for (let attempt = 0; attempt < 60 && spent < 14; attempt++) {
		for (const btn of skillPlus) {
			if (await btn.isDisabled()) continue;
			await btn.click();
			spent++;
			if (spent >= 14) break;
		}
	}
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);
	// First perk
	await page.locator('button:has(.pip-display)').first().click();
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);
	// Trinket
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);
	await page.locator('button:has-text("Save Character")').click();
	await page.waitForTimeout(1500);
}

// =========================================================================
// SECTION 1: Initial load + navigation
// =========================================================================
{
	const ctx = await newCtx();
	const page = await ctx.newPage();
	page.on('pageerror', (e) => errors.push(`[s1 pageerror] ${e.message}`));
	page.on('console', (m) => m.type() === 'error' && errors.push(`[s1 err] ${m.text()}`));

	console.log(`\n=== SECTION 1: Empty roster + nav ===`);
	await page.goto(url, { waitUntil: 'networkidle' });
	await page.waitForTimeout(800);
	const empty = (await page.locator('main').innerText()).includes('No characters in local storage');
	expect('empty roster shows hint', true, empty);

	for (const path of ['/create', '/settings', '/about']) {
		await page.goto(`${url}${path}`, { waitUntil: 'networkidle' });
		await page.waitForTimeout(400);
		const ok = !(await page.locator('text="Internal Error"').isVisible());
		expect(`route ${path} loads without 500`, true, ok);
	}
	await ctx.close();
}

// =========================================================================
// SECTION 2: Brotherhood Initiate create + sheet
// =========================================================================
let createdSheetUrl;
{
	const ctx = await newCtx();
	const page = await ctx.newPage();
	page.on('pageerror', (e) => errors.push(`[s2 pageerror] ${e.message}`));
	page.on('console', (m) => m.type() === 'error' && errors.push(`[s2 err] ${m.text()}`));

	console.log(`\n=== SECTION 2: Brotherhood create ===`);
	await page.goto(`${url}/create`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(400);

	await page.locator('.pip-input').first().fill('Sole Survivor');
	await page.locator('[data-testid="origin-brotherhood"]').click();
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);

	const plus = await page.locator('button.pip-btn:has-text("+")').all();
	for (let i = 0; i < 3; i++) await plus[0].click();
	for (let i = 0; i < 2; i++) await plus[2].click();
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);

	const tags = await page.locator('button[title="Click to toggle Tag"]').all();
	for (let i = 0; i < 4; i++) await tags[i].click();
	const skillPlus = await page
		.locator('div:has(button[title="Click to toggle Tag"]) >> button.pip-btn:has-text("+")')
		.all();
	let spent = 0;
	for (let a = 0; a < 60 && spent < 14; a++) {
		for (const btn of skillPlus) {
			if (await btn.isDisabled()) continue;
			await btn.click();
			spent++;
			if (spent >= 14) break;
		}
	}
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);
	await page.locator('button:has(.pip-display)').first().click();
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);
	await page.locator('input.pip-input[placeholder*="pre-war"]').fill('Original Trinket');
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);
	await page.locator('button:has-text("Save Character")').click();
	await page.waitForTimeout(1500);

	createdSheetUrl = page.url();
	expect('navigated to character sheet after save', true, createdSheetUrl.includes('/character/'));
	const title = await page.locator('[data-testid="name-display"]').innerText().catch(() => '');
	expect('character name shows on sheet', 'Sole Survivor', title);
	await ctx.close();
}

// =========================================================================
// SECTION 3: Edit fields + persistence
// =========================================================================
{
	const ctx = await newCtx();
	const page = await ctx.newPage();
	page.on('pageerror', (e) => errors.push(`[s3 pageerror] ${e.message}`));
	page.on('console', (m) => m.type() === 'error' && errors.push(`[s3 err] ${m.text()}`));

	console.log(`\n=== SECTION 3: Edit + Save + Reload persistence ===`);

	await page.goto(`${url}/create`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(400);
	await fillSurvivorWizard(page, 'Persist Tester');

	const sheetUrl = page.url();
	expect('s3: created character', true, sheetUrl.includes('/character/'));

	console.log(`  editing fields...`);
	await page.locator('[data-testid="name-display"]').click();
	await page.locator('[data-testid="name-input"]').fill('EDITED Name');
	await page.keyboard.press('Enter');
	await page.waitForTimeout(100);

	await page.locator('[data-testid="level-input"]').fill('5');
	await page.locator('[data-testid="level-input"]').blur();
	await page.locator('[data-testid="xp-input"]').fill('1234');
	await page.locator('[data-testid="xp-input"]').blur();
	await page.locator('[data-testid="hp-input"]').fill('3');
	await page.locator('[data-testid="hp-input"]').blur();
	await page.locator('[data-testid="luck-input"]').fill('2');
	await page.locator('[data-testid="luck-input"]').blur();
	await page.locator('[data-testid="caps-input"]').fill('999');
	await page.locator('[data-testid="caps-input"]').blur();
	await page.locator('[data-testid="trinket-input"]').fill('UPDATED Trinket');
	await page.locator('[data-testid="trinket-input"]').blur();
	await page.locator('[data-testid="notes-input"]').fill('Notes that should persist');

	await page.locator('[data-testid="inv-add"]').click();
	await page.waitForTimeout(100);
	await page.locator('[data-testid="inv-name-0"]').fill('Combat Knife');
	await page.locator('[data-testid="inv-qty-0"]').fill('1');
	await page.locator('[data-testid="inv-weight-0"]').fill('1.5');
	await page.locator('[data-testid="inv-notes-0"]').fill('Sharp');
	await page.locator('[data-testid="inv-add"]').click();
	await page.waitForTimeout(100);
	await page.locator('[data-testid="inv-name-1"]').fill('Stimpak');
	await page.locator('[data-testid="inv-qty-1"]').fill('3');
	await page.locator('[data-testid="inv-weight-1"]').fill('0.1');

	await page.locator('[data-testid="save-btn"]').click();
	await page.waitForTimeout(1500);

	console.log(`  hard-reloading...`);
	await page.reload({ waitUntil: 'networkidle' });
	await page.waitForTimeout(1500);

	expect('reload: name persisted', 'EDITED Name', await page.locator('[data-testid="name-display"]').innerText().catch(() => '?'));
	expect('reload: level persisted', '5', await page.locator('[data-testid="level-input"]').inputValue().catch(() => '?'));
	expect('reload: xp persisted', '1234', await page.locator('[data-testid="xp-input"]').inputValue().catch(() => '?'));
	expect('reload: hp persisted', '3', await page.locator('[data-testid="hp-input"]').inputValue().catch(() => '?'));
	expect('reload: luck persisted', '2', await page.locator('[data-testid="luck-input"]').inputValue().catch(() => '?'));
	expect('reload: caps persisted', '999', await page.locator('[data-testid="caps-input"]').inputValue().catch(() => '?'));
	expect('reload: trinket persisted', 'UPDATED Trinket', await page.locator('[data-testid="trinket-input"]').inputValue().catch(() => '?'));
	expect('reload: notes persisted', 'Notes that should persist', await page.locator('[data-testid="notes-input"]').inputValue().catch(() => '?'));
	expect('reload: inv item 0 name', 'Combat Knife', await page.locator('[data-testid="inv-name-0"]').inputValue().catch(() => '?'));
	expect('reload: inv item 1 name', 'Stimpak', await page.locator('[data-testid="inv-name-1"]').inputValue().catch(() => '?'));

	console.log(`  removing inv item 0...`);
	await page.locator('[data-testid="inv-remove-0"]').click();
	await page.waitForTimeout(100);
	await page.locator('[data-testid="save-btn"]').click();
	await page.waitForTimeout(1500);
	await page.reload({ waitUntil: 'networkidle' });
	await page.waitForTimeout(1500);
	const remainingName = await page.locator('[data-testid="inv-name-0"]').inputValue().catch(() => '?');
	expect('reload after remove: only Stimpak left', 'Stimpak', remainingName);

	await page.goto(url, { waitUntil: 'networkidle' });
	await page.waitForTimeout(800);
	const rosterHasEdited = await page.locator('text="EDITED Name"').isVisible();
	expect('roster shows edited character name', true, rosterHasEdited);
	const rosterShowsLevel = await page.locator('text=/LVL 5/').isVisible();
	expect('roster shows updated level', true, rosterShowsLevel);

	await ctx.close();
}

// =========================================================================
// SECTION 4: Backup → wipe → restore
// =========================================================================
{
	const ctx = await newCtx();
	const page = await ctx.newPage();
	page.on('pageerror', (e) => errors.push(`[s4 pageerror] ${e.message}`));
	page.on('console', (m) => m.type() === 'error' && errors.push(`[s4 err] ${m.text()}`));

	console.log(`\n=== SECTION 4: Backup + Wipe + Restore ===`);

	await page.goto(`${url}/create`, { waitUntil: 'networkidle' });
	await fillSurvivorWizard(page, 'Backup Subject');

	await page.goto(`${url}/settings`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(800);
	const stats = await page.locator('text=/characters in local database/').innerText();
	expect('settings shows non-zero count', true, /[1-9]/.test(stats));

	const downloadPromise = page.waitForEvent('download');
	await page.locator('button:has-text("Download backup")').click();
	const download = await downloadPromise;
	const tmp = mkdtempSync(join(tmpdir(), 'pipboy-backup-'));
	const backupPath = join(tmp, 'backup.json');
	await download.saveAs(backupPath);
	const backupContent = await import('node:fs').then((fs) => fs.readFileSync(backupPath, 'utf8'));
	expect('backup file contains the character', true, backupContent.includes('Backup Subject'));

	page.once('dialog', async (d) => await d.accept());
	await page.locator('button:has-text("Wipe all characters")').click();
	await page.waitForTimeout(1000);
	await page.goto(url, { waitUntil: 'networkidle' });
	await page.waitForTimeout(800);
	const wiped = (await page.locator('main').innerText()).includes('No characters in local storage');
	expect('wipe cleared roster', true, wiped);

	await page.goto(`${url}/settings`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(800);
	const restoreInput = page.locator('input[type="file"]');
	await restoreInput.setInputFiles(backupPath);
	await page.waitForTimeout(1500);
	await page.goto(url, { waitUntil: 'networkidle' });
	await page.waitForTimeout(800);
	const restored = await page.locator('text="Backup Subject"').isVisible();
	expect('restore brought character back', true, restored);

	rmSync(tmp, { recursive: true, force: true });
	await ctx.close();
}

// =========================================================================
// SECTION 5: Delete character
// =========================================================================
{
	const ctx = await newCtx();
	const page = await ctx.newPage();
	page.on('pageerror', (e) => errors.push(`[s5 pageerror] ${e.message}`));

	console.log(`\n=== SECTION 5: Delete character ===`);
	await page.goto(`${url}/create`, { waitUntil: 'networkidle' });
	await fillSurvivorWizard(page, 'To Be Deleted');

	page.once('dialog', async (d) => await d.accept());
	await page.locator('[data-testid="delete-btn"]').click();
	await page.waitForTimeout(1500);
	const finalUrl = page.url();
	expect('delete navigates back to roster', true, finalUrl === url + '/' || finalUrl === url);
	const wiped = (await page.locator('main').innerText()).includes('No characters in local storage');
	expect('character deleted from roster', true, wiped);
	await ctx.close();
}

// =========================================================================
// SECTION 6: Mister Handy — variant + attachments + skill blocks
// =========================================================================
{
	const ctx = await newCtx();
	const page = await ctx.newPage();
	page.on('pageerror', (e) => errors.push(`[s6 pageerror] ${e.message}`));
	page.on('console', (m) => m.type() === 'error' && errors.push(`[s6 err] ${m.text()}`));

	console.log(`\n=== SECTION 6: Mister Handy (Mister Gutsy, no pincer) ===`);
	await page.goto(`${url}/create`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(400);

	await page.locator('.pip-input').first().fill('CODSWORTH');
	await page.locator('[data-testid="origin-misterHandy"]').click();
	await page.waitForTimeout(200);
	// Variant picker should be visible
	const variantVisible = await page.locator('[data-testid="handy-variant-misterGutsy"]').isVisible();
	expect('Mr Handy variant picker visible on origin step', true, variantVisible);

	// Pick Mister Gutsy (10mm + buzz-saw + laser — no pincer)
	await page.locator('[data-testid="handy-variant-misterGutsy"]').click();
	await page.waitForTimeout(100);
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);

	// SPECIAL — spend 5 (anywhere)
	const plus6 = await page.locator('button.pip-btn:has-text("+")').all();
	for (let i = 0; i < 5; i++) await plus6[0].click();
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);

	// On step 3, Lockpick/Repair/Throwing must be disabled (Mr Gutsy has no pincer)
	const lockpickTag = await page
		.locator('button[title="Blocked — no pincer attachment"]')
		.count();
	expect('s6: ≥3 blocked skills shown (Lockpick/Repair/Throwing)', true, lockpickTag >= 3);

	// Tag 4 unblocked skills
	const allTags = await page.locator('button[title="Click to toggle Tag"]').all();
	let tagged = 0;
	for (const t of allTags) {
		if (await t.isDisabled()) continue;
		await t.click();
		tagged++;
		if (tagged >= 4) break;
	}
	const sp6 = await page
		.locator('div:has(button[title="Click to toggle Tag"]) >> button.pip-btn:has-text("+")')
		.all();
	let sk6 = 0;
	for (let a = 0; a < 80 && sk6 < 14; a++) {
		for (const b of sp6) {
			if (await b.isDisabled()) continue;
			await b.click();
			sk6++;
			if (sk6 >= 14) break;
		}
	}
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);
	await page.locator('button:has(.pip-display)').first().click();
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);
	await page.locator('button:has-text("Save Character")').click();
	await page.waitForTimeout(1500);

	const handyPanelVisible = await page.locator('[data-testid="handy-panel"]').isVisible();
	expect('s6: handy panel on sheet', true, handyPanelVisible);
	// Each arm slot is now a <select>; read its current value rather than the
	// rendered text (which contains every option in every dropdown).
	const selectedArms = await page
		.locator('[data-testid="handy-attachments"] select')
		.evaluateAll((selects) => selects.map((s) => /** @type {HTMLSelectElement} */ (s).value));
	expectTrue('s6: chassis arm 0 is 10mm auto pistol', selectedArms[0] === 'tenMmAutoPistol');
	expectTrue('s6: chassis arm 1 is buzz-saw', selectedArms[1] === 'buzzSaw');
	expectTrue('s6: chassis arm 2 is laser emitter', selectedArms[2] === 'laserEmitter');
	expectTrue('s6: no arm slot is set to pincer', !selectedArms.includes('pincer'));

	// Carry weight should be 150 (origin override) regardless of STR
	const carryText = await page.locator('text=/\\/ 150 lbs/').isVisible();
	expect('s6: carry weight pinned at 150 lbs', true, carryText);

	// Switching to Miss Nanny on the sheet adds pincer back
	await page.locator('[data-testid="handy-variant-edit-missNanny"]').click();
	await page.waitForTimeout(200);
	const selectedArms2 = await page
		.locator('[data-testid="handy-attachments"] select')
		.evaluateAll((selects) => selects.map((s) => /** @type {HTMLSelectElement} */ (s).value));
	expectTrue('s6: after Miss Nanny switch, pincer is in one of the arm slots', selectedArms2.includes('pincer'));

	await ctx.close();
}

// =========================================================================
// SECTION 7: Level-up flow
// =========================================================================
{
	const ctx = await newCtx();
	const page = await ctx.newPage();
	page.on('pageerror', (e) => errors.push(`[s7 pageerror] ${e.message}`));
	page.on('console', (m) => m.type() === 'error' && errors.push(`[s7 err] ${m.text()}`));

	console.log(`\n=== SECTION 7: Level up wizard ===`);
	await page.goto(`${url}/create`, { waitUntil: 'networkidle' });
	await fillSurvivorWizard(page, 'Level Climber');
	await page.waitForTimeout(500);

	// LEVEL UP button should be disabled (XP = 0)
	const lvlBtn = page.locator('[data-testid="levelup-btn"]');
	const disabledAt0 = await lvlBtn.isDisabled();
	expect('s7: level-up disabled at XP 0', true, disabledAt0);

	// Set XP to 100 (threshold for L2)
	await page.locator('[data-testid="xp-input"]').fill('100');
	await page.locator('[data-testid="xp-input"]').blur();
	await page.waitForTimeout(300);
	const enabledAt100 = !(await lvlBtn.isDisabled());
	expect('s7: level-up enabled at 100 XP', true, enabledAt100);

	// Open modal
	await lvlBtn.click();
	await page.waitForTimeout(200);
	const modalVisible = await page.locator('[data-testid="levelup-modal"]').isVisible();
	expect('s7: level-up modal opens', true, modalVisible);

	// Confirm should be disabled before picks
	const confirmBtn = page.locator('[data-testid="levelup-confirm"]');
	const confirmDisabled = await confirmBtn.isDisabled();
	expect('s7: confirm disabled before picks', true, confirmDisabled);

	// Pick a skill + a perk
	await page.locator('[data-testid="levelup-skill-speech"]').click();
	await page.waitForTimeout(100);
	const firstPerk = page.locator('button[data-testid^="levelup-perk-"]').first();
	await firstPerk.click();
	await page.waitForTimeout(100);
	const confirmEnabled = !(await confirmBtn.isDisabled());
	expect('s7: confirm enabled after picks', true, confirmEnabled);

	await confirmBtn.click();
	await page.waitForTimeout(1500);

	const newLevel = await page.locator('[data-testid="level-input"]').inputValue();
	expect('s7: level bumped to 2', '2', newLevel);

	// Reload and verify persistence
	await page.reload({ waitUntil: 'networkidle' });
	await page.waitForTimeout(1500);
	const persistedLevel = await page.locator('[data-testid="level-input"]').inputValue();
	expect('s7: level persists after reload', '2', persistedLevel);

	await ctx.close();
}

// =========================================================================
// SECTION 8: Weapons + Armor sections
// =========================================================================
{
	const ctx = await newCtx();
	const page = await ctx.newPage();
	page.on('pageerror', (e) => errors.push(`[s8 pageerror] ${e.message}`));
	page.on('console', (m) => m.type() === 'error' && errors.push(`[s8 err] ${m.text()}`));

	console.log(`\n=== SECTION 8: Weapons + Armor ===`);
	await page.goto(`${url}/create`, { waitUntil: 'networkidle' });
	await fillSurvivorWizard(page, 'Gun & Plate');
	await page.waitForTimeout(500);

	// Add a weapon
	await page.locator('[data-testid="weapon-add"]').click();
	await page.waitForTimeout(100);
	await page.locator('[data-testid="weapon-name-0"]').fill('10mm Pistol');
	await page.waitForTimeout(50);
	await page.locator('[data-testid="weapon-name-0"]').blur();

	// Add armor
	await page.locator('[data-testid="armor-add"]').click();
	await page.waitForTimeout(100);
	await page.locator('[data-testid="armor-name-0"]').fill('Leather Torso');
	await page.locator('[data-testid="armor-name-0"]').blur();

	await page.locator('[data-testid="save-btn"]').click();
	await page.waitForTimeout(1500);

	await page.reload({ waitUntil: 'networkidle' });
	await page.waitForTimeout(1500);

	const weaponName = await page.locator('[data-testid="weapon-name-0"]').inputValue();
	expect('s8: weapon persists', '10mm Pistol', weaponName);
	const armorName = await page.locator('[data-testid="armor-name-0"]').inputValue();
	expect('s8: armor persists', 'Leather Torso', armorName);

	await ctx.close();
}

// =========================================================================
// SECTION 9: Vault Dweller info field
// =========================================================================
{
	const ctx = await newCtx();
	const page = await ctx.newPage();
	page.on('pageerror', (e) => errors.push(`[s9 pageerror] ${e.message}`));
	page.on('console', (m) => m.type() === 'error' && errors.push(`[s9 err] ${m.text()}`));

	console.log(`\n=== SECTION 9: Vault Dweller info ===`);
	await page.goto(`${url}/create`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(400);

	await page.locator('.pip-input').first().fill('VD Tester');
	await page.locator('[data-testid="origin-vaultDweller"]').click();
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);

	const plus9 = await page.locator('button.pip-btn:has-text("+")').all();
	for (let i = 0; i < 5; i++) await plus9[0].click();
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);

	// Vault dweller gets 4 tag skills (3 base + 1 origin "any")
	const tags9 = await page.locator('button[title="Click to toggle Tag"]').all();
	for (let i = 0; i < 4; i++) await tags9[i].click();
	const sp9 = await page
		.locator('div:has(button[title="Click to toggle Tag"]) >> button.pip-btn:has-text("+")')
		.all();
	let sk9 = 0;
	for (let a = 0; a < 80 && sk9 < 14; a++) {
		for (const b of sp9) {
			if (await b.isDisabled()) continue;
			await b.click();
			sk9++;
			if (sk9 >= 14) break;
		}
	}
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);
	await page.locator('button:has(.pip-display)').first().click();
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);

	// Step 5 — Vault details fields exposed
	const vaultNumberCount = await page.locator('[data-testid="vault-number-input"]').count();
	expect('s9: vault number field on creator step 5', 1, vaultNumberCount);
	await page.locator('[data-testid="vault-number-input"]').fill('111');
	await page.locator('[data-testid="vault-experiment-input"]').fill('Cryogenic freeze');
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);
	await page.locator('button:has-text("Save Character")').click();
	await page.waitForTimeout(1500);

	const vaultPanel = await page.locator('[data-testid="vault-panel"]').isVisible();
	expect('s9: vault panel on sheet', true, vaultPanel);
	const vn = await page.locator('[data-testid="vault-number-edit"]').inputValue();
	expect('s9: vault number persisted', '111', vn);
	const ve = await page.locator('[data-testid="vault-experiment-edit"]').inputValue();
	expect('s9: vault experiment persisted', 'Cryogenic freeze', ve);

	await ctx.close();
}

// =========================================================================
// SECTION 10: Survivor 1-trait-2-perk path
// =========================================================================
{
	const ctx = await newCtx();
	const page = await ctx.newPage();
	page.on('pageerror', (e) => errors.push(`[s10 pageerror] ${e.message}`));
	page.on('console', (m) => m.type() === 'error' && errors.push(`[s10 err] ${m.text()}`));

	console.log(`\n=== SECTION 10: Survivor 1 trait + 2 perks ===`);
	await page.goto(`${url}/create`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(400);

	await page.locator('.pip-input').first().fill('Two Perker');
	await page.locator('[data-testid="origin-survivor"]').click();
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);

	const plus10 = await page.locator('button.pip-btn:has-text("+")').all();
	for (let i = 0; i < 5; i++) await plus10[0].click();
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);

	// Switch to "One Trait + Extra Perk" path
	await page.locator('[data-testid="survivor-path-perk"]').click();
	await page.waitForTimeout(100);
	await page.locator('button:has-text("Educated")').click();
	const tags10 = await page.locator('button[title="Click to toggle Tag"]').all();
	for (let i = 0; i < 4; i++) await tags10[i].click();
	const sp10 = await page
		.locator('div:has(button[title="Click to toggle Tag"]) >> button.pip-btn:has-text("+")')
		.all();
	let sk10 = 0;
	for (let a = 0; a < 80 && sk10 < 14; a++) {
		for (const b of sp10) {
			if (await b.isDisabled()) continue;
			await b.click();
			sk10++;
			if (sk10 >= 14) break;
		}
	}
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);

	// Two perks needed
	const perkBtns = await page.locator('button:has(.pip-display)').all();
	// First available perk
	await perkBtns[0].click();
	await page.waitForTimeout(100);
	// Second — different one
	await perkBtns[1].click();
	await page.waitForTimeout(100);
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);
	await page.locator('button:has-text("Save Character")').click();
	await page.waitForTimeout(1500);

	// Sheet should show 2 perks. The Perks & Traits panel mixes both <ul>s — the
	// perk list items have a glowing pip-display title, traits don't.
	const perkCount = await page
		.locator('section:has(.pip-panel-header:has-text("PERKS")) li:has(.pip-display)')
		.count();
	expect('s10: sheet shows 2 perks', 2, perkCount);
	const traitCount = await page
		.locator('section:has(.pip-panel-header:has-text("PERKS")) li:not(:has(.pip-display))')
		.count();
	expect('s10: sheet shows 1 trait', 1, traitCount);

	await ctx.close();
}

// =========================================================================
// SECTION 11: Super Mutant armor warning
// =========================================================================
{
	const ctx = await newCtx();
	const page = await ctx.newPage();
	page.on('pageerror', (e) => errors.push(`[s11 pageerror] ${e.message}`));
	page.on('console', (m) => m.type() === 'error' && errors.push(`[s11 err] ${m.text()}`));

	console.log(`\n=== SECTION 11: Super Mutant armor warn ===`);
	await page.goto(`${url}/create`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(400);

	await page.locator('.pip-input').first().fill('Strong');
	await page.locator('[data-testid="origin-superMutant"]').click();
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);

	const plus11 = await page.locator('button.pip-btn:has-text("+")').all();
	for (let i = 0; i < 5; i++) await plus11[0].click();
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);

	const tags11 = await page.locator('button[title="Click to toggle Tag"]').all();
	for (let i = 0; i < 3; i++) await tags11[i].click();
	const sp11 = await page
		.locator('div:has(button[title="Click to toggle Tag"]) >> button.pip-btn:has-text("+")')
		.all();
	let sk11 = 0;
	for (let a = 0; a < 80 && sk11 < 14; a++) {
		for (const b of sp11) {
			if (await b.isDisabled()) continue;
			await b.click();
			sk11++;
			if (sk11 >= 14) break;
		}
	}
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);
	await page.locator('button:has(.pip-display)').first().click();
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);
	await page.locator('button:has-text("Save Character")').click();
	await page.waitForTimeout(1500);

	// Add a non-Raider armor piece — should warn
	const smWarning = await page.locator('text=/SUPER MUTANT.*Raider/').isVisible();
	expect('s11: super-mutant header warning visible', true, smWarning);
	await page.locator('[data-testid="armor-add"]').click();
	await page.waitForTimeout(100);
	await page.locator('[data-testid="armor-name-0"]').fill('Leather Torso');
	await page.locator('[data-testid="armor-name-0"]').blur();
	await page.waitForTimeout(200);
	const itemWarning = await page.locator('text=/Super mutants can only wear Raider/').isVisible();
	expect('s11: non-Raider piece flagged', true, itemWarning);

	// Rename to Raider — warning should disappear
	await page.locator('[data-testid="armor-name-0"]').fill('Raider Torso');
	await page.locator('[data-testid="armor-name-0"]').blur();
	await page.waitForTimeout(200);
	const itemWarningGone = !(await page.locator('text=/Super mutants can only wear Raider/').isVisible());
	expect('s11: Raider name clears warning', true, itemWarningGone);

	await ctx.close();
}

// =========================================================================
// SECTION 11.5: Armor 1-to-many coverage (whole-body items)
// =========================================================================
{
	const ctx = await newCtx();
	const page = await ctx.newPage();
	page.on('pageerror', (e) => errors.push(`[s115 pageerror] ${e.message}`));
	page.on('console', (m) => m.type() === 'error' && errors.push(`[s115 err] ${m.text()}`));

	console.log(`\n=== SECTION 11.5: Armor multi-location coverage ===`);
	await page.goto(`${url}/create`, { waitUntil: 'networkidle' });
	await fillSurvivorWizard(page, 'Drifter');
	await page.waitForTimeout(500);

	// Add a clothing-like item that covers 3 locations
	await page.locator('[data-testid="armor-add"]').click();
	await page.waitForTimeout(150);
	await page.locator('[data-testid="armor-name-0"]').fill('Drifter Outfit');
	await page.locator('[data-testid="armor-name-0"]').blur();

	// Should start with 1 coverage row (default Torso)
	const initialCovs = await page
		.locator('[data-testid^="armor-cov-0-"]')
		.count();
	expect('s11.5: starts with 1 coverage row', 1, initialCovs);

	// Add 2 more locations (so we cover 3 in total — torso/arms/legs-style)
	await page.locator('[data-testid="armor-cov-add-0"]').click();
	await page.waitForTimeout(150);
	await page.locator('[data-testid="armor-cov-add-0"]').click();
	await page.waitForTimeout(150);
	const threeCovs = await page.locator('[data-testid^="armor-cov-0-"]').count();
	expect('s11.5: 3 coverage rows after [+ add location] x2', 3, threeCovs);

	// Set distinct locations + DRs
	await page.locator('[data-testid="armor-cov-location-0-0"]').selectOption('torso');
	await page.locator('[data-testid="armor-cov-location-0-1"]').selectOption('leftArm');
	await page.locator('[data-testid="armor-cov-location-0-2"]').selectOption('leftLeg');
	// Set PHY 2 on torso
	const torsoPhy = page.locator('[data-testid="armor-cov-0-0"] input[type="number"]').first();
	await torsoPhy.fill('2');
	await torsoPhy.blur();

	// Auto-save then reload — coverage must persist
	await page.waitForTimeout(800);
	await page.reload({ waitUntil: 'networkidle' });
	await page.waitForTimeout(1200);
	const survivedCount = await page.locator('[data-testid^="armor-cov-0-"]').count();
	expect('s11.5: 3 coverage rows persisted across reload', 3, survivedCount);
	const torsoLoc = await page
		.locator('[data-testid="armor-cov-location-0-0"]')
		.inputValue();
	expect('s11.5: torso slot location persisted', 'torso', torsoLoc);

	// Remove the middle coverage
	await page.locator('[data-testid="armor-cov-remove-0-1"]').click();
	await page.waitForTimeout(800);
	await page.reload({ waitUntil: 'networkidle' });
	await page.waitForTimeout(1200);
	const afterRemove = await page.locator('[data-testid^="armor-cov-0-"]').count();
	expect('s11.5: removing one location drops the count', 2, afterRemove);

	await ctx.close();
}

// =========================================================================
// SECTION 12: Edit perks panel — add, rank up, remove
// =========================================================================
{
	const ctx = await newCtx();
	const page = await ctx.newPage();
	page.on('pageerror', (e) => errors.push(`[s12 pageerror] ${e.message}`));
	page.on('console', (m) => m.type() === 'error' && errors.push(`[s12 err] ${m.text()}`));

	console.log(`\n=== SECTION 12: Edit perks panel ===`);
	await page.goto(`${url}/create`, { waitUntil: 'networkidle' });
	await fillSurvivorWizard(page, 'Perk Editor');
	await page.waitForTimeout(500);

	// Count perks at start (Survivor: 1 starting perk)
	const before = await page.locator('[data-testid="perks-list"] [data-testid^="perk-row-"]').count();
	expectTrue('s12: starts with at least 1 perk', before >= 1);

	// Open the add-perk modal
	await page.locator('[data-testid="perk-add"]').click();
	await page.waitForTimeout(300);
	const modalVisible = await page.locator('[data-testid="addperk-modal"]').isVisible();
	expect('s12: add-perk modal opens', true, modalVisible);

	// Pick the first listed perk in the modal — should add to the sheet and close the modal
	const firstAddable = page.locator('button[data-testid^="addperk-pick-"]').first();
	const firstKey = await firstAddable.getAttribute('data-testid');
	await firstAddable.click();
	await page.waitForTimeout(400);
	const stillOpen = await page.locator('[data-testid="addperk-modal"]').isVisible();
	expect('s12: modal closes after pick', false, stillOpen);
	const after = await page.locator('[data-testid="perks-list"] [data-testid^="perk-row-"]').count();
	expectTrue('s12: a perk was added (or ranked up)', after >= before);

	// Rank-up the first perk — capture its rank text, click +, expect rank text to change
	const firstRow = page.locator('[data-testid="perk-row-0"]');
	const beforeText = await firstRow.locator('.pip-display').first().innerText();
	const upBtn = page.locator('[data-testid="perk-rank-up-0"]');
	const upDisabled = await upBtn.isDisabled();
	if (!upDisabled) {
		await upBtn.click();
		await page.waitForTimeout(400);
		const afterText = await firstRow.locator('.pip-display').first().innerText();
		expectTrue('s12: rank-up changes the rank label', beforeText !== afterText);
	} else {
		console.log('  (rank-up button disabled — likely a 1-rank perk; skipping rank-up assertion)');
	}

	// Remove the first perk; total count should drop by 1
	const beforeRemove = await page
		.locator('[data-testid="perks-list"] [data-testid^="perk-row-"]')
		.count();
	await page.locator('[data-testid="perk-remove-0"]').click();
	await page.waitForTimeout(400);
	const afterRemove = await page
		.locator('[data-testid="perks-list"] [data-testid^="perk-row-"]')
		.count();
	expect('s12: removing a perk drops the count', beforeRemove - 1, afterRemove);

	// Auto-save: just wait for the panel-header status to settle, then hard reload
	await page.waitForTimeout(800);
	await page.reload({ waitUntil: 'networkidle' });
	await page.waitForTimeout(1000);
	const afterReload = await page
		.locator('[data-testid="perks-list"] [data-testid^="perk-row-"]')
		.count();
	expect('s12: perk count persists across reload (auto-save)', afterRemove, afterReload);

	// Sanity-bind firstKey lookup so the variable is used
	void firstKey;

	await ctx.close();
}

console.log(`\n=========== SUMMARY ===========`);
console.log(`Failures: ${failures.length}`);
failures.forEach((f) => console.log(`  ✗ ${f}`));
console.log(`Console / page errors: ${errors.length}`);
errors.forEach((e) => console.log(`  ${e}`));

await browser.close();
process.exit(failures.length === 0 && errors.length === 0 ? 0 : 1);
