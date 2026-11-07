import { test, expect, type Page } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";
const shelf = (page: Page) =>
  page.getByRole("complementary", {
    name: "Home medicine gallery",
    exact: true,
  });
const openHome = async (page: Page) => {
  await page.goto("/");
  await expect(shelf(page).locator(".gallery-medicine-card")).toBeVisible();
};
test("Home page shows classic medicine imagery without login or private inventory requests", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const privateRequests: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/\/api\/(products|batches|invoices|customers|dashboard)/.test(r.url()))
      privateRequests.push(r.url());
  });
  await openHome(page);
  const gallery = shelf(page);
  const photo = gallery.getByRole("img", { name: /unbranded silver blister/ });
  await expect(photo).toBeVisible();
  await expect
    .poll(() =>
      photo.evaluate(
        (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
      ),
    )
    .toBeTruthy();
  await expect(
    gallery.getByText("AI-generated illustration", { exact: true }),
  ).toBeVisible();
  await expect(
    gallery.locator(".gallery-price,.gallery-availability"),
  ).toHaveCount(0);
  const main = await page.locator(".public-main-content").boundingBox(),
    panel = await gallery.boundingBox();
  expect(main!.x + main!.width).toBeLessThanOrEqual(panel!.x);
  const y = panel!.y;
  await page.evaluate(() => window.scrollTo(0, 350));
  expect((await gallery.boundingBox())!.y).toBeCloseTo(y, 0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: join(tmpdir(), "smartmed-home-gallery-desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
  expect(privateRequests).toEqual([]);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
test("public gallery navigation, enlarged pictures, minimize, close and reopen persist independently", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHome(page);
  const gallery = shelf(page);
  await expect(gallery.locator(".gallery-position")).toHaveText("1 / 3");
  await gallery
    .getByRole("button", { name: "Next public medicine picture" })
    .click();
  await expect(gallery.locator(".gallery-product-details h3")).toHaveText(
    "Bottles & liquids",
  );
  const photo = gallery.getByRole("img", { name: /amber medicine bottle/ });
  await expect(photo).toBeVisible();
  await gallery
    .getByRole("button", { name: "Enlarge Bottles & liquids picture" })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("img", { name: /amber medicine bottle/ }),
  ).toBeVisible();
  await expect(gallery).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(
    gallery.getByRole("button", { name: "Enlarge Bottles & liquids picture" }),
  ).toBeFocused();
  await gallery
    .getByRole("region", { name: "Public medicine pictures" })
    .focus();
  await page.keyboard.press("End");
  await expect(gallery.locator(".gallery-position")).toHaveText("3 / 3");
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await expect(gallery.locator(".gallery-position")).toHaveText("2 / 3");
  await gallery
    .getByRole("button", { name: "Previous public medicine picture" })
    .click();
  await expect(gallery.locator(".gallery-position")).toHaveText("1 / 3");
  await gallery
    .getByRole("button", { name: "Minimize home medicine gallery" })
    .click();
  await expect(
    gallery.getByRole("button", { name: "Expand home medicine gallery" }),
  ).toBeFocused();
  await gallery
    .getByRole("button", { name: "Close home medicine gallery" })
    .click();
  await expect(gallery).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Show home medicine gallery" }),
  ).toBeFocused();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Complete pharmacy/ }),
  ).toBeVisible();
  await expect(gallery).toHaveCount(0);
  await page
    .getByRole("button", { name: "Show home medicine gallery" })
    .click();
  await expect(gallery.locator(".gallery-medicine-card")).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("smartmed:home-gallery:v1")),
  ).toBe("expanded");
  await page
    .getByRole("button", { name: "Pricing", exact: true })
    .first()
    .click();
  await expect(gallery).toHaveCount(0);
  await page.locator(".public-nav .brand").click();
  await expect(gallery).toBeVisible();
});
test("public autoplay pauses during interaction and obeys reduced motion", async ({
  page,
}) => {
  await page.clock.install();
  await page.setViewportSize({ width: 1440, height: 960 });
  await openHome(page);
  const gallery = shelf(page);
  await gallery
    .getByRole("button", { name: "Play public medicine slideshow" })
    .click();
  await page.locator(".hero h1").click();
  await expect(gallery.locator(".gallery-play-status")).toContainText(
    "Autoplay on",
  );
  await page.clock.runFor(6600);
  await expect(gallery.locator(".gallery-position")).toHaveText("2 / 3");
  await gallery.hover();
  await page.clock.runFor(7000);
  await expect(gallery.locator(".gallery-position")).toHaveText("2 / 3");
  await gallery
    .getByRole("region", { name: "Public medicine pictures" })
    .focus();
  await page.mouse.move(20, 100);
  await page.clock.runFor(7000);
  await expect(gallery.locator(".gallery-position")).toHaveText("2 / 3");
  await gallery
    .getByRole("button", { name: "Enlarge Bottles & liquids picture" })
    .click();
  await page.clock.runFor(7000);
  await expect(
    page.locator(".home-medicine-gallery .gallery-position"),
  ).toHaveText("2 / 3");
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    gallery.getByRole("button", { name: "Play public medicine slideshow" }),
  ).toBeDisabled();
  expect(
    await gallery
      .locator(".gallery-artwork")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await page.locator(".hero h1").click();
  await page.clock.runFor(10000);
  await expect(gallery.locator(".gallery-position")).toHaveText("2 / 3");
});
test("Home gallery image failures have a readable fallback and public demo remains functional", async ({
  page,
}) => {
  await page.route("**/images/home-tablets.png", (route) => route.abort());
  await openHome(page);
  await expect(shelf(page).getByText("Picture unavailable")).toBeVisible();
  await shelf(page)
    .getByRole("button", { name: "Next public medicine picture" })
    .click();
  await expect(
    shelf(page).getByRole("img", { name: /amber medicine bottle/ }),
  ).toBeVisible();
  await shelf(page)
    .getByRole("button", { name: "Explore SmartMed POS" })
    .click();
  await expect(
    page.getByRole("button", { name: "Sign in to workspace" }),
  ).toBeVisible();
  await expect(shelf(page)).toHaveCount(0);
});
test.describe("public mobile gallery", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  test("pictures are visible on first visit, support swipe and leave Home buttons usable", async ({
    page,
  }) => {
    await openHome(page);
    const gallery = shelf(page);
    const main = await page.locator(".public-main-content").boundingBox(),
      panel = await gallery.boundingBox();
    expect(main!.y + main!.height).toBeLessThanOrEqual(panel!.y + 1);
    await expect(
      gallery.getByRole("img", { name: /unbranded silver blister/ }),
    ).toBeVisible();
    await gallery.locator(".gallery-photo-stage").evaluate((el) => {
      const touch = (x: number) =>
        new Touch({ identifier: 1, target: el, clientX: x, clientY: 300 });
      el.dispatchEvent(
        new TouchEvent("touchstart", { bubbles: true, touches: [touch(300)] }),
      );
      el.dispatchEvent(
        new TouchEvent("touchend", {
          bubbles: true,
          changedTouches: [touch(80)],
        }),
      );
    });
    await expect(gallery.locator(".gallery-position")).toHaveText("2 / 3");
    const trial = page.getByRole("button", {
      name: "Start 1-Month Trial",
      exact: true,
    });
    await trial.scrollIntoViewIfNeeded();
    const bounds = await trial.boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThan(
      (await gallery.boundingBox())!.y,
    );
    await trial.click();
    await expect(
      page.getByRole("dialog", { name: "Start 1-Month Trial" }),
    ).toBeVisible();
    await expect(gallery).toBeHidden();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(gallery).toBeVisible();
    await page
      .locator(".public-main-content")
      .evaluate((el) => el.scrollTo({ top: 0 }));
    await page.screenshot({
      path: join(tmpdir(), "smartmed-home-gallery-mobile.png"),
      fullPage: true,
      animations: "disabled",
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await gallery
      .getByRole("button", { name: "Minimize home medicine gallery" })
      .click();
    await expect(
      gallery.getByRole("button", { name: "Expand home medicine gallery" }),
    ).toBeVisible();
  });
  test("public gallery handles RTL, reduced motion and print exclusion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openHome(page);
    await page.evaluate(() => (document.documentElement.dir = "rtl"));
    const gallery = shelf(page);
    await gallery
      .getByRole("region", { name: "Public medicine pictures" })
      .focus();
    await page.keyboard.press("ArrowLeft");
    await expect(gallery.locator(".gallery-position")).toHaveText("2 / 3");
    await expect(
      gallery.getByRole("button", { name: "Play public medicine slideshow" }),
    ).toBeDisabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.emulateMedia({ media: "print" });
    await expect(gallery).toBeHidden();
  });
});
