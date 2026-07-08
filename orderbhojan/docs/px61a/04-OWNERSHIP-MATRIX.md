# 04 — Ownership Matrix

Who owns, who reads, who writes each domain concern.

---

## Legend

| Symbol | Meaning |
|---|---|
| **O-W** | Owner writes |
| **O-R** | Owner reads |
| **P-W** | Platform/system writes |
| **P-R** | Platform reads |
| **C-R** | Consumer reads (via projection) |
| **X** | Not applicable / not exposed |

---

## Restaurant concerns

| Concern | Owner | Platform | Consumer | Notes |
|---|---|---|---|---|
| Display name | O-W | P-R | C-R | |
| Legal name | O-W | P-R | X | Compliance only |
| Slug | O-W | P-R | C-R | Immutable after publish |
| Description | O-W | P-R | C-R | |
| Cuisines | O-W | P-R | C-R | |
| Logo / cover | O-W | P-R | C-R | |
| Brand colors | O-W | P-R | C-R | Theme tokens |
| Gallery | O-W | P-R | C-R | |
| Highlights | O-W | P-R | C-R | |
| Featured products | O-W | P-R | C-R | |
| Today's specials | O-W | P-R | C-R | |
| Listing badges | O-W | P-W | C-R | Some system-verified |
| Rating / count | O-R | P-W | C-R | Reviews domain |
| FSSAI / KYC | O-W | P-W | C-R | Badge derived |
| Marketplace visibility | O-W | P-W | X | Platform can feature |
| Price band | O-W | P-W | C-R | Platform may override label |

---

## Operations & hours

| Concern | Owner | Platform | Consumer |
|---|---|---|---|
| Manual open/closed toggle | O-W | P-R | C-R |
| Weekly schedule | O-W | P-R | C-R |
| Festival overrides | O-W | P-R | C-R |
| Vacation mode | O-W | P-R | C-R |
| Emergency closure | O-W | P-W | C-R |
| Operational status label | X | P-W | C-R | Derived by status engine |
| Accepting orders | O-W | P-R | C-R |

---

## Delivery

| Concern | Owner | Platform | Consumer |
|---|---|---|---|
| Delivery enabled | O-W | P-R | C-R |
| Zones / radius | O-W | P-R | X |
| Base fee / per km | O-W | P-R | C-R |
| Free delivery threshold | O-W | P-R | C-R |
| Prep time default | O-W | P-R | C-R |
| ETA (computed) | X | P-W | C-R | Geo + policy |
| Distance (computed) | X | P-W | C-R | Geo |
| Pickup enabled | O-W | P-R | C-R |
| Minimum order | O-W | P-R | C-R |
| Packaging fee | O-W | P-R | C-R |

---

## Category

| Concern | Owner | Platform | Consumer |
|---|---|---|---|
| Name / slug | O-W | P-R | C-R |
| Image / icon | O-W | P-R | C-R |
| Display order | O-W | P-R | C-R |
| Visibility / schedule | O-W | P-R | C-R |
| Hierarchy | O-W | P-R | C-R |
| Item count | X | P-W | C-R | Denormalized |

---

## Food product

| Concern | Owner | Platform | Consumer |
|---|---|---|---|
| Name / description | O-W | P-R | C-R |
| Media | O-W | P-R | C-R |
| Regular / selling price | O-W | P-R | C-R |
| MRP | O-W | P-R | C-R |
| Availability status | O-W | P-W | C-R |
| Inventory count | O-W | P-W | C-R |
| Labels | O-W | P-R | C-R |
| Spice / prep / serving | O-W | P-R | C-R |
| Story / ingredients | O-W | P-R | C-R |
| Nutrition / allergens | O-W | P-R | C-R |
| Variants | O-W | P-R | C-R |
| Addon group links | O-W | P-R | C-R |
| Product offer link | O-W | P-R | C-R |
| Dietary classification | O-W | P-R | C-R |
| Display order | O-W | P-R | C-R |
| Product rating | O-R | P-W | C-R | Reviews domain |

---

## Offers

| Concern | Owner | Platform | Consumer |
|---|---|---|---|
| Offer enabled | O-W | P-R | X | Gates render |
| Offer text / badge | O-W | P-R | C-R | **Never computed** |
| Offer type / amount | O-W | P-R | X | Drives pricing engine |
| Schedule | O-W | P-W | X | |
| Scope (rest/cat/product) | O-W | P-R | X | |
| Auto-apply | O-W | P-W | X | Checkout scope |

---

## Addons

| Concern | Owner | Platform | Consumer |
|---|---|---|---|
| Group name | O-W | P-R | C-R |
| Selection rules | O-W | P-R | C-R |
| Option label / price | O-W | P-R | C-R |
| Option availability | O-W | P-W | C-R |

---

## OrderBhojan (renderer) — owns ONLY

| Concern | Owner | Platform | OrderBhojan |
|---|---|---|---|
| Layout / motion / a11y | X | X | **Owns** |
| Responsive breakpoints | X | X | **Owns** |
| BlurHash pipeline | X | P-R | **Owns application** |
| Image srcset generation | X | P-R | **Owns application** |
| Offer text | X | X | **Never owns** |
| Prices | X | X | **Never owns** |
| Labels | X | X | **Never owns** |
| Hours | X | X | **Never owns** |

---

## Checkout coupons (out of PX6.1 scope)

| Concern | Owner | Consumer marketplace |
|---|---|---|
| Coupon codes | O-W | X — checkout only |
| Marketplace offer pills | O-W | C-R — separate Offer aggregate |

Coupons and marketplace offers **must not share** consumer display logic.
