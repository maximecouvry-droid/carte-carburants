import { expect, test } from '@playwright/test';

test('parcours principal : carte, carburant, slider, ville, fiche, volet', async ({ page }) => {
  await page.goto('./');

  // 1. La carte et les stations se chargent.
  const summary = page.locator('.summary');
  await expect(summary).toContainText(/\d+ stations? · dès/, { timeout: 60_000 });
  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();

  // 2. Changer de carburant.
  await page.getByRole('button', { name: /E10/ }).first().click();
  await page.getByRole('option', { name: 'Gazole' }).click();
  await expect(page.getByRole('button', { name: /Gazole/ }).first()).toBeVisible();
  await expect(page).toHaveURL(/f=Gazole/);

  // 3. Bouger le slider : la fourchette est filtrée, l'URL la garde.
  const low = page.getByLabel('Prix minimum');
  const high = page.getByLabel('Prix maximum');
  const max = Number(await high.getAttribute('max'));
  await high.focus();
  for (let i = 0; i < 30; i++) await page.keyboard.press('ArrowLeft'); // −0,30 €
  await expect(page).toHaveURL(/max=/);
  const hv = Number(await high.inputValue());
  expect(hv).toBeLessThan(max);
  expect(Number(await low.inputValue())).toBeLessThanOrEqual(hv);

  // 4. Rechercher une ville : la carte se recentre (zoom ~12).
  await page.getByRole('button', { name: 'Rechercher une ville' }).click();
  await page.getByLabel('Rechercher une ville').fill('Lyon');
  await page.getByRole('option', { name: /^Lyon/ }).first().click();
  await expect(page).toHaveURL(/z=1[12]\./, { timeout: 20_000 });

  // 5. Réinitialiser la fourchette si besoin, puis tirer le volet.
  const reset = page.getByRole('button', { name: 'Réinitialiser' });
  if (await reset.isVisible().catch(() => false)) await reset.click();
  const handle = page.getByRole('button', { name: /Volet des stations/ });
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y - 300, { steps: 8 });
  await page.mouse.up();
  await expect(handle).toHaveAttribute('aria-expanded', 'true');
  const sheetHeight = (await page.locator('.sheet').boundingBox())!.height;
  expect(sheetHeight).toBeGreaterThan(300);

  // 6. Ouvrir une fiche depuis la liste : tous les carburants et leur ancienneté.
  await page.locator('.row').first().click();
  const card = page.getByRole('dialog');
  await expect(card).toBeVisible();
  await expect(card.locator('li.hl')).toHaveCount(1); // carburant filtré mis en évidence
  await expect(card).toContainText(/il y a|à l'instant/);
  await card.getByRole('button', { name: 'Fermer la fiche' }).click();
  await expect(card).toBeHidden();
});

test('mini-app : manifeste, icônes et service worker', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.locator('link[rel=manifest]').getAttribute('href');
  expect(href).toBe('/carte-carburants/manifest.webmanifest');
  const manifest = await (await request.get(href!)).json();
  expect(manifest.display).toBe('standalone');
  for (const icon of manifest.icons) {
    const res = await request.get(new URL(icon.src, 'http://localhost:4173/carte-carburants/manifest.webmanifest').href);
    expect(res.status(), icon.src).toBe(200);
  }
  expect(await page.locator('link[rel=apple-touch-icon]').getAttribute('href')).toBe('/carte-carburants/icons/icon-180.png');
  await page.waitForFunction(() => navigator.serviceWorker.getRegistration().then((r) => !!r?.active), null, { timeout: 30_000 });
  const scope = await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r!.scope));
  expect(scope).toBe('http://localhost:4173/carte-carburants/');
});

test('hors ligne : la dernière copie s’affiche avec la mention « Hors ligne · prix du »', async ({ page, context }) => {
  await page.goto('./');
  await expect(page.locator('.summary')).toContainText(/stations?/, { timeout: 60_000 });
  await page.waitForFunction(() => navigator.serviceWorker.getRegistration().then((r) => !!r?.active));
  await page.reload(); // le SW contrôle maintenant la page et remplit le cache de données
  await expect(page.locator('.summary')).toContainText(/stations?/, { timeout: 60_000 });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.summary')).toContainText(/stations?/, { timeout: 60_000 });
  await expect(page.locator('.foot')).toContainText('Hors ligne · prix du');
});

test('erreur réseau : message et bouton « Réessayer »', async ({ page }) => {
  let fail = true;
  await page.route('**/data/stations.json', (route) => (fail ? route.abort() : route.continue()));
  await page.goto('./');
  await expect(page.getByRole('alert')).toContainText('Impossible de charger les prix');
  fail = false;
  await page.getByRole('button', { name: 'Réessayer' }).click();
  await expect(page.locator('.summary')).toContainText(/stations?/, { timeout: 60_000 });
  await expect(page.getByRole('alert')).toHaveCount(0);
});
