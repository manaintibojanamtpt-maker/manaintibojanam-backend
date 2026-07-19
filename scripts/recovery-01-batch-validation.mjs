#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

const BASE = process.env.OB_BASE || "http://127.0.0.1:4173";
const LABEL = process.env.OB_LABEL || "local-preview";
const OUT_DIR = path.resolve("orderbhojan/validation-screenshots");
fs.mkdirSync(OUT_DIR, { recursive: true });
const SLUG_A = "inti-bhojanam-ghar-kha-khana-pune";
const SLUG_B = "mana-inti-kitchen";
const TOAST = "Your cart was cleared because items can only be ordered from one restaurant at a time.";
const PUNE_KP = { kind: "session", displayLabel: "Koregaon Park, Pune", coordinates: { lat: 18.5362, lng: 73.8958, source: "manual", capturedAt: new Date().toISOString() }, serviceability: { status: "unknown" } };

async function shot(page, name) { const file = path.join(OUT_DIR, `${LABEL}-${name}`); await page.screenshot({ path: file }); return file; }

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const report = { base: BASE, label: LABEL, steps: {} };

{
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle2", timeout: 120000 });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload({ waitUntil: "networkidle2", timeout: 120000 });
  await new Promise((r) => setTimeout(r, 2500));
  const body = await page.evaluate(() => document.body.innerText);
  report.steps.step1 = { puneFallback: body.includes("until you set your location"), honestEmpty: /Set your delivery location|No kitchens within|could not find/i.test(body), bodySnippet: body.replace(/\s+/g, " ").slice(0, 500), screenshot: await shot(page, "step1-home-fresh.png"), consoleErrors: consoleErrors.slice(0, 8) };
  await page.close();
}

{
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const network = [];
  page.on("response", (res) => { const url = res.url(); if (/discover|discovery|marketplace/i.test(url)) network.push({ url: url.slice(0, 160), status: res.status() }); });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.evaluate((loc) => { localStorage.clear(); const payload = { state: { activeLocation: loc, recentLocations: [] }, version: 0 }; localStorage.setItem("ob-location-session-v1", JSON.stringify(payload)); }, PUNE_KP);
  await page.reload({ waitUntil: "networkidle2", timeout: 120000 });
  await new Promise((r) => setTimeout(r, 4000));
  const body = await page.evaluate(() => document.body.innerText);
  let clearTried = false;
  const vegClicked = await page.evaluate(() => { const btn = [...document.querySelectorAll("button")].find((b) => /Veg/i.test(b.textContent ?? "")); if (btn) { btn.click(); return true; } return false; });
  await new Promise((r) => setTimeout(r, 1200));
  if (vegClicked) clearTried = await page.evaluate(() => { const btn = [...document.querySelectorAll("button")].find((b) => /Clear filters/i.test(b.textContent ?? "")); if (btn) { btn.click(); return true; } return false; });
  report.steps.step2 = { hasKitchenContent: /km|Bhojan|kitchen|Open Menu/i.test(body), zeroKm: /\b0\.0\s*km\b|\b0\s*km\b/i.test(body), vegFilterClicked: vegClicked, clearFiltersClicked: clearTried, bodySnippet: body.replace(/\s+/g, " ").slice(0, 700), screenshot: await shot(page, "step2-discovery-pune.png"), network: network.slice(0, 12) };
  await page.close();
}

{
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(`${BASE}/restaurant/${SLUG_A}/menu`, { waitUntil: "networkidle2", timeout: 120000 });
  await page.evaluate(({ slugA }) => {
    localStorage.setItem("ob-cart-m7", JSON.stringify({ state: { lines: [{ lineId: "l1", foodId: "f1", name: "Test Item", price: 100, quantity: 1, restaurantSlug: slugA, restaurantId: `obr_${slugA}` }], restaurantSlug: slugA, visible: true }, version: 0 }));
    localStorage.setItem("ob-restaurant-context-m7", JSON.stringify({ state: { restaurantSlug: slugA, restaurantId: `obr_${slugA}`, contextToken: "ctx", displayName: "A" }, version: 0 }));
  }, { slugA: SLUG_A });
  await page.goto(`${BASE}/restaurant/${SLUG_B}/menu`, { waitUntil: "networkidle2", timeout: 120000 });
  await new Promise((r) => setTimeout(r, 3500));
  const body = await page.evaluate(() => document.body.innerText);
  const state = await page.evaluate(() => { const cart = JSON.parse(localStorage.getItem("ob-cart-m7") || "{}"); const ctx = JSON.parse(localStorage.getItem("ob-restaurant-context-m7") || "{}"); return { cartLines: cart?.state?.lines?.length ?? 0, cartSlug: cart?.state?.restaurantSlug ?? null, ctxSlug: ctx?.state?.restaurantSlug ?? null, path: location.pathname }; });
  report.steps.step3 = { toastVisible: body.includes(TOAST), cartCleared: state.cartLines === 0, ctxCleared: !state.ctxSlug, menuOk: state.path.includes(SLUG_B) && body.length > 40, state, screenshot: await shot(page, "step3-context-switch.png") };
  await page.close();
}

{
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(`${BASE}/restaurant/${SLUG_A}/menu`, { waitUntil: "networkidle2", timeout: 120000 });
  await new Promise((r) => setTimeout(r, 2500));
  const addResult = await page.evaluate(() => { const btn = [...document.querySelectorAll("button")].find((b) => /Add/i.test(b.textContent ?? "") || (b.getAttribute("aria-label") || "").includes("Add")); if (btn) { btn.click(); return "clicked"; } return "no-add"; });
  await new Promise((r) => setTimeout(r, 1500));
  await page.evaluate(() => { const el = [...document.querySelectorAll("button,a")].find((e) => /View cart|Checkout|Cart/i.test(e.textContent ?? "")); el?.click(); });
  await new Promise((r) => setTimeout(r, 2000));
  report.steps.step4 = { addResult, path: await page.evaluate(() => location.pathname), bodySnippet: (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, " ").slice(0, 500), screenshot: await shot(page, "step4-checkout-attempt.png"), limitation: "Full COD not run; no payment/session guarantees in headless smoke" };
  await page.close();
}

{
  const page = await browser.newPage();
  const consoleErrors = []; const badResponses = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("response", (res) => { const url = res.url(); if (/api|cloudfunctions|marketplace|discover/i.test(url) && res.status() >= 400) badResponses.push({ status: res.status(), url: url.slice(0, 180) }); });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle2", timeout: 120000 });
  await page.goto(`${BASE}/restaurant/${SLUG_A}`, { waitUntil: "networkidle2", timeout: 120000 });
  report.steps.step5 = { consoleErrors: consoleErrors.slice(0, 15), badResponses: badResponses.slice(0, 15) };
  await page.close();
}

await browser.close();
const outFile = path.resolve("orderbhojan/validation-recovery-01-report.json");
fs.writeFileSync(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), commit: "fcf1a12", report }, null, 2));
console.log(JSON.stringify(report, null, 2));
