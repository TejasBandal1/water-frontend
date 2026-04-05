import { chromium } from "playwright";

const FRONTEND_URL = "https://water-frontend-beta.vercel.app/login";
const APP_ORIGIN = new URL(FRONTEND_URL).origin;
const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "Admin123";

const report = [];

const nowStamp = () =>
  new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);

const suffix = nowStamp();
const qa = {
  clientName: `UI QA Client Pune ${suffix}`,
  clientEmail: `ui.qa.client.${suffix}@rivarich.test`,
  containerReturnable: `UI QA Return Jar ${suffix}`,
  containerNonReturnable: `UI QA Bottle NR ${suffix}`,
  driverName: `UI QA Driver ${suffix}`,
  driverEmail: `ui.qa.driver.${suffix}@rivarich.test`,
  clientUserName: `UI QA Client User ${suffix}`,
  clientUserEmail: `ui.qa.clientuser.${suffix}@rivarich.test`
};

function logStep(scope, step, ok, detail) {
  report.push({ scope, step, ok, detail });
}

async function runStep(scope, step, fn) {
  try {
    const detail = await fn();
    logStep(scope, step, true, detail || "ok");
    return detail;
  } catch (err) {
    logStep(scope, step, false, err?.message || String(err));
    return null;
  }
}

async function waitForHeading(page, text) {
  await page.locator(".page-title, h1", { hasText: text }).first().waitFor({ timeout: 25000 });
}

async function login(page, email, password) {
  await page.goto(FRONTEND_URL, { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Enter your email").fill(email);
  await page.getByPlaceholder("Enter your password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForLoadState("networkidle");
}

async function gotoSidebar(page, linkName, headingText) {
  const routeMap = {
    Clients: "/admin/clients",
    Containers: "/admin/containers",
    Pricing: "/admin/pricing",
    Invoices: "/admin/invoices",
    Analytics: "/admin/analytics",
    "Pending Returns": "/admin/pending-returns",
    "Delivery Matrix": "/admin/delivery-matrix",
    "Missing Bills": "/admin/missing-bills",
    Users: "/admin/users",
    "Audit Logs": "/admin/audit",
    "New Trip": "/driver/trip",
    "Trip History": "/driver/history",
    Orders: "/driver/orders"
  };

  if (routeMap[linkName]) {
    await page.goto(`${APP_ORIGIN}${routeMap[linkName]}`, { waitUntil: "networkidle" });
  } else {
    await page.getByRole("link", { name: linkName }).click();
    await page.waitForLoadState("networkidle");
  }

  await waitForHeading(page, headingText);
}

async function ensureInView(locator) {
  await locator.scrollIntoViewIfNeeded();
}

async function selectOptionByContains(selectLocator, containsText) {
  const options = await selectLocator.locator("option").allTextContents();
  const match = options.find((opt) =>
    opt.toLowerCase().includes(containsText.toLowerCase())
  );
  if (!match) throw new Error(`Option not found: ${containsText}`);
  await selectLocator.selectOption({ label: match });
}

async function runAdminFlow(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });

  await runStep("admin", "login", async () => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await waitForHeading(page, "Business Performance Dashboard");
    return "admin logged in";
  });

  await runStep("admin", "topbar collapse/expand", async () => {
    const toggle = page.getByRole("button", { name: /COLLAPSE|EXPAND/i }).first();
    const before = (await toggle.textContent())?.trim();
    await toggle.click();
    await page.waitForTimeout(300);
    const after = (await toggle.textContent())?.trim();
    if (before === after) throw new Error("sidebar toggle did not change state");
    await toggle.click();
    return "sidebar toggle works";
  });

  await runStep("admin", "dashboard period switch", async () => {
    await page.locator("select").first().selectOption("weekly");
    await page.waitForTimeout(700);
    await page.locator("select").first().selectOption("monthly");
    return "dashboard filter changed";
  });

  await runStep("admin", "clients page CRUD buttons", async () => {
    await gotoSidebar(page, "Clients", "Clients Management");
    await page.getByRole("button", { name: "+ Add Client" }).click();

    const modal = page.locator(".fixed .panel").last();
    await modal.locator("input").nth(0).fill(qa.clientName);
    await modal.locator("input").nth(1).fill(qa.clientEmail);
    await modal.locator("input").nth(2).fill("9822000001");
    await modal.locator("input").nth(3).fill("Koregaon Park, Pune");
    await modal.locator("select").nth(0).selectOption("weekly");
    await modal.locator('input[type="number"]').fill("7");
    await modal.getByRole("button", { name: "Save" }).click();

    await page.getByText("Client created successfully").waitFor();
    await page.getByPlaceholder("Search by name or email...").fill(qa.clientName);
    await page.getByRole("button", { name: "Edit" }).first().click();
    await modal.locator("input").nth(0).fill(`${qa.clientName} Updated`);
    await modal.getByRole("button", { name: "Save" }).click();
    await page.getByText("Client updated successfully").waitFor();
    return "add/edit works";
  });

  await runStep("admin", "containers page action buttons", async () => {
    await gotoSidebar(page, "Containers", "Container Management");
    await page.getByRole("button", { name: "+ Add Container" }).click();
    let modal = page.locator(".fixed .panel").last();
    await modal.locator('input[type="text"]').nth(0).fill(qa.containerReturnable);
    await modal.locator('input[type="text"]').nth(1).fill("UI returnable container");
    await modal.getByRole("button", { name: "Save" }).click();
    await page.getByText("Container created").waitFor();

    await page.getByRole("button", { name: "+ Add Container" }).click();
    modal = page.locator(".fixed .panel").last();
    await modal.locator('input[type="text"]').nth(0).fill(qa.containerNonReturnable);
    await modal.locator('input[type="text"]').nth(1).fill("UI non-returnable container");
    await modal.locator('input[type="checkbox"]').uncheck();
    await modal.getByRole("button", { name: "Save" }).click();
    await page.getByText("Container created").waitFor();

    await page.getByPlaceholder("Search container...").fill(qa.containerReturnable);
    await page.getByRole("button", { name: "Edit" }).first().click();
    modal = page.locator(".fixed .panel").last();
    await modal.locator('input[type="text"]').nth(1).fill("UI returnable container updated");
    await modal.getByRole("button", { name: "Save" }).click();
    await page.locator(".toast", { hasText: "Container updated" }).waitFor();
    return "add/edit works";
  });

  await runStep("admin", "pricing page save button", async () => {
    await gotoSidebar(page, "Pricing", "Price Management");
    await page.locator('select').nth(1).selectOption({ label: `${qa.clientName} Updated` });
    await page.locator('select').nth(2).selectOption({ label: qa.containerReturnable });
    await page.getByPlaceholder("Price (Rs.)").fill("111");
    await page.getByRole("button", { name: "Save" }).first().click();
    await page.getByText("Price rule saved successfully").waitFor();
    return "price saved";
  });

  await runStep("admin", "users page create buttons", async () => {
    await gotoSidebar(page, "Users", "Team & Access Control");
    await page.getByPlaceholder("Full Name").fill(qa.driverName);
    await page.getByPlaceholder("Email").fill(qa.driverEmail);
    await page.getByPlaceholder("Password").fill("Admin123");
    await page.locator("select").nth(0).selectOption("driver");
    await page.getByRole("button", { name: "Create User" }).click();
    await page.getByText("User created successfully").waitFor();

    await page.getByPlaceholder("Full Name").fill(qa.clientUserName);
    await page.getByPlaceholder("Email").fill(qa.clientUserEmail);
    await page.getByPlaceholder("Password").fill("Admin123");
    await page.locator("select").nth(0).selectOption("client");
    await page.locator("select").nth(1).selectOption({ label: `${qa.clientName} Updated` });
    await page.getByRole("button", { name: "Create User" }).click();
    await page.getByText("User created successfully").waitFor();
    return "driver and client user created";
  });

  await runStep("admin", "missing bills add button", async () => {
    await gotoSidebar(page, "Missing Bills", "Missing Bills Entry");
    await selectOptionByContains(page.locator("select").nth(0), `${qa.clientName} Updated`);
    await selectOptionByContains(page.locator("select").nth(1), qa.driverName);

    const card = page.locator(".rounded-xl.border").filter({ hasText: qa.containerReturnable }).first();
    await ensureInView(card);
    await card.locator('input[type="number"]').nth(0).fill("3");
    await card.locator('input[type="number"]').nth(1).fill("1");
    await page.getByRole("button", { name: "Add Missing Bill" }).click();
    await page.getByText("Missing bill added successfully").waitFor();
    return "manual bill created";
  });

  await runStep("admin", "invoices list/detail/payment buttons", async () => {
    await gotoSidebar(page, "Invoices", "Invoice Management");
    await page.locator("section.page-hero").getByRole("button", { name: "Generate Drafts" }).click();
    const modal = page.locator(".fixed .rounded-2xl").filter({ hasText: "Generate Draft Invoices" }).first();
    await modal.waitFor();
    await modal.getByRole("button", { name: "Generate Drafts" }).click();
    await page.getByText("Generated:").waitFor();

    await page.getByPlaceholder("Invoice ID or client").fill(qa.clientName);

    const row = page.locator("tbody tr").first();
    await row.waitFor();
    const confirmBtn = row.getByRole("button", { name: "Confirm" });
    if (await confirmBtn.count()) {
      await confirmBtn.click();
      await page.locator(".fixed .rounded-2xl").first().getByRole("button", { name: "Confirm Invoice" }).click();
      await page.getByText("confirmed").first().waitFor({ timeout: 20000 });
    }

    await row.getByRole("link", { name: "View" }).click();
    await waitForHeading(page, "Invoice #");
    await page.getByPlaceholder("Enter amount").fill("50");
    await page.getByRole("button", { name: "Review & Confirm Payment" }).click();

    const checklistModal = page.locator(".fixed .rounded-2xl").filter({ hasText: "Confirm Payment Checklist" }).first();
    const checks = checklistModal.locator('input[type="checkbox"]');
    const checkCount = await checks.count();
    for (let i = 0; i < checkCount; i += 1) {
      await checks.nth(i).check();
    }
    await checklistModal.getByRole("button", { name: "Confirm Payment" }).click();
    await page.getByText("Payment recorded successfully").waitFor({ timeout: 25000 });
    return "invoice actions and payment ok";
  });

  await runStep("admin", "analytics filters/search buttons", async () => {
    await gotoSidebar(page, "Analytics", "Business Intelligence Dashboard");
    await page.locator("select").first().selectOption("weekly");
    const searchInput = page.getByPlaceholder("Search client...");
    await searchInput.fill("UI QA Client");
    await page.locator("button").filter({ hasText: `${qa.clientName} Updated` }).first().click();
    await page.getByRole("button", { name: "Reset Filters" }).click();
    return "analytics controls work";
  });

  await runStep("admin", "pending returns search controls", async () => {
    await gotoSidebar(page, "Pending Returns", "Pending Container Returns");
    await page.getByPlaceholder("Search by client name...").fill("UI QA");
    await page.getByRole("button", { name: "Apply" }).click();
    await page.getByRole("button", { name: "Reset" }).click();
    return "pending returns search buttons ok";
  });

  await runStep("admin", "delivery matrix controls", async () => {
    await gotoSidebar(page, "Delivery Matrix", "Delivery Matrix Report");
    await page.getByRole("button", { name: "Yearly" }).click();
    await page.getByRole("button", { name: "Monthly" }).click();
    await page.getByRole("button", { name: "Download CSV" }).click();
    return "date filters + download button ok";
  });

  await runStep("admin", "audit logs search", async () => {
    await gotoSidebar(page, "Audit Logs", "System Activity Logs");
    await page.getByPlaceholder("Search by user, role, action, entity or details...").fill(suffix);
    await page.waitForTimeout(1000);
    return "audit search works";
  });

  await runStep("admin", "logout", async () => {
    await page.getByRole("button", { name: "Logout" }).click();
    await page.getByRole("button", { name: "Login" }).waitFor();
    return "logged out";
  });

  await context.close();
}

async function runDriverFlow(browser) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });

  await runStep("driver", "login", async () => {
    await login(page, qa.driverEmail, "Admin123");
    await waitForHeading(page, "Driver");
    return "driver logged in";
  });

  await runStep("driver", "trip page submit button", async () => {
    await gotoSidebar(page, "New Trip", "Record New Trip");
    const search = page.getByPlaceholder("Search client by name, city, or address...");
    await search.fill(qa.clientName);
    await page.locator("button").filter({ hasText: `${qa.clientName} Updated` }).first().click();

    const card = page.locator(".panel").filter({ hasText: qa.containerReturnable }).first();
    await ensureInView(card);
    await card.locator('input[type="number"]').first().fill("2");
    await page.getByRole("button", { name: "Submit Trip" }).click();
    await page.waitForTimeout(1200);
    return "trip submitted";
  });

  await runStep("driver", "history and orders pages", async () => {
    await gotoSidebar(page, "Trip History", "Trip History");
    await gotoSidebar(page, "Orders", "Orders");
    return "driver pages open";
  });

  await context.close();
}

async function runClientFlow(browser) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  await runStep("client", "login", async () => {
    await login(page, qa.clientUserEmail, "Admin123");
    await waitForHeading(page, "Welcome");
    return "client logged in";
  });

  await runStep("client", "dashboard sections render", async () => {
    await page.getByText("My Invoices").waitFor();
    await page.getByText("Container Balance").waitFor();
    return "client dashboard loaded";
  });

  await context.close();
}

async function runMobileSidebarFlow(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  await runStep("mobile", "menu button opens sidebar", async () => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`${APP_ORIGIN}/admin`, { waitUntil: "networkidle" });
    const menu = page.getByLabel("Toggle sidebar");
    await menu.waitFor();
    await menu.click();
    await page.getByRole("link", { name: "Clients" }).waitFor();
    await page.getByRole("link", { name: "Clients" }).click();
    await waitForHeading(page, "Clients Management");
    return "mobile sidebar toggle/navigation works";
  });

  await context.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    await runAdminFlow(browser);
    await runDriverFlow(browser);
    await runClientFlow(browser);
    await runMobileSidebarFlow(browser);
  } finally {
    await browser.close();
  }

  const passed = report.filter((r) => r.ok).length;
  const failed = report.filter((r) => !r.ok).length;
  console.log(`UI_FLOW_SUMMARY passed=${passed} failed=${failed} suffix=${suffix}`);
  console.log(JSON.stringify(report, null, 2));
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("UI_FLOW_FATAL", err);
  process.exit(1);
});
