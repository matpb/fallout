// Visual-inspection harness — produces screenshots of every new UI surface
// so they can be reviewed for layout, styling, and Pip-Boy theming.
// Output goes to /tmp/fallout-shots/ as PNGs.

import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'node:fs';

const url = process.argv[2] || 'http://localhost:4173';
const outDir = process.argv[3] || '/tmp/fallout-shots';

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
	viewport: { width: 1280, height: 900 },
	acceptDownloads: false
});
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
page.on('console', (m) => m.type() === 'error' && console.error('CONSOLE ERROR:', m.text()));

async function shot(name) {
	const path = `${outDir}/${name}.png`;
	await page.screenshot({ path, fullPage: true });
	console.log(`  📸 ${path}`);
}

async function clickByText(text, idx = 0) {
	const els = await page.locator(`button:has-text("${text}")`).all();
	await els[idx].click();
}

async function spendSpecial(amount, indexOffset = 0) {
	const plus = await page.locator('button.pip-btn:has-text("+")').all();
	for (let i = 0; i < amount; i++) await plus[indexOffset].click();
}

// Pick a perk by clicking the first ENABLED perk button. Returns true if a perk was actually selected.
async function pickFirstAvailablePerk() {
	// Wait for at least one enabled perk button to be present.
	await page.waitForSelector('button:not([disabled]):has(.pip-display)', { timeout: 5000 });
	const buttons = await page.locator('button:has(.pip-display)').all();
	for (const b of buttons) {
		if (await b.isDisabled()) continue;
		await b.click();
		// Verify selection registered ("Currently chosen" line updates)
		await page.waitForTimeout(150);
		const chosenLine = await page.locator('text=/Currently chosen:/').innerText().catch(() => '');
		if (!chosenLine.includes('— none —')) return true;
	}
	return false;
}

async function clickNext() {
	const next = page.locator('button.pip-btn:has-text("Next")').first();
	await next.waitFor({ state: 'visible', timeout: 5000 });
	await next.click();
	await page.waitForTimeout(350);
}

async function fillSurvivorWizardFast(name) {
	await page.goto(`${url}/create`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(300);
	await page.locator('.pip-input').first().fill(name);
	await page.locator('[data-testid="origin-survivor"]').click();
	await clickNext();
	await spendSpecial(5, 0);
	await clickNext();
	await clickByText('Educated');
	await clickByText('Heavy Handed');
	const tags = await page.locator('button[title="Click to toggle Tag"]').all();
	for (let i = 0; i < 4; i++) await tags[i].click();
	const sp = await page
		.locator('div:has(button[title="Click to toggle Tag"]) >> button.pip-btn:has-text("+")')
		.all();
	let s = 0;
	for (let a = 0; a < 80 && s < 14; a++) {
		for (const b of sp) {
			if (await b.isDisabled()) continue;
			await b.click();
			s++;
			if (s >= 14) break;
		}
	}
	await clickNext();
	await pickFirstAvailablePerk();
	await clickNext();
	await clickNext();
	await page.locator('button:has-text("Save Character")').click();
	await page.waitForTimeout(1500);
}

// ============================================================
// 1. Roster (empty)
// ============================================================
console.log('=== roster (empty) ===');
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await shot('01-roster-empty');

// ============================================================
// 2. Create step 1 — origin grid + default Mr Handy variant picker
// ============================================================
console.log('=== create step 1 — default Survivor ===');
await page.goto(`${url}/create`, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
await page.locator('.pip-input').first().fill('Test Subject');
await shot('02-create-step1-survivor');

console.log('=== create step 1 — Mr Handy variant picker ===');
await page.locator('[data-testid="origin-misterHandy"]').click();
await page.waitForTimeout(300);
await shot('03-create-step1-misterhandy');

// Switch variant to Gutsy
await page.locator('[data-testid="handy-variant-misterGutsy"]').click();
await page.waitForTimeout(200);
await shot('04-create-step1-mistergutsy-selected');

// ============================================================
// 3. Create step 3 — survivor toggle + survivor traits + skill points
// ============================================================
console.log('=== create step 3 — survivor path toggle ===');
await page.goto(`${url}/create`, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
await page.locator('.pip-input').first().fill('Path Tester');
await page.locator('[data-testid="origin-survivor"]').click();
await clickByText('Next');
await page.waitForTimeout(200);
await spendSpecial(5, 0);
await clickByText('Next');
await page.waitForTimeout(300);
await shot('05-create-step3-survivor-default');

// Toggle to "1 trait + extra perk"
await page.locator('[data-testid="survivor-path-perk"]').click();
await page.waitForTimeout(200);
await shot('06-create-step3-survivor-perkmode');

// ============================================================
// 4. Create step 3 — Mr Handy skills with no-pincer blocks (use Gutsy)
// ============================================================
console.log('=== create step 3 — Mr Gutsy skills (no pincer) ===');
await page.goto(`${url}/create`, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
await page.locator('.pip-input').first().fill('Gutsy');
await page.locator('[data-testid="origin-misterHandy"]').click();
await page.waitForTimeout(200);
await page.locator('[data-testid="handy-variant-misterGutsy"]').click();
await page.waitForTimeout(200);
await clickByText('Next');
await page.waitForTimeout(200);
await spendSpecial(5, 0);
await clickByText('Next');
await page.waitForTimeout(300);
await shot('07-create-step3-mistergutsy-skills-blocked');

// ============================================================
// 5. Create step 4 — perk picker (default Survivor — verifies hover/filter chrome)
// ============================================================
console.log('=== create step 4 — perk picker ===');
await page.goto(`${url}/create`, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
await page.locator('.pip-input').first().fill('Perk Tester');
await page.locator('[data-testid="origin-survivor"]').click();
await clickNext();
await spendSpecial(5, 0);
await clickNext();
await clickByText('Educated');
await clickByText('Heavy Handed');
const t = await page.locator('button[title="Click to toggle Tag"]').all();
for (let i = 0; i < 4; i++) await t[i].click();
const sp = await page
	.locator('div:has(button[title="Click to toggle Tag"]) >> button.pip-btn:has-text("+")')
	.all();
let s = 0;
for (let a = 0; a < 80 && s < 14; a++) {
	for (const b of sp) {
		if (await b.isDisabled()) continue;
		await b.click();
		s++;
		if (s >= 14) break;
	}
}
await clickNext();
await shot('08-create-step4-perks');

// ============================================================
// 6. Create step 5 — Vault Dweller — vault details fields shown
// ============================================================
console.log('=== create step 5 — Vault Dweller details ===');
await page.goto(`${url}/create`, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
await page.locator('.pip-input').first().fill('Vault Kid');
await page.locator('[data-testid="origin-vaultDweller"]').click();
await clickNext();
await spendSpecial(5, 0);
await clickNext();
const tv = await page.locator('button[title="Click to toggle Tag"]').all();
for (let i = 0; i < 4; i++) await tv[i].click();
const spv = await page
	.locator('div:has(button[title="Click to toggle Tag"]) >> button.pip-btn:has-text("+")')
	.all();
let sv = 0;
for (let a = 0; a < 80 && sv < 14; a++) {
	for (const b of spv) {
		if (await b.isDisabled()) continue;
		await b.click();
		sv++;
		if (sv >= 14) break;
	}
}
await clickNext();
await pickFirstAvailablePerk();
await clickNext();
await shot('09-create-step5-vault');

// Fill in vault details
await page.locator('[data-testid="vault-number-input"]').fill('111');
await page.locator('[data-testid="vault-experiment-input"]').fill('Cryogenic stasis');
await page.waitForTimeout(200);
await shot('10-create-step5-vault-filled');

// ============================================================
// 7. Sheet — Survivor with weapons, armor, level-up button, etc.
// ============================================================
console.log('=== sheet — survivor with gear ===');
await fillSurvivorWizardFast('Sheet Demo');
await page.waitForTimeout(500);
await shot('11-sheet-survivor-bare');

// Add weapon + armor
await page.locator('[data-testid="weapon-add"]').click();
await page.waitForTimeout(100);
await page.locator('[data-testid="weapon-name-0"]').fill('10mm Pistol');
await page.locator('[data-testid="weapon-name-0"]').blur();
// Set damage CD 3, type physical, skill smallGuns (default), range M, qty 1
const w0 = page.locator('[data-testid="weapon-row-0"]');
await w0.locator('input[type="number"]').nth(0).fill('3'); // CD
await w0.locator('input[type="number"]').nth(0).blur();
await page.locator('[data-testid="armor-add"]').click();
await page.waitForTimeout(100);
await page.locator('[data-testid="armor-name-0"]').fill('Leather Torso');
await page.locator('[data-testid="armor-name-0"]').blur();
// Set physical DR 2
const a0 = page.locator('[data-testid="armor-row-0"]');
await a0.locator('input[type="number"]').nth(0).fill('2'); // physical
await a0.locator('input[type="number"]').nth(0).blur();
await page.waitForTimeout(200);
await shot('12-sheet-survivor-with-gear');

// Open armor matrix details
await page.locator('summary:has-text("Total DR by location")').click();
await page.waitForTimeout(200);
await shot('13-sheet-armor-dr-matrix');

// Bump XP to 100, screenshot, then open level up modal
await page.locator('[data-testid="xp-input"]').fill('100');
await page.locator('[data-testid="xp-input"]').blur();
await page.waitForTimeout(200);
await shot('14-sheet-ready-to-level');
await page.locator('[data-testid="levelup-btn"]').click();
await page.waitForTimeout(300);
await shot('15-sheet-levelup-modal');
await page.locator('[data-testid="levelup-skill-speech"]').click();
await page.locator('button[data-testid^="levelup-perk-"]').first().click();
await page.waitForTimeout(200);
await shot('16-sheet-levelup-modal-selected');
await page.locator('[data-testid="levelup-close"]').click();
await page.waitForTimeout(200);

// ============================================================
// 8. Sheet — Mister Gutsy (no pincer) chassis panel
// ============================================================
console.log('=== sheet — mister gutsy chassis ===');
await page.goto(`${url}/create`, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
await page.locator('.pip-input').first().fill('Gutsy McShootface');
await page.locator('[data-testid="origin-misterHandy"]').click();
await page.locator('[data-testid="handy-variant-misterGutsy"]').click();
await page.waitForTimeout(200);
await clickNext();
await spendSpecial(5, 0);
await clickNext();
const tg = await page.locator('button[title="Click to toggle Tag"]').all();
let tagged = 0;
for (const x of tg) {
	if (await x.isDisabled()) continue;
	await x.click();
	tagged++;
	if (tagged >= 3) break;
}
const spg = await page
	.locator('div:has(button[title="Click to toggle Tag"]) >> button.pip-btn:has-text("+")')
	.all();
let sg = 0;
for (let a = 0; a < 80 && sg < 14; a++) {
	for (const b of spg) {
		if (await b.isDisabled()) continue;
		await b.click();
		sg++;
		if (sg >= 14) break;
	}
}
await clickNext();
await pickFirstAvailablePerk();
await clickNext();
await clickNext();
await page.locator('button:has-text("Save Character")').click();
await page.waitForTimeout(1500);
await shot('17-sheet-mistergutsy');

// ============================================================
// 9. Sheet — Super Mutant warning
// ============================================================
console.log('=== sheet — super mutant with non-Raider armor ===');
await page.goto(`${url}/create`, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
await page.locator('.pip-input').first().fill('Strong');
await page.locator('[data-testid="origin-superMutant"]').click();
await clickNext();
await spendSpecial(5, 0);
await clickNext();
const ts = await page.locator('button[title="Click to toggle Tag"]').all();
for (let i = 0; i < 3; i++) await ts[i].click();
const sps = await page
	.locator('div:has(button[title="Click to toggle Tag"]) >> button.pip-btn:has-text("+")')
	.all();
let ss = 0;
for (let a = 0; a < 80 && ss < 14; a++) {
	for (const b of sps) {
		if (await b.isDisabled()) continue;
		await b.click();
		ss++;
		if (ss >= 14) break;
	}
}
await clickNext();
await pickFirstAvailablePerk();
await clickNext();
await clickNext();
await page.locator('button:has-text("Save Character")').click();
await page.waitForTimeout(1500);
await page.locator('[data-testid="armor-add"]').click();
await page.waitForTimeout(100);
await page.locator('[data-testid="armor-name-0"]').fill('Combat Helmet');
await page.locator('[data-testid="armor-name-0"]').blur();
await page.waitForTimeout(200);
await shot('18-sheet-supermutant-nonraider-warning');

// ============================================================
// 10. Roster — populated
// ============================================================
console.log('=== roster populated ===');
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await shot('19-roster-populated');

console.log('\nDONE. Screenshots written to', outDir);
await browser.close();
