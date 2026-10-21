import { expect, test, type Page } from "@playwright/test";

/**
 * Each test starts in a fresh browser, so it always begins with the two
 * sample groups: "Goa Trip" (you get back ₹5,379.87) and "Flat 302".
 */

/** Fails the test if the page logs an error, e.g. a React hydration mismatch. */
function watchForErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return errors;
}

const headline = (page: Page) => page.locator("h1 + p");
const dialog = (page: Page) => page.getByRole("dialog");

async function openGoaTrip(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: /Goa Trip/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Goa Trip" })).toBeVisible();
}

test("home lists the sample groups and the overall balance", async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Your groups" })).toBeVisible();
  await expect(page).toHaveTitle("Splitly");
  await expect(page.getByRole("link", { name: /Goa Trip/ })).toContainText("You get back ₹5,379.87");
  await expect(page.getByRole("link", { name: /Flat 302/ })).toContainText("You owe");
  await expect(headline(page)).toHaveText("Overall, you owe ₹16,460.14.");
  expect(errors).toEqual([]);
});

test("adding an expense updates balances and survives a reload", async ({ page }) => {
  const errors = watchForErrors(page);
  await openGoaTrip(page);
  await expect(page).toHaveTitle("Goa Trip · Splitly");

  await page.getByRole("button", { name: "Add expense" }).first().click();
  await dialog(page).getByLabel("What was it for?").fill("Parasailing");
  await dialog(page).getByLabel("Amount", { exact: true }).fill("3000");
  await dialog(page).getByRole("button", { name: "Add expense" }).click();

  // You paid ₹3,000 split 4 ways, so you lent ₹2,250.
  await expect(headline(page)).toHaveText("You get back ₹7,629.87.");
  await expect(page.getByText("Parasailing", { exact: true })).toBeVisible();

  await page.reload();
  await expect(headline(page)).toHaveText("You get back ₹7,629.87.");
  await expect(page).toHaveTitle("Goa Trip · Splitly");

  await page.getByRole("link", { name: "All groups", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Your groups" })).toBeVisible();
  await expect(page).toHaveTitle("Splitly");
  expect(errors).toEqual([]);
});

test("the expense form explains what's wrong", async ({ page }) => {
  await openGoaTrip(page);
  await page.getByRole("button", { name: "Add expense" }).first().click();
  await dialog(page).getByRole("button", { name: "Add expense" }).click();
  await expect(dialog(page).getByText("Add a short description")).toBeVisible();
  await expect(dialog(page).getByText("Enter an amount greater than 0")).toBeVisible();

  await dialog(page).getByLabel("Amount", { exact: true }).fill("300");
  await dialog(page).getByText("Exact amounts").click();
  await dialog(page).locator("#split-mahi").fill("100");
  await expect(dialog(page).getByText("₹200.00 still to assign.")).toBeVisible();
  await dialog(page).locator("#split-aarav").fill("200");
  await expect(dialog(page).getByText("Every rupee is assigned.")).toBeVisible();
});

test("editing an expense keeps its split and updates the balance", async ({ page }) => {
  await openGoaTrip(page);
  await page.getByRole("button", { name: "Edit Groceries & snacks" }).click();
  await expect(dialog(page).getByRole("heading", { name: "Edit expense" })).toBeVisible();
  await expect(dialog(page).getByLabel("Amount", { exact: true })).toHaveValue("950");
  await expect(dialog(page).locator("#split-aarav")).toHaveValue("350");

  await dialog(page).getByLabel("Amount", { exact: true }).fill("1050");
  await dialog(page).locator("#split-aarav").fill("450");
  await dialog(page).getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByText("Changes saved.")).toBeVisible();
  await expect(page.getByText("Rohan paid ₹1,050.00")).toBeVisible();
});

test("deleting can be undone", async ({ page }) => {
  await openGoaTrip(page);
  await page.getByRole("button", { name: "Delete Seafood dinner" }).click();
  await expect(page.getByText("“Seafood dinner” deleted.")).toBeVisible();
  await expect(headline(page)).not.toHaveText("You get back ₹5,379.87.");

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(headline(page)).toHaveText("You get back ₹5,379.87.");
});

test("mark as paid fills in the payment and settles it", async ({ page }) => {
  await openGoaTrip(page);
  await page.getByRole("button", { name: /Mark as paid: Aarav pays you/ }).click();
  await expect(dialog(page).getByLabel("Amount", { exact: true })).toHaveValue("3370.13");
  await dialog(page).getByRole("button", { name: "Record payment" }).click();

  await expect(headline(page)).toHaveText("You get back ₹2,009.74.");
  await expect(page.getByText("2 payments clear every balance in the group.")).toBeVisible();
});

test("share copies the settle-up plan", async ({ page, context, isMobile }) => {
  test.skip(isMobile, "Phones open the share sheet instead of copying.");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openGoaTrip(page);
  await page.getByRole("button", { name: "Share" }).click();
  await expect(page.getByText("Copied. Paste it into your group chat.")).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("Goa Trip: settle up");
  expect(copied).toContain("• Aarav pays Mahi ₹3,370.13");
});

test("create, edit and delete a group", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New group" }).click();
  await dialog(page).getByLabel("Group name").fill("Manali trip");
  await dialog(page).getByRole("textbox", { name: "Person 2" }).fill("Arjun");
  await dialog(page).getByRole("button", { name: "Create group" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Manali trip" })).toBeVisible();
  await expect(headline(page)).toHaveText("You're all settled up.");

  await page.getByRole("button", { name: "Edit group" }).click();
  await dialog(page).getByLabel("Group name").fill("Manali 2026");
  await dialog(page).getByRole("button", { name: "Add a person" }).click();
  await dialog(page).getByRole("textbox", { name: "New person 1" }).fill("Meera");
  await dialog(page).getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Manali 2026" })).toBeVisible();
  await expect(page).toHaveTitle("Manali 2026 · Splitly");
  await expect(page.getByText("You, Arjun and Meera")).toBeVisible();

  await page.getByRole("button", { name: "Delete this group" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Your groups" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Manali 2026/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("link", { name: /Manali 2026/ })).toBeVisible();
});

test("someone in an expense can't be removed from the group", async ({ page }) => {
  await openGoaTrip(page);
  await page.getByRole("button", { name: "Edit group" }).click();
  await expect(dialog(page).getByText("In expenses")).toHaveCount(3);
  await expect(dialog(page).getByRole("button", { name: /^Remove / })).toHaveCount(0);
});

test("dark mode is remembered", async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Switch to light mode" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("an unknown group shows a helpful page", async ({ page }) => {
  await page.goto("/groups/does-not-exist");
  await expect(page.getByRole("heading", { name: "Group not found" })).toBeVisible();
  await expect(page).toHaveTitle("Group not found · Splitly");
  await page.getByRole("link", { name: "Back to your groups" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Your groups" })).toBeVisible();
});
