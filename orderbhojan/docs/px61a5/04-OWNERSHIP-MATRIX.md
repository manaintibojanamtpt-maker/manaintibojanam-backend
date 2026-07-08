# 04 — Ownership Matrix

For every contract property: which layer **defines**, **persists**, **projects**, and **renders**.

**Legend:** **D** Domain · **F** Firestore · **M** Marketplace/Mapper · **R** Renderer · **P** Platform (system)

---

## RestaurantDTO

| Property | Domain | Firestore | Marketplace | Renderer |
|---|---|---|---|---|
| schemaVersion | — | — | M | R read |
| restaurantId | D generate | F store map | M emit | R read |
| slug | D | F | M | R route |
| displayName | D owner | F | M | R display |
| tagline | D owner | F | M | R display |
| description | D owner | F | M | R display |
| theme | D | F | M project | R apply tokens |
| cuisines | D owner | F | M | R display |
| priceBandLabel | D owner | F | M | R display |
| priceForTwo | D owner | F | M | R display |
| dietaryTags | D owner | F | M | R badges |
| galleryPreview | D owner | F | M slice | R rail |
| delivery.* | D policy | F | M + geo compute | R format numbers |
| businessHours.operationalStatus | D engine | F | M compute | R i18n label |
| businessHours.todayHoursLabel | D owner/projection | F | M | R display verbatim |
| businessHours.consumerMessage | D owner | F | M | R display |
| marketplace.rating | P reviews | F denorm | M | R display |
| marketplace.ratingCount | P reviews | F denorm | M | R display |
| marketplace.offers | D owner | F | M filter enabled | R displayText |
| marketplace.primaryOffer | D owner | M select | M | R displayText |
| marketplace.highlights | D owner | F | M | R display |
| marketplace.policies | D owner | F | M | R display |
| marketplace.visibility | D owner | P override | M | — |
| discovery.searchKeywords | D owner | F | M | — (SEO) |
| discovery.listingBadges | D owner | F | M | R badges |
| discovery.featuredPriority | P platform | F | M | — |

---

## FoodDTO

| Property | Domain | Firestore | Marketplace | Renderer |
|---|---|---|---|---|
| schemaVersion | — | — | M | R read |
| foodId | D | F | M | R key |
| slug | D | F | M | R future URL |
| restaurantId | D | F | M | R context |
| categoryId | D | F | M | R scroll-spy |
| name | D owner | F | M | R display |
| subtitle | D owner | F | M | R display |
| description | D owner | F | M | R clamp display |
| displayOrder | D owner | F | M sort | — |
| media.hero | D owner | F | M CDN URL | R AppetiteImage |
| media.gallery | D owner | F | M | R gallery |
| pricing.regularPrice | D owner | F | M | R format currency |
| pricing.sellingPrice | D offer engine | F | M | R strikethrough pair |
| pricing.mrp | D owner | F | M | R optional strike |
| pricing.taxIncluded | D owner | F | M | — |
| availability.status | D owner | F | M | R sold-out UI |
| availability.consumerMessage | D owner | F | M | R display |
| labels[].kind | D owner | F | M | R icon map |
| labels[].displayText | D owner | F | M | R badge text |
| offer.* | D owner | F | M enabled filter | R displayText |
| variants[] | D owner | F | M | R sheet |
| addonGroups[] | D owner | F | M resolve | R sheet |
| story.* | D owner | F | M | R story panel |
| nutrition.* | D owner | F | M | R optional |
| allergens.* | D owner | F | M | R optional |
| metadata.dietary | D owner | F | M | R veg icon |
| metadata.spiceLevel | D owner | F | M | R optional |
| metadata.preparationMinutes | D owner | F | M | R optional |
| metadata.rating | P reviews | F | M | R optional |

---

## CategoryDTO

| Property | Domain | Firestore | Marketplace | Renderer |
|---|---|---|---|---|
| categoryId | D | F | M | R rail id |
| name | D owner | F | M | R chip text |
| image | D owner | F | M | R chip image |
| icon | D owner | F | M | R chip icon |
| displayOrder | D owner | F | M sort | — |
| visibility | D owner | F | M filter | — |
| schedule | D owner | F | M filter | — |
| itemCount | D denorm | F | M aggregate | R count badge |
| parentCategoryId | D owner | F | M | R hierarchy |

---

## OfferDTO

| Property | Domain | Firestore | Marketplace | Renderer |
|---|---|---|---|---|
| offerId | D | F | M | — |
| enabled | D owner | F | M always true if present | — |
| displayText | D owner | F | M verbatim | R verbatim |
| badge | D owner | F | M | R pill |
| description | D owner | F | M | R detail |
| priority | D owner | F | M sort | — |
| validity | D owner | F | M filter window | — |
| type | D owner | F | M | R icon hint only |

---

## VariantDTO

| Property | Domain | Firestore | Marketplace | Renderer |
|---|---|---|---|---|
| variantId | D | F | M | R selection |
| kind | D owner | F | M | — analytics |
| displayName | D owner | F | M | R button label |
| priceDelta | D owner | F | M compute | R sum display |
| absolutePrice | D owner | F | M | R override display |
| availability | D owner | F | M | R disable option |
| sortOrder | D owner | F | M sort | — |
| isDefault | D owner | F | M | R preselect |

---

## AddonGroupDTO / AddonOptionDTO

| Property | Domain | Firestore | Marketplace | Renderer |
|---|---|---|---|---|
| groupId / optionId | D | F | M | R keys |
| displayName | D owner | F | M | R labels |
| selectionRules | D owner | F | M | R enforce UI |
| pricing.price | D owner | F | M | R +₹ format |
| maxQuantity | D owner | F | M | R stepper max |

---

## ThemeDTO / GalleryDTO / ImageDTO

| Property | Domain | Firestore | Marketplace | Renderer |
|---|---|---|---|---|
| colors.* | D owner | F | M | R CSS variables |
| logo / cover | D owner | F storage | M CDN | R image |
| gallery caption | D owner | F | M | R figcaption |
| image.url | D owner media | F storage | M | R srcset base |
| image.blurHash | P pipeline | F | M | R placeholder |

---

## Error DTO

| Property | Domain | Firestore | Marketplace | Renderer |
|---|---|---|---|---|
| error.code | M contract | — | M emit | R empty state |
| error.message | M contract | — | M emit | R user message |
| error.details | M validation | — | M emit | R dev only |

---

## Summary rule

| Question | Answer |
|---|---|
| Who owns `displayText` on offers? | **Domain (owner)** |
| Who formats `₹249`? | **Renderer** from `MoneyDTO` |
| Who computes ETA numbers? | **Marketplace** from delivery domain + geo |
| Who assigns `schemaVersion`? | **Marketplace mapper** at emit time |
| Who stores Firestore paths in API? | **Nobody** |

---

*If a property is not listed in Domain as owner-writable, OrderBhojan must not display an invented value.*
