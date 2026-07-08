import type { Express, Request, Response } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import {
  buildMarketplaceQuote,
  createCheckoutCorrelationId,
  enabledPaymentMethods,
  placeMarketplaceOrder,
  type MarketplacePlaceRequest,
  type MarketplaceQuoteRequest,
} from './projectCheckout.js';
import {
  createMarketplaceContextToken,
  parseFirestoreMenuItem,
  parseFirestoreTenant,
  projectFoodMenuV1,
  type FirestoreMenuItemRecord,
} from './projectFoodMenuV1.js';
import { queryMenuForTenant } from './menuTenantQuery.js';
import { projectRestaurantExperience } from './projectRestaurantExperience.js';
import {
  buildDiscoveryCollection,
  buildDiscoveryHome,
  loadMarketplaceRestaurants,
  parseDiscoveryRequest,
  type DiscoveryCollectionId,
} from './projectDiscovery.js';
import {
  extractTenantSyncRevision,
  isStoreOpenNow,
  mergeSyncRevisions,
  normalizeSyncTimestamp,
  resolveStoreTiming,
} from './tenantProjectionHelpers.js';
import { readPoolSyncRevision } from './tenantSyncService.js';
import {
  getMarketplaceOrderForUser,
  getMarketplaceTrackingForGuest,
  listMarketplaceOrdersForUser,
} from './projectMarketplaceOrders.js';
import { registerMarketplaceCustomerRoutes } from './marketplaceCustomerRoutes.js';
import { registerMarketplaceLocationRoutes } from './marketplaceLocationRoutes.js';
import { registerMarketplaceMediaPublicRoute } from './ownerStorefrontMediaRoutes.js';
import {
  projectFoodBestsellers,
  projectFoodCategories,
  projectFoodRecommended,
} from './projectFoodCollections.js';
import {
  buildLegacySearchResponse,
  buildSearchCollections,
  buildSearchPlatformResponse,
  buildSearchRecent,
  buildSearchSuggestions,
  buildSearchTrending,
  loadSearchContext,
  parseSearchQueryParams,
} from './projectSearch.js';

function success<T>(
  value: T,
  options?: { correlationId?: string; tenantSyncRevision?: string },
) {
  return {
    ok: true as const,
    value,
    meta: {
      correlationId: options?.correlationId ?? createMarketplaceContextToken(),
      ...(options?.tenantSyncRevision ? { tenantSyncRevision: options.tenantSyncRevision } : {}),
    },
  };
}

function sendMarketplaceJson(res: Response, payload: unknown): void {
  res.set('Cache-Control', 'no-store, max-age=0');
  res.json(payload);
}

function notFound(message: string) {
  return {
    ok: false as const,
    error: { code: 'NOT_FOUND', message, retryable: false },
  };
}

async function loadTenantBySlug(db: Firestore, slug: string) {
  const doc = await loadTenantDocBySlug(db, slug);
  if (!doc) return null;
  return {
    tenant: parseFirestoreTenant(doc.id, doc.data() as Record<string, unknown>),
    raw: doc.data() as Record<string, unknown>,
  };
}

async function loadTenantDocBySlug(db: Firestore, slug: string) {
  const direct = await db.collection('tenants').doc(slug).get();
  if (direct.exists) return direct;

  const query = await db.collection('tenants').where('slug', '==', slug).limit(1).get();
  if (query.empty) return null;
  return query.docs[0];
}

async function loadMenuDietaryTypes(
  db: Firestore,
  tenantId: string,
  tenantSlug?: string,
): Promise<('veg' | 'non-veg')[]> {
  const snapshot = await queryMenuForTenant(db, tenantId, tenantSlug);
  const types: ('veg' | 'non-veg')[] = [];
  for (const doc of snapshot.docs) {
    const type = doc.data().type;
    types.push(type === 'veg' ? 'veg' : 'non-veg');
  }
  return types;
}

async function loadMenuItems(
  db: Firestore,
  tenantId: string,
  tenantSlug?: string,
): Promise<{ items: FirestoreMenuItemRecord[]; menuSyncRevision?: string }> {
  const snapshot = await queryMenuForTenant(db, tenantId, tenantSlug);
  const items: FirestoreMenuItemRecord[] = [];
  let menuSyncRevision: string | undefined;
  for (const doc of snapshot.docs) {
    const raw = doc.data() as Record<string, unknown>;
    const revision = mergeSyncRevisions(
      menuSyncRevision,
      normalizeSyncTimestamp(raw.updatedAt),
    );
    if (revision) menuSyncRevision = revision;
    const parsed = parseFirestoreMenuItem(doc.id, raw);
    if (parsed) items.push(parsed);
  }
  return { items, menuSyncRevision };
}

export function registerMarketplaceRoutes(
  app: Express,
  db: Firestore,
  deps?: {
    verifyFirebaseToken?: (req: Request, res: Response, next: () => void) => void;
  },
): void {
  registerMarketplaceMediaPublicRoute(app, db);
  const prefix = '/api/marketplace';
  const verifyFirebaseToken = deps?.verifyFirebaseToken;

  async function discoveryPool(req: Request) {
    const params = parseDiscoveryRequest(new URL(req.originalUrl, 'http://localhost'));
    const { restaurants, poolSyncRevision } = await loadMarketplaceRestaurants(db, {
      lat: params.lat,
      lng: params.lng,
    });
    return { params, pool: restaurants, poolSyncRevision };
  }

  const registerDiscoveryRoute = (path: string, collectionId?: DiscoveryCollectionId) => {
    app.get(path, async (req: Request, res: Response) => {
      try {
        const { params, pool, poolSyncRevision } = await discoveryPool(req);
        if (collectionId) {
          return sendMarketplaceJson(
            res,
            success(
              { collection: buildDiscoveryCollection(collectionId, pool, params) },
              { tenantSyncRevision: poolSyncRevision },
            ),
          );
        }
        return sendMarketplaceJson(
          res,
          success(buildDiscoveryHome(pool, params), { tenantSyncRevision: poolSyncRevision }),
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to load discovery';
        res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
      }
    });
  };

  registerDiscoveryRoute(`${prefix}/discovery`);
  registerDiscoveryRoute(`${prefix}/discover`);
  registerDiscoveryRoute(`${prefix}/discovery/nearby`, 'nearby');
  registerDiscoveryRoute(`${prefix}/discovery/featured`, 'featured');
  registerDiscoveryRoute(`${prefix}/discovery/trending`, 'trending');
  registerDiscoveryRoute(`${prefix}/discovery/cloud-kitchens`, 'cloud-kitchens');
  registerDiscoveryRoute(`${prefix}/discovery/top-rated`, 'top-rated');
  registerDiscoveryRoute(`${prefix}/discovery/offers`, 'offers');
  app.get(`${prefix}/discovery/:collectionId`, async (req: Request, res: Response) => {
    try {
      const { params, pool, poolSyncRevision } = await discoveryPool(req);
      const collectionId = String(req.params.collectionId) as DiscoveryCollectionId;
      return sendMarketplaceJson(
        res,
        success(
          { collection: buildDiscoveryCollection(collectionId, pool, params) },
          { tenantSyncRevision: poolSyncRevision },
        ),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load discovery collection';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });

  app.get(`${prefix}/health`, (_req: Request, res: Response) => {
    sendMarketplaceJson(
      res,
      success({
        status: 'ok',
        version: '1.0.0-sprint19',
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
        source: 'firestore',
      }),
    );
  });

  app.get(`${prefix}/sync/revision`, async (_req: Request, res: Response) => {
    try {
      const poolSyncRevision = await readPoolSyncRevision(db);
      sendMarketplaceJson(
        res,
        success({
          poolSyncRevision: poolSyncRevision ?? null,
          polledAt: new Date().toISOString(),
        }),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to read sync revision';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });

  app.get(`${prefix}/sync/revision/:slug`, async (req: Request, res: Response) => {
    try {
      const slug = String(req.params.slug);
      const loaded = await loadTenantBySlug(db, slug);
      if (!loaded) {
        return res.status(404).json(notFound(`Restaurant not found: ${slug}`));
      }
      const poolSyncRevision = await readPoolSyncRevision(db);
      sendMarketplaceJson(
        res,
        success({
          slug,
          tenantSyncRevision: extractTenantSyncRevision(loaded.raw) ?? null,
          poolSyncRevision: poolSyncRevision ?? null,
          polledAt: new Date().toISOString(),
        }),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to read tenant sync revision';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });

  app.get(`${prefix}/restaurants/:slug/menu`, async (req: Request, res: Response) => {
    try {
      const slug = String(req.params.slug);
      const loaded = await loadTenantBySlug(db, slug);
      if (!loaded) {
        return res.status(404).json(notFound(`Restaurant not found: ${slug}`));
      }

      const items = await loadMenuItems(db, loaded.tenant.id, loaded.tenant.slug);
      const contextToken = createMarketplaceContextToken();
      const menu = projectFoodMenuV1(loaded.tenant, items.items, contextToken);
      const tenantSyncRevision = mergeSyncRevisions(
        extractTenantSyncRevision(loaded.raw),
        items.menuSyncRevision,
      );

      if (req.query.schemaVersion === '1.0') {
        return sendMarketplaceJson(res, success(menu, { tenantSyncRevision }));
      }

      const legacyItems = menu.items.map((food) => ({
        foodId: food.foodId,
        slug: food.slug,
        name: food.name,
        description: food.description,
        image: food.media.hero.url,
        price: food.pricing.regularPrice.amount,
        offerPrice: food.pricing.sellingPrice?.amount,
        currency: food.pricing.regularPrice.currency,
        category: menu.categories.find((c) => c.categoryId === food.categoryId)?.name ?? food.categoryId,
        categoryId: food.categoryId,
        rating: food.metadata.rating,
        dietary: food.metadata.dietary === 'veg' ? 'veg' : food.metadata.dietary === 'egg' ? 'egg' : 'nonVeg',
        preparationTime: food.metadata.preparationMinutes,
        availability: food.availability.status === 'available',
        ownerLabels: food.labels.map((l) => ({ kind: l.kind, displayText: l.displayText })),
        ownerOfferDisplayText: food.offer?.displayText,
        contractSource: true,
        variants: food.variants.map((v) => ({
          id: v.variantId,
          kind: v.kind,
          label: v.displayName,
          price: v.absolutePrice?.amount ?? food.pricing.regularPrice.amount + v.priceDelta.amount,
        })),
        addons: food.addonGroups.flatMap((group) =>
          group.options.map((option) => ({
            id: option.optionId,
            kind: option.kind,
            label: option.displayName,
            price: option.pricing.price.amount,
            maxQuantity: option.maxQuantity,
          })),
        ),
        chefNote: food.story?.chefNote,
        ingredients: food.story?.ingredients,
        cookingStyle: food.story?.cookingStyle,
        servingSize: food.story?.servingSize,
        popularPairing: food.story?.popularPairingLabel,
        spiceLevel:
          food.metadata.spiceLevel === 'mild'
            ? 'mild'
            : food.metadata.spiceLevel === 'medium'
              ? 'medium'
              : food.metadata.spiceLevel === 'hot'
                ? 'hot'
                : food.metadata.spiceLevel === 'extra_hot'
                  ? 'extraHot'
                  : undefined,
        nutritionSummary: food.nutrition?.summary,
        allergenSummary: food.allergens?.summary,
      }));

      return sendMarketplaceJson(
        res,
        success(
          {
            slug: menu.slug,
            restaurantName: menu.restaurantName,
            categories: menu.categories.map((c) => ({
              id: c.categoryId,
              slug: c.slug,
              name: c.name,
              itemCount: c.itemCount,
            })),
            items: legacyItems,
            featuredIds: menu.featuredFoodIds,
            todaysSpecialIds: menu.todaysSpecialFoodIds,
            contextToken,
          },
          { tenantSyncRevision },
        ),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load menu';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });

  app.get(`${prefix}/restaurants/:slug/store-operations`, async (req: Request, res: Response) => {
    try {
      const slug = String(req.params.slug);
      const loaded = await loadTenantBySlug(db, slug);
      if (!loaded) {
        return res.status(404).json(notFound(`Restaurant not found: ${slug}`));
      }
      const timing = resolveStoreTiming(loaded.tenant, loaded.raw);
      sendMarketplaceJson(
        res,
        success(
          {
            slug: loaded.tenant.slug,
            tenantId: loaded.tenant.id,
            storeOperations: loaded.raw.storeOperations ?? {},
            acceptingOrders: isStoreOpenNow(timing),
            storeStatus: typeof loaded.raw.storeStatus === 'string' ? loaded.raw.storeStatus : 'draft',
          },
          { tenantSyncRevision: extractTenantSyncRevision(loaded.raw) },
        ),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load store operations';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });

  app.get(`${prefix}/restaurants/:slug`, async (req: Request, res: Response) => {
    try {
      const slug = String(req.params.slug);
      const loaded = await loadTenantBySlug(db, slug);
      if (!loaded) {
        return res.status(404).json(notFound(`Restaurant not found: ${slug}`));
      }
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      const customerCoords =
        Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
      const menuTypes = await loadMenuDietaryTypes(db, loaded.tenant.id, loaded.tenant.slug);
      const payload = projectRestaurantExperience({
        tenant: loaded.tenant,
        raw: loaded.raw,
        contextToken: createMarketplaceContextToken(),
        customerCoords,
        menuTypes,
      });
      sendMarketplaceJson(
        res,
        success(payload, { tenantSyncRevision: extractTenantSyncRevision(loaded.raw) }),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load restaurant';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });

  app.get(`${prefix}/restaurants/:slug/gallery`, async (req: Request, res: Response) => {
    try {
      const slug = String(req.params.slug);
      const loaded = await loadTenantBySlug(db, slug);
      if (!loaded) {
        return res.status(404).json(notFound(`Restaurant not found: ${slug}`));
      }
      const images =
        loaded.tenant.marketplace?.gallery?.map((item) => ({
          id: item.galleryId,
          url: item.url,
          caption: item.caption,
        })) ?? [];
      sendMarketplaceJson(
        res,
        success({ slug, images }, { tenantSyncRevision: extractTenantSyncRevision(loaded.raw) }),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load gallery';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });

  app.get(`${prefix}/restaurants/:slug/offers`, async (req: Request, res: Response) => {
    try {
      const slug = String(req.params.slug);
      const loaded = await loadTenantBySlug(db, slug);
      if (!loaded) {
        return res.status(404).json(notFound(`Restaurant not found: ${slug}`));
      }
      const offers =
        loaded.tenant.marketplace?.offers?.map((offer) => ({
          id: offer.offerId,
          title: offer.displayText,
          description: offer.description,
          badge: offer.badge,
        })) ?? [];
      sendMarketplaceJson(
        res,
        success({ slug, offers }, { tenantSyncRevision: extractTenantSyncRevision(loaded.raw) }),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load offers';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });

  app.get(`${prefix}/restaurants/:slug/highlights`, async (req: Request, res: Response) => {
    try {
      const slug = String(req.params.slug);
      const loaded = await loadTenantBySlug(db, slug);
      if (!loaded) {
        return res.status(404).json(notFound(`Restaurant not found: ${slug}`));
      }
      sendMarketplaceJson(
        res,
        success(
          { slug, highlights: loaded.tenant.marketplace?.highlights ?? [] },
          { tenantSyncRevision: extractTenantSyncRevision(loaded.raw) },
        ),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load highlights';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });

  async function loadProjectedMenu(slug: string) {
    const loaded = await loadTenantBySlug(db, slug);
    if (!loaded) return null;
    const menuItems = await loadMenuItems(db, loaded.tenant.id, loaded.tenant.slug);
    const menu = projectFoodMenuV1(loaded.tenant, menuItems.items, createMarketplaceContextToken());
    return { loaded, menu, menuSyncRevision: menuItems.menuSyncRevision };
  }

  app.get(`${prefix}/restaurants/:slug/categories`, async (req: Request, res: Response) => {
    try {
      const slug = String(req.params.slug);
      const projected = await loadProjectedMenu(slug);
      if (!projected) return res.status(404).json(notFound(`Restaurant not found: ${slug}`));
      sendMarketplaceJson(
        res,
        success(projectFoodCategories(slug, projected.menu), {
          tenantSyncRevision: mergeSyncRevisions(
            extractTenantSyncRevision(projected.loaded.raw),
            projected.menuSyncRevision,
          ),
        }),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load categories';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });

  app.get(`${prefix}/restaurants/:slug/recommended`, async (req: Request, res: Response) => {
    try {
      const slug = String(req.params.slug);
      const projected = await loadProjectedMenu(slug);
      if (!projected) return res.status(404).json(notFound(`Restaurant not found: ${slug}`));
      sendMarketplaceJson(
        res,
        success(projectFoodRecommended(slug, projected.menu, projected.loaded.tenant), {
          tenantSyncRevision: mergeSyncRevisions(
            extractTenantSyncRevision(projected.loaded.raw),
            projected.menuSyncRevision,
          ),
        }),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load recommended items';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });

  app.get(`${prefix}/restaurants/:slug/bestsellers`, async (req: Request, res: Response) => {
    try {
      const slug = String(req.params.slug);
      const projected = await loadProjectedMenu(slug);
      if (!projected) return res.status(404).json(notFound(`Restaurant not found: ${slug}`));
      sendMarketplaceJson(
        res,
        success(projectFoodBestsellers(slug, projected.menu), {
          tenantSyncRevision: mergeSyncRevisions(
            extractTenantSyncRevision(projected.loaded.raw),
            projected.menuSyncRevision,
          ),
        }),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load bestsellers';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });

  app.get(`${prefix}/search`, async (req: Request, res: Response) => {
    try {
      const url = new URL(req.originalUrl, 'http://localhost');
      const params = parseSearchQueryParams(url);
      const context = await loadSearchContext(db, { lat: params.lat, lng: params.lng });
      if (url.searchParams.get('legacy') === 'true') {
        return sendMarketplaceJson(
          res,
          success(buildLegacySearchResponse(params.q, context), {
            tenantSyncRevision: context.poolSyncRevision,
          }),
        );
      }
      return sendMarketplaceJson(
        res,
        success(buildSearchPlatformResponse(params, context), {
          tenantSyncRevision: context.poolSyncRevision,
        }),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to search marketplace';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });

  app.get(`${prefix}/search/suggestions`, async (req: Request, res: Response) => {
    try {
      const url = new URL(req.originalUrl, 'http://localhost');
      const lat = Number(url.searchParams.get('lat') ?? '17.4401');
      const lng = Number(url.searchParams.get('lng') ?? '78.3489');
      const q = url.searchParams.get('q') ?? '';
      const context = await loadSearchContext(db, { lat, lng });
      sendMarketplaceJson(
        res,
        success(buildSearchSuggestions(q, context), { tenantSyncRevision: context.poolSyncRevision }),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load search suggestions';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });

  app.get(`${prefix}/search/trending`, async (req: Request, res: Response) => {
    try {
      const url = new URL(req.originalUrl, 'http://localhost');
      const lat = Number(url.searchParams.get('lat') ?? '17.4401');
      const lng = Number(url.searchParams.get('lng') ?? '78.3489');
      const context = await loadSearchContext(db, { lat, lng });
      sendMarketplaceJson(
        res,
        success(buildSearchTrending(context), { tenantSyncRevision: context.poolSyncRevision }),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load search trending';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });

  app.get(`${prefix}/search/recent`, async (_req: Request, res: Response) => {
    sendMarketplaceJson(res, success(buildSearchRecent()));
  });

  app.get(`${prefix}/search/collections`, async (req: Request, res: Response) => {
    try {
      const url = new URL(req.originalUrl, 'http://localhost');
      const lat = Number(url.searchParams.get('lat') ?? '17.4401');
      const lng = Number(url.searchParams.get('lng') ?? '78.3489');
      const context = await loadSearchContext(db, { lat, lng });
      sendMarketplaceJson(
        res,
        success(buildSearchCollections(context), { tenantSyncRevision: context.poolSyncRevision }),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load search collections';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });

  app.post(`${prefix}/quote`, async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as MarketplaceQuoteRequest;
      const { quote } = await buildMarketplaceQuote(db, body);
      sendMarketplaceJson(res, success(quote, { correlationId: createCheckoutCorrelationId() }));
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      const message = error instanceof Error ? error.message : 'Failed to build quote';
      res.status(status).json({ ok: false, error: { code: 'QUOTE_FAILED', message, retryable: status >= 500 } });
    }
  });

  app.post(`${prefix}/checkout/prepare`, async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as MarketplaceQuoteRequest;
      const loaded = await buildMarketplaceQuote(db, body);
      const tenantDoc = await db.collection('tenants').doc(loaded.tenantId).get();
      const methods = tenantDoc.exists && tenantDoc.data()
        ? enabledPaymentMethods(tenantDoc.data() as Record<string, unknown>)
        : ['cod'];

      sendMarketplaceJson(
        res,
        success(
          { paymentMethods: methods, quote: loaded.quote },
          { correlationId: createCheckoutCorrelationId() },
        ),
      );
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      const message = error instanceof Error ? error.message : 'Failed to prepare checkout';
      res.status(status).json({ ok: false, error: { code: 'PREPARE_FAILED', message, retryable: status >= 500 } });
    }
  });

  app.post(`${prefix}/checkout/place`, async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as MarketplacePlaceRequest;
      const result = await placeMarketplaceOrder(db, FieldValue, body);
      const value =
        result.kind === 'razorpay'
          ? {
              draftId: result.draftId,
              paymentMethod: 'razorpay',
              quote: result.quote,
              amountInPaise: result.amountInPaise,
            }
          : { orderId: result.orderId, paymentMethod: 'cod' };
      sendMarketplaceJson(res, success(value, { correlationId: createCheckoutCorrelationId() }));
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      const message = error instanceof Error ? error.message : 'Failed to place order';
      res.status(status).json({ ok: false, error: { code: 'PLACE_FAILED', message, retryable: status >= 500 } });
    }
  });

  if (verifyFirebaseToken) {
    app.get(`${prefix}/orders`, verifyFirebaseToken, async (req: any, res: Response) => {
      try {
        const orders = await listMarketplaceOrdersForUser(db, req.user.uid);
        sendMarketplaceJson(res, success({ orders }));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to load orders';
        res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
      }
    });

    app.get(`${prefix}/orders/:orderId`, verifyFirebaseToken, async (req: any, res: Response) => {
      try {
        const order = await getMarketplaceOrderForUser(db, String(req.params.orderId), req.user.uid);
        if (!order) {
          return res.status(404).json(notFound('Order not found'));
        }
        sendMarketplaceJson(res, success(order.summary));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to load order';
        res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
      }
    });

    app.get(`${prefix}/orders/:orderId/tracking`, verifyFirebaseToken, async (req: any, res: Response) => {
      try {
        const order = await getMarketplaceOrderForUser(db, String(req.params.orderId), req.user.uid);
        if (!order) {
          return res.status(404).json(notFound('Order not found'));
        }
        sendMarketplaceJson(res, success(order.tracking));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to load tracking';
        res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
      }
    });

    app.post(`${prefix}/orders/:orderId/feedback`, verifyFirebaseToken, async (req: any, res: Response) => {
      try {
        const orderId = String(req.params.orderId ?? '').trim();
        const rating = Number(req.body?.rating);
        const feedback = typeof req.body?.feedback === 'string' ? req.body.feedback.trim() : '';
        if (!orderId || !Number.isFinite(rating) || rating < 1 || rating > 5) {
          return res.status(400).json({
            ok: false,
            error: { code: 'INVALID', message: 'rating between 1 and 5 is required', retryable: false },
          });
        }

        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
          return res.status(404).json(notFound('Order not found'));
        }
        const orderData = orderSnap.data() as Record<string, unknown>;
        if (String(orderData.userId ?? '') !== req.user.uid) {
          return res.status(403).json({
            ok: false,
            error: { code: 'FORBIDDEN', message: 'Not your order', retryable: false },
          });
        }
        if (String(orderData.status ?? '').toUpperCase() !== 'DELIVERED') {
          return res.status(400).json({
            ok: false,
            error: { code: 'INVALID', message: 'Feedback is only allowed after delivery', retryable: false },
          });
        }

        const batch = db.batch();
        batch.update(orderRef, {
          rating,
          feedback: feedback || null,
          reviewed: true,
          feedbackStatus: 'SUBMITTED',
          feedbackSubmittedAt: FieldValue.serverTimestamp(),
        });
        batch.set(db.collection('reviews').doc(), {
          orderId,
          userId: req.user.uid,
          rating,
          feedback: feedback || null,
          items: Array.isArray(orderData.items) ? orderData.items : [],
          tenantId: orderData.tenantId ?? null,
          createdAt: FieldValue.serverTimestamp(),
        });
        await batch.commit();

        const updated = await getMarketplaceOrderForUser(db, orderId, req.user.uid);
        sendMarketplaceJson(res, success(updated?.tracking ?? null));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to submit feedback';
        res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
      }
    });
  }

  app.get(`${prefix}/orders/:orderId/guest-tracking`, async (req: Request, res: Response) => {
    try {
      const phone = String(req.query.phone ?? '').trim();
      if (!phone) {
        return res.status(400).json({
          ok: false,
          error: { code: 'INVALID', message: 'phone query parameter is required', retryable: false },
        });
      }
      const tracking = await getMarketplaceTrackingForGuest(db, String(req.params.orderId), phone);
      if (!tracking) {
        return res.status(404).json(notFound('Order not found'));
      }
      sendMarketplaceJson(res, success(tracking));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load tracking';
      res.status(500).json({ ok: false, error: { code: 'INTERNAL', message, retryable: true } });
    }
  });

  registerMarketplaceCustomerRoutes(app, db, FieldValue, verifyFirebaseToken);
  registerMarketplaceLocationRoutes(app, db);
}
