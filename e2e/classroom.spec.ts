import { expect, test, type Locator, type Page } from '@playwright/test';
import { ROOM_FRAME } from '../src/model/viewConfig';

let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    consoleErrors.push(error.message);
  });
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test.afterEach(() => {
  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
});

async function dragBy(page: Page, locator: Locator, dx: number, dy = 0) {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error('找不到可拖曳元素的位置');
  }
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx, startY + dy, { steps: 12 });
  await page.mouse.up();
}

async function setRange(page: Page, testId: string, value: number) {
  await page.getByTestId(testId).evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set;
    setter?.call(input, String(nextValue));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function setColor(page: Page, testId: string, value: string) {
  await page.getByTestId(testId).evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set;
    setter?.call(input, nextValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

function firstNumber(text: string | null): number {
  return Number(text?.match(/\d+/)?.[0] ?? Number.NaN);
}

test('首頁載入、雙模式入口與版面無溢出', async ({ page }) => {
  await expect(page).toHaveTitle('單點透視互動學習教室');
  await expect(
    page.getByRole('heading', { level: 1 }),
  ).toContainText('一個透視點');
  await expect(page.getByTestId('home-basic-entry')).toBeVisible();
  await expect(page.getByTestId('home-room-entry')).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: 'test-results/home.png', fullPage: true });
});

test('房間固定外框、透視點拖曳、任務、素材、復原與儲存', async ({
  page,
}) => {
  await page.getByTestId('home-room-entry').click();
  await expect(page.getByTestId('room-canvas')).toBeVisible();
  await page.screenshot({ path: 'test-results/room-initial.png' });

  const frame = page.getByTestId('room-outer-frame');
  await expect(frame).toHaveAttribute('x', String(ROOM_FRAME.left));
  await expect(frame).toHaveAttribute('y', String(ROOM_FRAME.top));
  await expect(frame).toHaveAttribute(
    'width',
    String(ROOM_FRAME.right - ROOM_FRAME.left),
  );
  await expect(frame).toHaveAttribute(
    'height',
    String(ROOM_FRAME.bottom - ROOM_FRAME.top),
  );

  const backWall = page.getByTestId('room-back-wall');
  const backPoints = await backWall.getAttribute('points');
  expect(backPoints?.split(' ').length).toBeGreaterThanOrEqual(4);

  const marker = page.getByTestId('room-vp-marker');
  await expect(marker).toHaveAttribute('data-vp-x', '500.00');
  const initialVpY = Number(await marker.getAttribute('data-vp-y'));
  await dragBy(page, marker, 90);
  await expect
    .poll(async () => Number(await marker.getAttribute('data-vp-x')))
    .toBeGreaterThan(560);
  await dragBy(page, marker, 0, -55);
  await expect
    .poll(async () => Number(await marker.getAttribute('data-vp-y')))
    .toBeLessThan(initialVpY - 35);

  await page.getByTestId('display-mode-guides').click();
  await expect(page.getByTestId('room-horizon')).toBeAttached();
  await expect(page.getByTestId('room-vp-marker')).toBeVisible();

  await page.getByTestId('open-lessons').click();
  await expect(page.getByTestId('task-find-vp')).toHaveAttribute(
    'data-done',
    'true',
  );
  await expect(page.getByTestId('task-move-vp')).toHaveAttribute(
    'data-done',
    'true',
  );
  await expect(page.getByTestId('task-floor-lines')).toHaveAttribute(
    'data-done',
    'true',
  );

  await page.getByTestId('asset-paintingLandscape').click();
  await expect(page.getByTestId('toast')).toContainText(
    /已加入橫向掛畫|任務完成/,
  );
  await page.getByTestId('wall-target-left').click();
  await page.getByTestId('asset-door').click();
  await page.getByTestId('wall-target-right').click();
  await page.getByTestId('asset-paintingPortrait').click();
  await page.getByTestId('category-furniture').click();
  await page.getByTestId('asset-table').click();

  await expect(page.locator('[data-testid^="room-wall-object-"]')).toHaveCount(
    3,
  );
  await expect(page.locator('[data-testid^="room-floor-object-"]')).toHaveCount(
    1,
  );

  await page.getByTestId('open-lessons').click();
  for (const taskId of [
    'back-painting',
    'left-door',
    'right-portrait',
    'floor-object',
  ]) {
    await expect(page.getByTestId(`task-${taskId}`)).toHaveAttribute(
      'data-done',
      'true',
    );
  }

  await page.getByTestId('undo').click();
  await expect(page.locator('[data-testid^="room-floor-object-"]')).toHaveCount(
    0,
  );
  await page.getByTestId('redo').click();
  await expect(page.locator('[data-testid^="room-floor-object-"]')).toHaveCount(
    1,
  );

  await page.getByRole('button', { name: '屬性與著色' }).click();
  await setColor(page, 'color-left', '#e85d4a');
  await setColor(page, 'color-back', '#78a98e');
  await setColor(page, 'color-right', '#d6a84f');
  await page.getByTestId('display-mode-color').click();
  await page.getByTestId('open-lessons').click();
  await expect(page.getByTestId('task-color-room')).toHaveAttribute(
    'data-done',
    'true',
  );
  await expect(page.getByTestId('open-lessons')).toContainText('8/8');

  await page.getByTestId('save').click();
  await expect(page.getByTestId('toast')).toContainText('作品已儲存');
  await page.reload();
  await page.getByTestId('home-room-entry').click();
  await expect(page.locator('[data-testid^="room-wall-object-"]')).toHaveCount(
    3,
  );
  await expect(page.locator('[data-testid^="room-floor-object-"]')).toHaveCount(
    1,
  );
  await page.getByTestId('open-lessons').click();
  await expect(page.getByTestId('open-lessons')).toContainText('8/8');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-json').click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.json$/);

  const [pngDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-png').click(),
  ]);
  expect(pngDownload.suggestedFilename()).toMatch(/\.png$/);

  await page.screenshot({
    path: 'test-results/room.png',
    fullPage: true,
  });
});

test('基礎模式：深度改變投影大小、新增物件與拖曳透視點', async ({
  page,
}) => {
  await page.getByTestId('home-basic-entry').click();
  await expect(page.getByTestId('basic-canvas')).toBeVisible();
  await expect(
    page.locator('g[data-testid^="basic-object-"]'),
  ).toHaveCount(3);

  const xSlider = page.getByTestId('basic-object-x');
  await expect(xSlider).toHaveAttribute('max', '3.85');
  await setRange(page, 'basic-object-x', 3.5);
  await expect(xSlider).toHaveValue('3.5');
  await setRange(page, 'basic-object-x', -1.6);

  await page.screenshot({ path: 'test-results/basic-initial.png' });

  const sizeBefore = firstNumber(
    await page.getByTestId('basic-projected-size').textContent(),
  );
  await setRange(page, 'basic-object-z', 16);
  await expect
    .poll(async () =>
      firstNumber(
        await page.getByTestId('basic-projected-size').textContent(),
      ),
    )
    .toBeLessThan(sizeBefore);

  await page.getByTestId('basic-add-cube').click();
  await expect(
    page.locator('g[data-testid^="basic-object-"]'),
  ).toHaveCount(4);

  const grid = page.getByTestId('basic-guide-grid');
  await expect(grid).toBeChecked();
  await grid.uncheck();
  await expect(grid).not.toBeChecked();

  const marker = page.getByTestId('basic-vp-marker');
  const initialVpY = Number(await marker.getAttribute('data-vp-y'));
  await dragBy(page, marker, -70);
  await expect
    .poll(async () => Number(await marker.getAttribute('data-vp-x')))
    .toBeLessThan(440);
  await dragBy(page, marker, 0, 55);
  await expect
    .poll(async () => Number(await marker.getAttribute('data-vp-y')))
    .toBeGreaterThan(initialVpY + 35);

  await page.getByTestId('basic-add-road').click();
  await page.getByTestId('basic-add-car').click();
  await page.getByTestId('basic-add-house').click();
  await expect(
    page.locator(
      'g[data-testid^="basic-object-"][data-object-type="road"]',
    ),
  ).toHaveCount(1);
  await expect(
    page.locator(
      'g[data-testid^="basic-object-"][data-object-type="car"]',
    ),
  ).toHaveCount(1);
  await expect(
    page.locator(
      'g[data-testid^="basic-object-"][data-object-type="house"]',
    ),
  ).toHaveCount(1);
  await expect(
    page.locator('g[data-testid^="basic-object-"]'),
  ).toHaveCount(7);

  await page.getByTestId('basic-reset-vp').click();
  await expect(marker).toHaveAttribute('data-vp-x', '500.00');
  await expect(marker).toHaveAttribute('data-vp-y', '350.00');

  await page.screenshot({
    path: 'test-results/basic-road-scene.png',
    fullPage: true,
  });

  await page.screenshot({
    path: 'test-results/basic.png',
    fullPage: true,
  });
});

test('平板與手機寬度可操作且不水平溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('home-room-entry')).toBeVisible();
  await page.getByTestId('home-room-entry').click();
  await expect(page.getByTestId('room-canvas')).toBeVisible();
  await expect(page.getByTestId('asset-paintingLandscape')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBe(0);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: 'test-results/mobile-room.png',
  });
});
