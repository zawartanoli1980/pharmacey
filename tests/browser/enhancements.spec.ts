import { test, expect, type Route, type Page } from "@playwright/test";
import sharp from "sharp";
import { tmpdir } from "node:os";
import { join } from "node:path";
const login = async (page: Page, role = "owner") => {
  await page.goto("/app");
  await page.getByLabel("Email address").fill(role + "@demo.smartmed.test");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page.locator(".app")).toBeVisible();
};
const navigation = async (page: Page, name: string) => {
  if (await page.getByRole("button", { name: "Toggle navigation" }).isVisible())
    await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.locator(".sidebar").locator(`button[data-page="${name}"]`).click();
};

test("startup waits for initialization, respects reduced motion and recovers from a connection error", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const held: Route[] = [];
  let release = false;
  await page.route("**/api/health", (route) => {
    if (release) return route.fulfill({ json: { ok: true, demo: true } });
    held.push(route);
  });
  await page.goto("/app");
  await expect(
    page.getByText("Connecting to your pharmacy workspace…"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in to workspace" }),
  ).toHaveCount(0);
  expect(
    await page
      .locator(".startup-progress")
      .evaluate((el) => getComputedStyle(el, "::after").animationName),
  ).toBe("none");
  release = true;
  await Promise.all(
    held.map((route) => route.fulfill({ json: { ok: true, demo: true } })),
  );
  await expect(
    page.getByRole("button", { name: "Sign in to workspace" }),
  ).toBeVisible();
  await page.unroute("**/api/health");
  await page.route("**/api/health", (route) =>
    route.fulfill({ status: 503, json: { error: "Synthetic test outage" } }),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "We couldn’t connect to your workspace",
    }),
  ).toBeVisible();
  await page.unroute("**/api/health");
  await page.getByRole("button", { name: "Retry connection" }).click();
  await expect(
    page.getByRole("button", { name: "Sign in to workspace" }),
  ).toBeVisible();
});

test("verified image upload, preview, account-scoped preferences and compact POS work together", async ({
  page,
}) => {
  await login(page);
  await navigation(page, "Inventory");
  await page
    .getByRole("button", { name: "Manage picture for Panadol" })
    .first()
    .click();
  const modal = page.getByRole("dialog");
  await expect(
    modal.getByRole("button", { name: "Save verified picture" }),
  ).toBeDisabled();
  const bytes = await sharp({
    create: { width: 200, height: 160, channels: 3, background: "#d8ece1" },
  })
    .png()
    .toBuffer();
  await modal.getByLabel("Choose medicine picture").setInputFiles({
    name: "neutral-test-image.png",
    mimeType: "image/png",
    buffer: bytes,
  });
  await modal.getByRole("checkbox").check();
  await modal.getByRole("button", { name: "Save verified picture" }).click();
  await expect(modal).toHaveCount(0);
  const preview = page
    .getByRole("button", { name: "Preview picture of Panadol 500 mg" })
    .first();
  await expect(preview).toBeVisible();
  await preview.click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("img", { name: /staff-verified product image/ }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(preview).toBeFocused();
  await page
    .getByRole("checkbox", { name: "Show medicine pictures" })
    .uncheck();
  await expect(page.locator(".medicine-picture")).toHaveCount(0);
  await page.reload();
  await navigation(page, "Inventory");
  await expect(
    page.getByRole("checkbox", { name: "Show medicine pictures" }),
  ).not.toBeChecked();
  await navigation(page, "Point of sale");
  await expect(
    page.getByRole("checkbox", { name: "Show medicine pictures" }),
  ).not.toBeChecked();
  await expect(page.locator(".medicine-picture")).toHaveCount(0);
  await page.keyboard.press("F2");
  await expect(
    page.getByPlaceholder("Search medicine, generic, SKU or scan barcode…"),
  ).toBeFocused();
  await page
    .getByPlaceholder("Search medicine, generic, SKU or scan barcode…")
    .fill("Panadol");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Add Panadol 500 mg to bill" })
    .click();
  await expect(page.locator(".cart-item")).toHaveCount(1);
  await page.getByRole("button", { name: /owner · Sign out/ }).click();
  await page.getByLabel("Email address").fill("cashier@demo.smartmed.test");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(
    page.getByRole("checkbox", { name: "Show medicine pictures" }),
  ).toBeChecked();
  await page.getByRole("button", { name: /cashier · Sign out/ }).click();
  await page.getByLabel("Email address").fill("other@demo.smartmed.test");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await navigation(page, "Inventory");
  await expect(
    page.getByRole("checkbox", { name: "Show medicine pictures" }),
  ).toBeChecked();
  await expect(
    page.getByRole("button", { name: "Preview picture of Panadol 500 mg" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("smartmed:pictures:v1:1:1")),
  ).toBe("hidden");
  expect(
    await page.evaluate(() => localStorage.getItem("smartmed:pictures:v1:1:2")),
  ).toBe("visible");
  expect(
    await page.evaluate(() => localStorage.getItem("smartmed:pictures:v1:2:6")),
  ).toBe("visible");
});

test("floating controls navigate safely, dismiss and reopen without covering focused forms or dialogs", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "Expand quick actions" }).click();
  await page.getByRole("button", { name: "Stock alerts", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Needs attention", exact: true }),
  ).toHaveClass("selected");
  await page.getByRole("button", { name: "Hide quick actions" }).click();
  await expect(page.locator(".floating-region")).toHaveCount(0);
  await page.getByRole("button", { name: "Show quick actions" }).click();
  await expect(
    page.getByRole("button", { name: "Expand quick actions" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Expand quick actions" }).click();
  await page
    .getByRole("navigation", { name: "Quick actions" })
    .getByRole("button", { name: "Help & support" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".floating-region")).toBeHidden();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Got it", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByPlaceholder("Search medicines or batches").focus();
  await expect(page.locator(".floating-region")).toBeHidden();
  await page.getByRole("heading", { name: "Inventory", exact: true }).click();
  await expect(page.locator(".floating-region")).toBeVisible();
  await page.getByRole("button", { name: /owner · Sign out/ }).click();
  await page.getByLabel("Email address").fill("cashier@demo.smartmed.test");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await page.getByRole("button", { name: "Expand quick actions" }).click();
  await expect(
    page
      .getByRole("navigation", { name: "Quick actions" })
      .getByRole("button", { name: "Open inventory" }),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("navigation", { name: "Quick actions" })
      .getByRole("button", { name: "New sale" }),
  ).toBeVisible();
});

test("medicine image failures, mobile dark RTL and reduced-motion layouts remain usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page);
  await navigation(page, "Point of sale");
  await page.route("**/api/products/1/image*", (route) => route.abort());
  await page
    .getByPlaceholder("Search medicine, generic, SKU or scan barcode…")
    .fill("Panadol");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(
    page.locator(".product-card").getByText("Image unavailable"),
  ).toBeVisible();
  await navigation(page, "Settings");
  await page.getByLabel("Appearance").selectOption("dark");
  await page.getByLabel("Language & direction").selectOption("ur");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.setViewportSize({ width: 390, height: 844 });
  await navigation(page, "Point of sale");
  await page.getByRole("button", { name: "Expand quick actions" }).click();
  expect(
    await page
      .locator(".product-select small bdi")
      .first()
      .evaluate((el) => getComputedStyle(el).direction),
  ).toBe("ltr");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: join(tmpdir(), "smartmed-upgrade-mobile-rtl.png"),
    fullPage: true,
  });
  expect(
    await page
      .locator(".floating-actions")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await page.getByRole("button", { name: "Collapse quick actions" }).click();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole("button", { name: "Expand quick actions" }).click();
  await page.getByRole("button", { name: "Back to top", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});
