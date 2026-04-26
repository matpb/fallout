import { chromium } from 'playwright';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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

function newCtx() {
	return browser.newContext({ acceptDownloads: true });
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
// SECTION 2: Create flow
// =========================================================================
let createdSheetUrl;
{
	const ctx = await newCtx();
	const page = await ctx.newPage();
	page.on('pageerror', (e) => errors.push(`[s2 pageerror] ${e.message}`));
	page.on('console', (m) => m.type() === 'error' && errors.push(`[s2 err] ${m.text()}`));

	console.log(`\n=== SECTION 2: Create wizard ===`);
	await page.goto(`${url}/create`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(400);

	await page.locator('.pip-input').first().fill('Sole Survivor');
	await page.locator('button:has-text("Brotherhood Initiate")').first().click();
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);

	// SPECIAL — STR +3, END +2
	const plus = await page.locator('button.pip-btn:has-text("+")').all();
	for (let i = 0; i < 3; i++) await plus[0].click();
	for (let i = 0; i < 2; i++) await plus[2].click();
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);

	// Tag 4, spend skill points
	const tags = await page.locator('button[title="Click to toggle Tag"]').all();
	for (let i = 0; i < 4; i++) await tags[i].click();
	const skillPlus = await page.locator('div:has(button[title="Click to toggle Tag"]) >> button.pip-btn:has-text("+")').all();
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
// SECTION 3: Edit fields + save + HARD RELOAD persistence
// =========================================================================
{
	const ctx = await newCtx();
	const page = await ctx.newPage();
	page.on('pageerror', (e) => errors.push(`[s3 pageerror] ${e.message}`));
	page.on('console', (m) => m.type() === 'error' && errors.push(`[s3 err] ${m.text()}`));

	console.log(`\n=== SECTION 3: Edit + Save + Reload persistence ===`);

	// Use createdSheetUrl from section 2 (different ctx but same shared browser process, IndexedDB IS per-context — so create again here)
	await page.goto(`${url}/create`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(400);
	await page.locator('.pip-input').first().fill('Persist Tester');
	await page.locator('button:has-text("Survivor")').first().click();
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);
	const plus3 = await page.locator('button.pip-btn:has-text("+")').all();
	for (let i = 0; i < 5; i++) await plus3[0].click();
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);

	// Survivor needs 2 traits
	const traits = await page.locator('button:has-text("Educated"), button:has-text("Heavy Handed")').all();
	if (traits.length >= 2) {
		await page.locator('button:has-text("Educated")').click();
		await page.locator('button:has-text("Heavy Handed")').click();
	}
	const tags3 = await page.locator('button[title="Click to toggle Tag"]').all();
	for (let i = 0; i < 4; i++) await tags3[i].click();
	const skillPlus3 = await page.locator('div:has(button[title="Click to toggle Tag"]) >> button.pip-btn:has-text("+")').all();
	let s3 = 0;
	for (let a = 0; a < 60 && s3 < 14; a++) {
		for (const btn of skillPlus3) {
			if (await btn.isDisabled()) continue;
			await btn.click();
			s3++;
			if (s3 >= 14) break;
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

	const sheetUrl = page.url();
	expect('s3: created character', true, sheetUrl.includes('/character/'));

	// Now edit every editable field
	console.log(`  editing fields...`);

	// Name (button → input)
	await page.locator('[data-testid="name-display"]').click();
	await page.locator('[data-testid="name-input"]').fill('EDITED Name');
	await page.keyboard.press('Enter');
	await page.waitForTimeout(100);

	// Numeric fields — use fill + blur (number inputs need blur to commit)
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

	// Inventory
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

	// Save
	await page.locator('[data-testid="save-btn"]').click();
	await page.waitForTimeout(1500);

	// HARD RELOAD
	console.log(`  hard-reloading...`);
	await page.reload({ waitUntil: 'networkidle' });
	await page.waitForTimeout(1500);

	// Verify each edit
	expect('reload: name persisted', 'EDITED Name', await page.locator('[data-testid="name-display"]').innerText().catch(() => '?'));
	expect('reload: level persisted', '5', await page.locator('[data-testid="level-input"]').inputValue().catch(() => '?'));
	expect('reload: xp persisted', '1234', await page.locator('[data-testid="xp-input"]').inputValue().catch(() => '?'));
	expect('reload: hp persisted', '3', await page.locator('[data-testid="hp-input"]').inputValue().catch(() => '?'));
	expect('reload: luck persisted', '2', await page.locator('[data-testid="luck-input"]').inputValue().catch(() => '?'));
	expect('reload: caps persisted', '999', await page.locator('[data-testid="caps-input"]').inputValue().catch(() => '?'));
	expect('reload: trinket persisted', 'UPDATED Trinket', await page.locator('[data-testid="trinket-input"]').inputValue().catch(() => '?'));
	expect('reload: notes persisted', 'Notes that should persist', await page.locator('[data-testid="notes-input"]').inputValue().catch(() => '?'));
	expect('reload: inv item 0 name', 'Combat Knife', await page.locator('[data-testid="inv-name-0"]').inputValue().catch(() => '?'));
	expect('reload: inv item 0 qty', '1', await page.locator('[data-testid="inv-qty-0"]').inputValue().catch(() => '?'));
	expect('reload: inv item 0 weight', '1.5', await page.locator('[data-testid="inv-weight-0"]').inputValue().catch(() => '?'));
	expect('reload: inv item 0 notes', 'Sharp', await page.locator('[data-testid="inv-notes-0"]').inputValue().catch(() => '?'));
	expect('reload: inv item 1 name', 'Stimpak', await page.locator('[data-testid="inv-name-1"]').inputValue().catch(() => '?'));
	expect('reload: inv item 1 qty', '3', await page.locator('[data-testid="inv-qty-1"]').inputValue().catch(() => '?'));

	// Remove inventory item, save, reload
	console.log(`  removing inv item 0...`);
	await page.locator('[data-testid="inv-remove-0"]').click();
	await page.waitForTimeout(100);
	await page.locator('[data-testid="save-btn"]').click();
	await page.waitForTimeout(1500);
	await page.reload({ waitUntil: 'networkidle' });
	await page.waitForTimeout(1500);
	const remainingName = await page.locator('[data-testid="inv-name-0"]').inputValue().catch(() => '?');
	expect('reload after remove: only Stimpak left', 'Stimpak', remainingName);
	const inv1 = await page.locator('[data-testid="inv-name-1"]').count();
	expect('reload after remove: no second row', 0, inv1);

	// Roster shows updated character
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

	// Create one character
	await page.goto(`${url}/create`, { waitUntil: 'networkidle' });
	await page.locator('.pip-input').first().fill('Backup Subject');
	await page.locator('button:has-text("Survivor")').first().click();
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);
	const p4 = await page.locator('button.pip-btn:has-text("+")').all();
	for (let i = 0; i < 5; i++) await p4[0].click();
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);
	await page.locator('button:has-text("Educated")').click();
	await page.locator('button:has-text("Heavy Handed")').click();
	const tg4 = await page.locator('button[title="Click to toggle Tag"]').all();
	for (let i = 0; i < 4; i++) await tg4[i].click();
	const sp4 = await page.locator('div:has(button[title="Click to toggle Tag"]) >> button.pip-btn:has-text("+")').all();
	let c4 = 0;
	for (let a = 0; a < 60 && c4 < 14; a++) {
		for (const btn of sp4) {
			if (await btn.isDisabled()) continue;
			await btn.click();
			c4++;
			if (c4 >= 14) break;
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

	// Go to settings, download backup
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
	console.log(`  saved backup to ${backupPath}`);
	const backupContent = await import('node:fs').then((fs) => fs.readFileSync(backupPath, 'utf8'));
	const hasSubject = backupContent.includes('Backup Subject');
	expect('backup file contains the character', true, hasSubject);

	// Wipe
	page.once('dialog', async (d) => await d.accept());
	await page.locator('button:has-text("Wipe all characters")').click();
	await page.waitForTimeout(1000);
	await page.goto(url, { waitUntil: 'networkidle' });
	await page.waitForTimeout(800);
	const wiped = (await page.locator('main').innerText()).includes('No characters in local storage');
	expect('wipe cleared roster', true, wiped);

	// Restore
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
	await page.locator('.pip-input').first().fill('To Be Deleted');
	await page.locator('button:has-text("Survivor")').first().click();
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);
	const p5 = await page.locator('button.pip-btn:has-text("+")').all();
	for (let i = 0; i < 5; i++) await p5[0].click();
	await page.locator('button:has-text("Next ›")').click();
	await page.waitForTimeout(200);
	await page.locator('button:has-text("Educated")').click();
	await page.locator('button:has-text("Heavy Handed")').click();
	const tg5 = await page.locator('button[title="Click to toggle Tag"]').all();
	for (let i = 0; i < 4; i++) await tg5[i].click();
	const sp5 = await page.locator('div:has(button[title="Click to toggle Tag"]) >> button.pip-btn:has-text("+")').all();
	let c5 = 0;
	for (let a = 0; a < 60 && c5 < 14; a++) {
		for (const btn of sp5) {
			if (await btn.isDisabled()) continue;
			await btn.click();
			c5++;
			if (c5 >= 14) break;
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

	page.once('dialog', async (d) => await d.accept());
	await page.locator('[data-testid="delete-btn"]').click();
	await page.waitForTimeout(1500);
	const finalUrl = page.url();
	expect('delete navigates back to roster', true, finalUrl === url + '/' || finalUrl === url);
	const wiped = (await page.locator('main').innerText()).includes('No characters in local storage');
	expect('character deleted from roster', true, wiped);
	await ctx.close();
}

console.log(`\n=========== SUMMARY ===========`);
console.log(`Failures: ${failures.length}`);
failures.forEach((f) => console.log(`  ✗ ${f}`));
console.log(`Console / page errors: ${errors.length}`);
errors.forEach((e) => console.log(`  ${e}`));

await browser.close();
process.exit(failures.length === 0 && errors.length === 0 ? 0 : 1);
