// Close-up shots of weapons + armor + handy + level-up modal regions.
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4173';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1600 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));

async function clickNext() {
	const next = page.locator('button.pip-btn:has-text("Next")').first();
	await next.waitFor({ state: 'visible', timeout: 5000 });
	await next.click();
	await page.waitForTimeout(350);
}

async function pickFirstAvailablePerk() {
	await page.waitForSelector('button:not([disabled]):has(.pip-display)', { timeout: 5000 });
	const buttons = await page.locator('button:has(.pip-display)').all();
	for (const b of buttons) {
		if (await b.isDisabled()) continue;
		await b.click();
		await page.waitForTimeout(150);
		const chosenLine = await page.locator('text=/Currently chosen:/').innerText().catch(() => '');
		if (!chosenLine.includes('— none —')) return true;
	}
	return false;
}

async function spendSpecial(amount) {
	const plus = await page.locator('button.pip-btn:has-text("+")').all();
	for (let i = 0; i < amount; i++) await plus[0].click();
}

async function createSurvivor(name) {
	await page.goto(`${url}/create`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(300);
	await page.locator('.pip-input').first().fill(name);
	await page.locator('[data-testid="origin-survivor"]').click();
	await clickNext();
	await spendSpecial(5);
	await clickNext();
	await page.locator('button:has-text("Educated")').click();
	await page.locator('button:has-text("Heavy Handed")').click();
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

await createSurvivor('Closeup Demo');

// Add weapons + armor for shots
await page.locator('[data-testid="weapon-add"]').click();
await page.waitForTimeout(150);
await page.locator('[data-testid="weapon-name-0"]').fill('10mm Pistol');
await page.locator('[data-testid="weapon-name-0"]').blur();
const w0 = page.locator('[data-testid="weapon-row-0"]');
await w0.locator('input[type="number"]').nth(0).fill('3');
await w0.locator('input[type="number"]').nth(0).blur();

await page.locator('[data-testid="armor-add"]').click();
await page.waitForTimeout(150);
await page.locator('[data-testid="armor-name-0"]').fill('Leather Torso');
await page.locator('[data-testid="armor-name-0"]').blur();
const a0 = page.locator('[data-testid="armor-row-0"]');
await a0.locator('input[type="number"]').nth(0).fill('2');
await a0.locator('input[type="number"]').nth(0).blur();
await page.locator('[data-testid="armor-add"]').click();
await page.waitForTimeout(150);
await page.locator('[data-testid="armor-name-1"]').fill('Leather Helmet');
await page.locator('[data-testid="armor-name-1"]').blur();
const a1 = page.locator('[data-testid="armor-row-1"]');
await a1.locator('input[type="number"]').nth(0).fill('1');
await a1.locator('input[type="number"]').nth(0).blur();
await a1.locator('select').first().selectOption('head');
await page.waitForTimeout(200);

const weapons = page.locator('section:has(.pip-panel-header:has-text("WEAPONS"))');
await weapons.scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
await weapons.screenshot({ path: '/tmp/fallout-shots/zoom-weapons.png' });
console.log('📸 zoom-weapons.png');

const armor = page.locator('section:has(.pip-panel-header:has-text("ARMOR"))');
await armor.scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
await armor.screenshot({ path: '/tmp/fallout-shots/zoom-armor.png' });
console.log('📸 zoom-armor.png');

await page.locator('summary:has-text("Total DR by location")').click();
await page.waitForTimeout(200);
await armor.screenshot({ path: '/tmp/fallout-shots/zoom-armor-with-matrix.png' });
console.log('📸 zoom-armor-with-matrix.png');

// Level-up modal — bump XP and open
await page.locator('[data-testid="xp-input"]').scrollIntoViewIfNeeded();
await page.locator('[data-testid="xp-input"]').fill('100');
await page.locator('[data-testid="xp-input"]').blur();
await page.waitForTimeout(200);
await page.locator('[data-testid="levelup-btn"]').click();
await page.waitForTimeout(400);
const modal = page.locator('[data-testid="levelup-modal"]');
await modal.screenshot({ path: '/tmp/fallout-shots/zoom-levelup-modal.png' });
console.log('📸 zoom-levelup-modal.png');
await page.locator('[data-testid="levelup-skill-speech"]').click();
await page.locator('button[data-testid^="levelup-perk-"]').first().click();
await page.waitForTimeout(200);
await modal.screenshot({ path: '/tmp/fallout-shots/zoom-levelup-modal-selected.png' });
console.log('📸 zoom-levelup-modal-selected.png');
await page.locator('[data-testid="levelup-close"]').click();
await page.waitForTimeout(200);

// Create a Mr Gutsy in a fresh wizard to get the handy panel screenshot
await page.goto(`${url}/create`, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
await page.locator('.pip-input').first().fill('Closeup Gutsy');
await page.locator('[data-testid="origin-misterHandy"]').click();
await page.locator('[data-testid="handy-variant-misterGutsy"]').click();
await page.waitForTimeout(200);
await clickNext();
await spendSpecial(5);
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

const handy = page.locator('[data-testid="handy-panel"]');
await handy.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await handy.screenshot({ path: '/tmp/fallout-shots/zoom-handy-panel.png' });
console.log('📸 zoom-handy-panel.png');

await browser.close();
