import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('recipe intelligence module', () => {
  it('registers ingredients CRUD routes in server bootstrap', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
    assert.match(source, /registerOwnerIngredientsRoutes/);
    assert.match(source, /queryMenuForTenant/);
    assert.match(source, /maybeDeductInventoryOnOrderStatus/);
  });

  it('exposes owner ingredients API client', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/ownerIngredientsApi.ts'),
      'utf8',
    );
    assert.match(source, /\/api\/owner\/ingredients/);
    assert.match(source, /createOwnerIngredient/);
    assert.match(source, /deleteOwnerIngredient/);
  });

  it('exposes recipe intelligence endpoints', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/marketplace/ownerRecipesRoutes.ts'),
      'utf8',
    );
    assert.match(source, /\/api\/owner\/recipes\/intelligence\/summary/);
    assert.match(source, /\/api\/owner\/recipes\/intelligence\/forecast/);
    assert.match(source, /\/api\/owner\/recipes\/suggest/);
  });

  it('owner recipes page uses owner tenant id and ingredient dropdown UI', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/owner/OwnerRecipes.tsx'),
      'utf8',
    );
    assert.match(source, /useOwnerTenantId/);
    assert.match(source, /IngredientMasterPanel/);
    assert.match(source, /RecipeEditorPanel/);
    assert.doesNotMatch(source, /useTenant\(\)/);
  });

  it('firestore rules protect tenant ingredients subcollection', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8');
    assert.match(source, /match \/ingredients\/\{ingredientId\}/);
    assert.match(source, /isTenantOwner\(tenantId\)/);
  });
});
