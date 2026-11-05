import {
  test,
  expect,
  type Page,
  type Route,
  type BrowserContext,
} from "@playwright/test";
import sharp from "sharp";
import { tmpdir } from "node:os";
import { join } from "node:path";
let cookies: Awaited<ReturnType<BrowserContext["cookies"]>> = [];
test.use({ viewport: { width: 1440, height: 960 } });
test.beforeAll(async ({ request }) => {
  const response = await request.post("/api/login", {
    data: { email: "owner@demo.smartmed.test", password: "DemoPass123!" },
  });
  expect(response.ok()).toBeTruthy();
  cookies = (await request.storageState()).cookies;
  // Synthetic image fixtures exercise the private upload route; they are not medicine photographs.
  for (const [productId, color] of [
    [1, "#e2f0e8"],
    [2, "#c9ddd3"],
  ] as const) {
    const image = await sharp({
      create: { width: 320, height: 240, channels: 3, background: color },
    })
      .png()
      .toBuffer();
    const uploaded = await request.post(`/api/products/${productId}/image`, {
      headers: { "Content-Type": "image/png", "X-Image-Verified": "true" },
      data: image,
    });
    expect(uploaded.ok()).toBeTruthy();
  }
});
test.beforeEach(async ({ context }) => {
  await context.addCookies(cookies);
});
const gallery = (page: Page) =>
  page.getByRole("complementary", { name: "Medicine gallery", exact: true });
const load = async (page: Page) => {
  await page.goto("/app");
  await expect(gallery(page).locator(".gallery-medicine-card")).toBeVisible();
};
const navigate = async (page: Page, name: string) => {
  await expect(page.locator(".app")).toBeVisible();
  if (await page.getByRole("button", { name: "Toggle navigation" }).isVisible())
    await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.locator(`.sidebar button[data-page="${name}"]`).click();
};

test("right-side gallery uses stored catalog values, remains visible on scroll and enlarges verified photos", async ({
  page,
}) => {
  await load(page);
  const shelf = gallery(page);
  const products = await (await page.request.get("/api/products")).json();
  const sorted = [...products].sort(
    (a, b) => Number(!!b.image_version) - Number(!!a.image_version),
  );
  const first = sorted[0];
  await expect(shelf.locator(".gallery-product-title h3")).toHaveText(
    first.name,
  );
  await expect(shelf.locator(".gallery-generic")).toHaveText(first.generic);
  await expect(shelf.locator(".gallery-strength")).toContainText(
    first.strength,
  );
  await expect(shelf.locator(".gallery-availability")).toContainText(
    new Intl.NumberFormat("en-PK").format(first.stock),
  );
  await expect(shelf.locator(".gallery-price bdi")).toHaveText(
    new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 2,
    }).format(first.price / 100),
  );
  const box = await shelf.boundingBox();
  const content = await page.locator(".workspace-content>main").boundingBox();
  expect(content!.x + content!.width).toBeLessThanOrEqual(box!.x);
  expect(box!.width).toBeGreaterThanOrEqual(270);
  await page.evaluate(() => window.scrollTo(0, 400));
  expect((await shelf.boundingBox())!.y).toBeCloseTo(box!.y, 0);
  await shelf.getByRole("button", { name: /Enlarge picture/ }).click();
  await expect(
    page.getByRole("dialog").getByRole("img", { name: /staff-verified/ }),
  ).toBeVisible();
  await expect(shelf).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    shelf.getByRole("button", { name: /Enlarge picture/ }),
  ).toBeFocused();
  await page.screenshot({
    path: join(tmpdir(), "smartmed-gallery-desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
});

test("carousel arrows, keyboard, minimize, close and account-scoped reopen all work", async ({
  page,
}) => {
  await load(page);
  const shelf = gallery(page);
  await expect(shelf.locator(".gallery-position")).toHaveText("1 / 8");
  await shelf
    .getByRole("button", { name: "Next medicine", exact: true })
    .click();
  await expect(shelf.locator(".gallery-position")).toHaveText("2 / 8");
  await shelf
    .getByRole("button", { name: "Previous medicine", exact: true })
    .click();
  await expect(shelf.locator(".gallery-position")).toHaveText("1 / 8");
  await shelf.getByRole("region", { name: "Medicine slides" }).focus();
  await page.keyboard.press("End");
  await expect(shelf.locator(".gallery-position")).toHaveText("8 / 8");
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await expect(shelf.locator(".gallery-position")).toHaveText("2 / 8");
  await shelf
    .getByRole("button", { name: "Minimize medicine gallery" })
    .click();
  await expect(
    shelf.getByRole("button", { name: "Expand medicine gallery" }),
  ).toBeFocused();
  await shelf.getByRole("button", { name: "Close medicine gallery" }).click();
  await expect(shelf).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Show medicine gallery" }),
  ).toBeFocused();
  await page.reload();
  await expect(page.locator(".app")).toBeVisible();
  await expect(shelf).toHaveCount(0);
  await page.getByRole("button", { name: "Show medicine gallery" }).click();
  await expect(shelf.locator(".gallery-medicine-card")).toBeVisible();
  await shelf.getByRole("button", { name: "Close medicine gallery" }).click();
  const other = await page.request.post("/api/login", {
    data: { email: "other@demo.smartmed.test", password: "DemoPass123!" },
  });
  expect(other.ok()).toBeTruthy();
  await page.reload();
  await expect(shelf.getByText("Your medicine shelf is waiting")).toBeVisible();
  await expect(shelf.locator("img")).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("smartmed:gallery:v1:1:1")),
  ).toBe("closed");
});

test("autoplay pauses for hover, focus and preview and respects reduced motion", async ({
  page,
}) => {
  await page.clock.install();
  await load(page);
  const shelf = gallery(page);
  await shelf.getByRole("button", { name: "Play medicine slideshow" }).click();
  await page.locator("main h1").click();
  await expect(shelf.locator(".gallery-play-status")).toContainText(
    "Autoplay on",
  );
  await page.clock.runFor(6600);
  await expect(shelf.locator(".gallery-position")).toHaveText("2 / 8");
  await shelf.hover();
  await page.clock.runFor(7000);
  await expect(shelf.locator(".gallery-position")).toHaveText("2 / 8");
  await shelf.getByRole("region", { name: "Medicine slides" }).focus();
  await page.mouse.move(20, 100);
  await page.clock.runFor(7000);
  await expect(shelf.locator(".gallery-position")).toHaveText("2 / 8");
  await page.keyboard.press("Home");
  await shelf.getByRole("button", { name: /Enlarge picture/ }).click();
  await page.clock.runFor(7000);
  await expect(
    page.locator(".floating-medicine-gallery .gallery-position"),
  ).toHaveText("1 / 8");
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    shelf.getByRole("button", { name: "Play medicine slideshow" }),
  ).toBeDisabled();
  expect(
    await shelf
      .locator(".gallery-artwork")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await page.locator("main h1").click();
  await page.clock.runFor(10000);
  await expect(shelf.locator(".gallery-position")).toHaveText("1 / 8");
});

test("loading, failed catalog requests, retry and broken images have useful states", async ({
  page,
}) => {
  const data = await (await page.request.get("/api/products")).json();
  const held: Route[] = [];
  let released = false;
  await page.route("**/api/products", (route) => {
    if (released) return route.fulfill({ json: data });
    held.push(route);
  });
  await page.goto("/app");
  await expect(gallery(page).getByText("Loading medicines…")).toBeVisible();
  released = true;
  await Promise.all(held.map((route) => route.fulfill({ json: data })));
  await expect(gallery(page).locator(".gallery-medicine-card")).toBeVisible();
  await page.unroute("**/api/products");
  await page.route("**/api/products", (route) =>
    route.fulfill({ status: 503, json: { error: "Synthetic catalog outage" } }),
  );
  await page.reload();
  await expect(
    gallery(page).getByRole("heading", { name: "Catalog unavailable" }),
  ).toBeVisible();
  await expect(gallery(page).locator(".gallery-price")).toHaveCount(0);
  await page.unroute("**/api/products");
  await gallery(page)
    .getByRole("button", { name: "Retry medicine catalog" })
    .click();
  await expect(gallery(page).locator(".gallery-medicine-card")).toBeVisible();
  await page.route("**/api/products/*/image*", (route) => route.abort());
  await page.reload();
  await expect(gallery(page).getByText("Image unavailable")).toBeVisible();
  await gallery(page)
    .getByRole("button", { name: /Enlarge picture/ })
    .click();
  await expect(
    page.getByRole("dialog").getByText("Image unavailable"),
  ).toBeVisible();
  await page.keyboard.press("Escape");
});

test.describe("mobile medicine shelf", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const swipe = async (page: Page, from: number, to: number) => {
    await gallery(page)
      .locator(".gallery-photo-stage")
      .evaluate(
        (el, coords) => {
          const touch = (x: number) =>
            new Touch({ identifier: 1, target: el, clientX: x, clientY: 160 });
          el.dispatchEvent(
            new TouchEvent("touchstart", {
              bubbles: true,
              touches: [touch(coords.from)],
            }),
          );
          el.dispatchEvent(
            new TouchEvent("touchend", {
              bubbles: true,
              changedTouches: [touch(coords.to)],
            }),
          );
        },
        { from, to },
      );
  };
  test("compact shelf reserves space, swipes and collapses while searching without covering billing", async ({
    page,
  }) => {
    await page.goto("/app");
    const shelf = gallery(page);
    await expect(
      shelf.getByRole("button", { name: "Expand medicine gallery" }),
    ).toBeVisible();
    await shelf
      .getByRole("button", { name: "Expand medicine gallery" })
      .click();
    await expect(shelf.locator(".gallery-position")).toHaveText("1 / 8");
    const box = await shelf.boundingBox();
    const main = await page.locator(".workspace-content>main").boundingBox();
    expect(main!.y + main!.height).toBeLessThanOrEqual(box!.y + 1);
    await swipe(page, 300, 100);
    await expect(shelf.locator(".gallery-position")).toHaveText("2 / 8");
    await navigate(page, "Point of sale");
    await page
      .getByPlaceholder("Search medicine, generic, SKU or scan barcode…")
      .focus();
    await expect(
      shelf.getByRole("button", { name: "Expand medicine gallery" }),
    ).toBeVisible();
    const search = await page
      .getByPlaceholder("Search medicine, generic, SKU or scan barcode…")
      .boundingBox();
    expect(search!.y + search!.height).toBeLessThan(
      (await shelf.boundingBox())!.y,
    );
    await page
      .getByPlaceholder("Search medicine, generic, SKU or scan barcode…")
      .fill("Panadol");
    await page
      .getByRole("button", { name: "Add Panadol 500 mg to bill" })
      .click();
    await expect(page.locator(".cart-item")).toHaveCount(1);
    await page
      .getByRole("button", { name: "Complete sale", exact: true })
      .scrollIntoViewIfNeeded();
    const checkout = await page
      .getByRole("button", { name: "Complete sale", exact: true })
      .boundingBox();
    expect(checkout!.y + checkout!.height).toBeLessThan(
      (await shelf.boundingBox())!.y,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.getByRole("button", { name: "Show medicine gallery" }).click();
    await page.screenshot({
      path: join(tmpdir(), "smartmed-gallery-mobile.png"),
      fullPage: true,
      animations: "disabled",
    });
  });
  test("dark RTL layouts preserve strength direction and exclude the gallery when printing receipts", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/app");
    await navigate(page, "Settings");
    await page.getByLabel("Appearance").selectOption("dark");
    await page.getByLabel("Language & direction").selectOption("ur");
    await page.getByRole("button", { name: "Show medicine gallery" }).click();
    const shelf = gallery(page);
    await expect(
      shelf.locator(".gallery-strength bdi[dir=ltr]"),
    ).toHaveAttribute("dir", "ltr");
    await expect(shelf.locator(".gallery-availability bdi")).toHaveAttribute(
      "dir",
      "ltr",
    );
    await shelf.getByRole("region", { name: "Medicine slides" }).focus();
    await page.keyboard.press("Home");
    await swipe(page, 300, 100);
    await expect(shelf.locator(".gallery-position")).toHaveText("8 / 8");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: join(tmpdir(), "smartmed-gallery-mobile-dark-rtl.png"),
      fullPage: true,
      animations: "disabled",
    });
    await page.emulateMedia({ media: "print" });
    await expect(shelf).toBeHidden();
  });
});
