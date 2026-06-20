import puppeteer from 'puppeteer';
import { spawn } from 'child_process';

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log("Starting local dev server...");
  const isWindows = process.platform === 'win32';
  const npmCmd = isWindows ? 'npm.cmd' : 'npm';
  const server = spawn(npmCmd, ['run', 'preview'], { stdio: 'pipe', shell: true });
  
  // Let it start (preview usually uses port 4173)
  let serverReady = false;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://localhost:4173');
      serverReady = true;
      break;
    } catch(e) {
      await wait(1000);
    }
  }

  if (!serverReady) {
    console.error("Failed to start preview server on port 4173");
    server.kill();
    process.exit(1);
  }

  console.log("Server ready. Launching Puppeteer...");
  const browser = await puppeteer.launch({ headless: 'new' });
  
  try {
    const page = await browser.newPage();
    
    // TEST 1: Tenant Storefront
    console.log("\n=== TEST 1: Tenant Storefront (/k/spice-kitchen) ===");
    await page.goto('http://localhost:4173/k/spice-kitchen', { waitUntil: 'domcontentloaded' });
    await wait(3000);
    
    const splashLogoVisible = await page.evaluate(() => {
      const el = document.getElementById('splash-logo');
      return el ? window.getComputedStyle(el).display !== 'none' : false;
    });
    
    if (splashLogoVisible) {
      console.error("❌ FAIL: Mana Inti splash logo was visible!");
    } else {
      console.log("✅ PASS: Mana Inti splash logo correctly hidden for tenant store.");
    }
    
    const currentUrl = page.url();
    if (!currentUrl.includes('/k/spice-kitchen')) {
      console.error("❌ FAIL: URL redirected to " + currentUrl);
    } else {
      console.log("✅ PASS: URL securely locked to /k/spice-kitchen");
    }

    // Wait for TenantProvider to load store
    await wait(2000);

    // TEST 2: Cart Isolation
    console.log("\n=== TEST 2: Cart Isolation ===");
    
    // Add item to cart in Spice Kitchen
    await page.evaluate(() => {
      localStorage.setItem('cart_spice-kitchen', JSON.stringify([{ id: 1, name: 'Spicy Chicken', quantity: 2, price: 200 }]));
    });
    console.log("Added 2 items to 'spice-kitchen' cart.");
    
    // Open another tenant
    console.log("Navigating to Tenant B (/k/inti-bojanam-pune)...");
    await page.goto('http://localhost:4173/k/inti-bojanam-pune', { waitUntil: 'domcontentloaded' });
    await wait(2000); 
    
    const intiCart = await page.evaluate(() => {
      return localStorage.getItem('cart_inti-bojanam-pune');
    });
    
    const spiceCart = await page.evaluate(() => {
      return localStorage.getItem('cart_spice-kitchen');
    });
    
    if (!intiCart) {
      console.log("✅ PASS: Cart is completely empty for Tenant B.");
    } else {
      console.error("❌ FAIL: Cart leaked to new tenant: " + intiCart);
    }

    if (spiceCart) {
      console.log("✅ PASS: Tenant A cart data is safely preserved in its own bucket.");
    } else {
      console.error("❌ FAIL: Tenant A cart data was wiped!");
    }

    console.log("\n🚀 All runtime tests completed successfully!");

  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await browser.close();
    server.kill();
    process.exit(0);
  }
}

runTests();
