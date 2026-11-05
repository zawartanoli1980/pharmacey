import { test, expect } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("public pages, request form and mobile layout", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Complete pharmacy/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pricing", exact: true })
    .first()
    .click();
  await expect(page.getByText("PKR 45,000")).toBeVisible();
  await page
    .getByRole("button", { name: "Book a demo", exact: true })
    .first()
    .click();
  await page.getByLabel("Your name").fill("Synthetic Browser Test");
  await page.getByLabel("Pakistani mobile number").fill("03001234567");
  await page
    .getByLabel("How can we help?")
    .fill("Synthetic request for demo review");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText("Request received")).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: join(tmpdir(), "smartmed-public-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
test("receive stock, sell strip and units, return and repay customer credit", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/app");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(
    page.getByRole("heading", {
      name: "A clearer view. A healthier business.",
    }),
  ).toBeVisible();
  await page.screenshot({
    path: join(tmpdir(), "smartmed-dashboard.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Purchases", exact: true }).click();
  await page.getByRole("button", { name: "Receive a batch" }).click();
  await page.getByLabel("Medicine", { exact: true }).selectOption("1");
  await page.getByLabel("Batch number").fill("TEST-" + Date.now());
  await page.getByLabel("Expiry date").fill("2027-01-15");
  await page.getByLabel("Individual units", { exact: true }).fill("100");
  await page.getByLabel("Cost per unit (PKR)").fill("2");
  await page.getByLabel("Sell price per unit (PKR)").fill("4");
  await page.getByLabel("Supplier name").fill("Synthetic Test Supplier");
  await page.getByLabel("Supplier invoice reference").fill("INV-" + Date.now());
  await page.getByLabel("Paid to supplier (PKR)").fill("100");
  await page.getByRole("button", { name: "Post goods receipt" }).click();
  await expect(page.getByRole("status")).toContainText("Batch received");
  await page
    .getByRole("button", { name: "Point of sale", exact: false })
    .first()
    .click();
  await page
    .getByPlaceholder("Search medicine, generic, SKU or scan barcode…")
    .fill("Panadol");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Add Panadol 500 mg to bill" })
    .click();
  await page.getByLabel("Unit for Panadol").selectOption("strip");
  await page.getByLabel("Customer", { exact: true }).selectOption("1");
  await page.getByLabel("Amount tendered (PKR)").fill("10");
  await page.getByRole("button", { name: "Complete sale" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".receipt")).toContainText("Rs 40");
  await page.screenshot({ path: join(tmpdir(), "smartmed-receipt.png") });
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".receipt")).toBeVisible();
  await expect(page.locator(".floating-region")).toBeHidden();
  await expect(page.locator(".receipt img")).toHaveCount(0);
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Customers", exact: true }).click();
  const customer = page.getByRole("row").filter({ hasText: "Sara Ahmed" });
  await customer.getByRole("button", { name: "Record repayment" }).click();
  await page.getByLabel("Cash repayment (PKR)").fill("10");
  await page
    .getByRole("button", { name: "Record payment", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Repayment recorded");
  await page
    .getByRole("button", { name: "Sales & returns", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Return", exact: true })
    .first()
    .click();
  await page.getByLabel("Individual units to return").fill("2");
  await page.getByLabel("Reason").fill("Synthetic inspection test");
  await page.getByRole("button", { name: "Approve & post return" }).click();
  await expect(page.getByRole("status")).toContainText("Stock quarantined");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Language & direction").selectOption("ur");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: join(tmpdir(), "smartmed-urdu-mobile.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
