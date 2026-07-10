/**
 * Design System Compliance Gate
 *
 * Prevents reintroduction of a second design system after Phase 6 migration.
 * Run alongside scripts/design-system/validate-architecture.mjs in CI.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dsRoot = path.join(root, 'src/design-system');
const obRoot = path.join(root, 'orderbhojan/src');
const exceptionsPath = path.join(root, 'docs/design-system-migration/EXCEPTIONS.md');

const issues = [];
const waived = [];

/** @typedef {{ id: string, violation: string, scope: string, match?: string, expires: string, status: string }} MigrationException */

/** Load approved exceptions from EXCEPTIONS.md machine registry. */
function loadExceptions() {
  if (!fs.existsSync(exceptionsPath)) return [];
  const content = fs.readFileSync(exceptionsPath, 'utf8');
  const match = content.match(/```json\r?\n([\s\S]*?)\r?\n```/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1]);
    return Array.isArray(parsed.exceptions) ? parsed.exceptions : [];
  } catch {
    console.error('WARN — could not parse EXCEPTIONS.md JSON registry');
    return [];
  }
}

/** @param {MigrationException} exception */
function isExceptionActive(exception) {
  if (exception.status !== 'active') return false;
  const today = new Date().toISOString().slice(0, 10);
  return exception.expires >= today;
}

/** @param {string} issue @param {MigrationException[]} exceptions */
function findWaivingException(issue, exceptions) {
  const violation = issue.split(':')[0];
  for (const exception of exceptions) {
    if (!isExceptionActive(exception)) continue;
    if (exception.violation !== violation) continue;
    if (!issueIncludesScope(issue, exception.scope)) continue;
    if (exception.match && !new RegExp(exception.match, 'i').test(issue)) continue;
    return exception;
  }
  return null;
}

/** @param {string} issue @param {string} scope */
function issueIncludesScope(issue, scope) {
  const normalizedScope = scope.replace(/\\/g, '/').replace(/\*\*$/, '');
  return issue.replace(/\\/g, '/').includes(normalizedScope);
}

/** @param {string} issue @param {MigrationException[]} exceptions */
function applyExceptions(issue, exceptions) {
  const waiver = findWaivingException(issue, exceptions);
  if (waiver) {
    waived.push({ issue, id: waiver.id });
    return true;
  }
  return false;
}

const approvedExceptions = loadExceptions();
const expiredActive = approvedExceptions.filter(
  (e) => e.status === 'active' && !isExceptionActive(e),
);
for (const expired of expiredActive) {
  issues.push(`EXCEPTION_EXPIRED: ${expired.id} expired ${expired.expires} — renew or resolve in EXCEPTIONS.md`);
}

/** Walk directory tree for source files. */
function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      walk(full, files);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

/** Relative path from repo root. */
function rel(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

// Legacy Founder components that have design-system equivalents
const legacyToDs = [
  ['MenuItemCard', 'src/design-system/food/MenuItemCardView.tsx'],
  ['SkeletonSystem', 'src/design-system/skeleton/SkeletonSystem.tsx'],
  ['GlassCard', 'src/design-system/primitives/GlassCard.tsx'],
  ['SoftButton', 'src/design-system/primitives/SoftButton.tsx'],
  ['SectionHeader', 'src/design-system/primitives/SectionHeader.tsx'],
  ['Section', 'src/design-system/primitives/Section.tsx'],
  ['ProfileImage', 'src/design-system/primitives/ProfileImage.tsx'],
  ['MarketplaceKitchenCard', 'src/design-system/marketplace/MarketplaceKitchenCard.tsx'],
  ['MarketplaceSearchBar', 'src/design-system/marketplace/MarketplaceSearchBar.tsx'],
];

const obPresentationFiles = walk(path.join(obRoot, 'presentation'));
const obFeatureUiFiles = walk(obRoot).filter((f) => /\/features\/[^/]+\/ui\//.test(rel(f)));
const migratedObUi = new Set([
  'orderbhojan/src/features/food/ui/FoodExperiencePage.tsx',
  'orderbhojan/src/features/food/ui/FoodCardItem.tsx',
  'orderbhojan/src/features/food/ui/FoodCategoryRail.tsx',
  'orderbhojan/src/features/food/ui/FoodFeaturedPoster.tsx',
  'orderbhojan/src/features/food/ui/FoodRestaurantStrip.tsx',
  'orderbhojan/src/features/food/ui/FoodFloatingPreview.tsx',
  'orderbhojan/src/features/food/ui/FoodCustomizeSheet.tsx',
  'orderbhojan/src/features/food/ui/FoodStoryPanel.tsx',
  'orderbhojan/src/features/restaurant/ui/RestaurantExperiencePage.tsx',
  'orderbhojan/src/features/restaurant/ui/RestaurantGlassActions.tsx',
  'orderbhojan/src/features/restaurant/ui/RestaurantGalleryRail.tsx',
  'orderbhojan/src/features/experience/ui/cart/CartExperiencePage.tsx',
  'orderbhojan/src/features/checkout/ui/CheckoutPage.tsx',
  'orderbhojan/src/features/experience/ui/orders/OrdersExperiencePage.tsx',
  'orderbhojan/src/features/orders/ui/OrderSummaryCard.tsx',
  'orderbhojan/src/features/tracking/ui/TrackingPage.tsx',
  'orderbhojan/src/features/tracking/ui/OrderTimeline.tsx',
  'orderbhojan/src/features/tracking/ui/DeliveryTrackingPanel.tsx',
  'orderbhojan/src/features/tracking/ui/OrderInvoiceSheet.tsx',
  'orderbhojan/src/features/tracking/ui/OrderFeedbackPanel.tsx',
  'orderbhojan/src/features/auth/ui/ProfilePage.tsx',
  'orderbhojan/src/features/auth/ui/AuthShellPage.tsx',
  'orderbhojan/src/features/auth/ui/PhoneOtpForm.tsx',
]);

// 1. OrderBhojan presentation must not import legacy BDS for migrated surfaces
for (const file of obPresentationFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (/@bhojan\/design-system/.test(content)) {
    issues.push(`BDS_IN_PRESENTATION: ${rel(file)} imports @bhojan/design-system (use storefront-design-system)`);
  }
}

// 2. OrderBhojan must not import legacy src/components when DS equivalent exists
for (const file of [...obPresentationFiles, ...obFeatureUiFiles]) {
  const r = rel(file);
  if (migratedObUi.has(r)) continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const match of content.matchAll(/from ['"]([^'"]+)['"]/g)) {
    const spec = match[1];
    if (!spec.includes('components/') && !spec.startsWith('@/components')) continue;
    for (const [legacyName, dsPath] of legacyToDs) {
      if (spec.includes(legacyName) && fs.existsSync(path.join(root, dsPath))) {
        issues.push(
          `LEGACY_COMPONENT: ${r} imports ${spec} — use @bhojan/storefront-design-system (${legacyName})`,
        );
      }
    }
  }
}

// 3. Duplicate menu UI implementations in features/food (outside presentation/)
const foodDuplicatePatterns = [
  /export function Food(?:Card|Row|Featured|Category)/i,
  /export function .*StickyCategoryRail/i,
  /export function MenuItemCard/i,
];
for (const file of walk(path.join(obRoot, 'features/food/ui'))) {
  const r = rel(file);
  if (migratedObUi.has(r)) continue;
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('storefront-design-system')) continue;
  for (const pattern of foodDuplicatePatterns) {
    if (pattern.test(content) && !/^export \{/.test(content.trim())) {
      issues.push(`DUPLICATE_UI: ${r} defines menu UI outside presentation/ layer`);
    }
  }
}

// 4. Duplicate menu card implementations in design-system vs orderbhojan
const dsFoodFiles = walk(path.join(dsRoot, 'food')).map((f) => path.basename(f, path.extname(f)));
for (const file of obPresentationFiles) {
  const base = path.basename(file, path.extname(file));
  if (base.includes('MenuItemCard') && dsFoodFiles.includes('MenuItemCardView')) {
    const content = fs.readFileSync(file, 'utf8');
    if (/export function MenuItemCardView/.test(content)) {
      issues.push(`DUPLICATE_DS: ${rel(file)} re-implements MenuItemCardView — belongs in src/design-system only`);
    }
  }
}

// 5. Hardcoded design tokens in OrderBhojan presentation (hex colors — see EX-001 in EXCEPTIONS.md)
const hexPattern = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
for (const file of obPresentationFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.match(hexPattern) ?? [];
  for (const hex of matches) {
    issues.push(`HARDCODED_COLOR: ${rel(file)} uses ${hex} — prefer design-system tokens`);
  }
}

// 6. Deep imports bypassing public module boundaries (adapters/ is allowed)
const deepImportPattern =
  /@bhojan\/storefront-design-system\/(?!adapters\/)(?:[^/'"]+\/){2,}|from ['"]\.\.\/\.\.\/design-system\/[^'"]+['"]/g;
for (const file of walk(obRoot)) {
  const content = fs.readFileSync(file, 'utf8');
  if (deepImportPattern.test(content)) {
    issues.push(`DEEP_IMPORT: ${rel(file)} uses deep design-system import — use module-level public path`);
  }
}

// Internal design-system folders must not be imported from apps
for (const file of walk(obRoot)) {
  const content = fs.readFileSync(file, 'utf8');
  if (/storefront-design-system\/(?:internal|storybook)\//.test(content)) {
    issues.push(`INTERNAL_IMPORT: ${rel(file)} imports design-system internal path`);
  }
}

// 7. Circular dependencies involving design-system (simple import graph)
/** @type {Map<string, Set<string>>} */
const graph = new Map();

/** Module id for import graph. */
function moduleId(file) {
  return rel(file);
}

for (const file of walk(dsRoot)) {
  const id = moduleId(file);
  graph.set(id, new Set());
  const content = fs.readFileSync(file, 'utf8');
  const dir = path.dirname(file);
  for (const match of content.matchAll(/from ['"](\.[^'"]+)['"]/g)) {
    const resolved = path.resolve(dir, match[1]);
    const candidates = [`${resolved}.tsx`, `${resolved}.ts`, path.join(resolved, 'index.ts')];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && candidate.startsWith(dsRoot)) {
        graph.get(id)?.add(moduleId(candidate));
        break;
      }
    }
  }
}

/** Depth-first cycle detection on DS import graph. */
function detectCycle(node, stack, visited) {
  if (stack.has(node)) {
    issues.push(`CIRCULAR_DS: cycle detected involving ${node}`);
    return;
  }
  if (visited.has(node)) return;
  visited.add(node);
  stack.add(node);
  for (const next of graph.get(node) ?? []) {
    detectCycle(next, stack, visited);
  }
  stack.delete(node);
}

const visited = new Set();
for (const node of graph.keys()) {
  detectCycle(node, new Set(), visited);
}

// 8. Presentation shims must remain thin re-exports
for (const shim of migratedObUi) {
  const full = path.join(root, shim.replace(/\//g, path.sep));
  if (!fs.existsSync(full)) continue;
  const content = fs.readFileSync(full, 'utf8').trim();
  const isThin =
    /^export \{[^}]+\} from ['"]@\/presentation\//.test(content) ||
    /^export \{[^}]+\} from ['"]@\/presentation\/[^'"]+['"];?\s*$/m.test(content);
  if (!isThin && content.split('\n').length > 5) {
    issues.push(`SHIM_BLOATED: ${shim} must be a thin re-export of presentation layer`);
  }
}

console.log('=== Design System Compliance Validation ===\n');

const rawIssues = [...new Set(issues)];
const blocking = [];
for (const issue of rawIssues) {
  if (issue.startsWith('EXCEPTION_EXPIRED:')) {
    blocking.push(issue);
    continue;
  }
  if (!applyExceptions(issue, approvedExceptions)) {
    blocking.push(issue);
  }
}

if (waived.length > 0) {
  const ids = [...new Set(waived.map((w) => w.id))].join(', ');
  console.log(`Waived ${waived.length} violation(s) via approved exceptions: ${ids}\n`);
}

if (blocking.length === 0) {
  console.log('PASS — no unapproved legacy leaks, duplicates, deep imports, or circular DS dependencies.');
  process.exit(0);
}

console.log(`FAIL — ${blocking.length} issue(s):\n`);
for (const issue of blocking) {
  console.log(`  • ${issue}`);
}
console.log('\nSee docs/design-system-migration/EXCEPTIONS.md to request an approved exception.');
process.exit(1);
