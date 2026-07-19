import type { CartLine } from '@/features/cart/store/cartStore';
import { buildCartLineId, useCartStore } from '@/features/cart/store/cartStore';

export interface CartValidationIssue {
  readonly itemId: string;
  readonly code: 'NOT_FOUND' | 'UNAVAILABLE' | 'PRICE_CHANGED' | 'ID_UPDATED';
  readonly message: string;
  readonly resolvedItemId?: string;
}

export interface CartValidationSyncInput {
  readonly issues: readonly CartValidationIssue[];
  readonly resolvedLines?: readonly {
    readonly itemId: string;
    readonly quantity: number;
    readonly unitPrice?: number;
    readonly name?: string;
  }[];
}

export function applyCartValidationResult(
  lines: readonly CartLine[],
  result: CartValidationSyncInput,
): readonly string[] {
  const messages: string[] = [];
  const store = useCartStore.getState();
  let nextLines = [...lines];

  const removeFoodIds = new Set(
    result.issues
      .filter((issue) => issue.code === 'NOT_FOUND' || issue.code === 'UNAVAILABLE')
      .map((issue) => issue.itemId),
  );

  if (removeFoodIds.size > 0) {
    for (const foodId of removeFoodIds) {
      const removed = nextLines.filter((line) => line.foodId === foodId);
      if (removed.length === 0) continue;
      const label = removed[0]?.name ?? 'An item';
      const issue = result.issues.find((entry) => entry.itemId === foodId);
      messages.push(
        issue?.code === 'UNAVAILABLE'
          ? `${label} is currently unavailable and was removed from your cart.`
          : `${label} is no longer on the menu and was removed from your cart.`,
      );
    }
    nextLines = nextLines.filter((line) => !removeFoodIds.has(line.foodId));
  }

  for (const issue of result.issues.filter((entry) => entry.code === 'ID_UPDATED')) {
    const resolvedItemId = issue.resolvedItemId?.trim();
    if (!resolvedItemId || resolvedItemId === issue.itemId) continue;

    const resolvedLine = result.resolvedLines?.find((line) => line.itemId === resolvedItemId);
    nextLines = nextLines.map((line) => {
      if (line.foodId !== issue.itemId) return line;
      const nextPrice = resolvedLine?.unitPrice ?? line.price;
      const nextLine = {
        ...line,
        foodId: resolvedItemId,
        price: nextPrice,
        lineId: buildCartLineId({
          foodId: resolvedItemId,
          variantId: line.variantId,
          addons: line.addons,
          instructions: line.instructions,
        }),
      };
      return nextLine;
    });
    const label = lines.find((line) => line.foodId === issue.itemId)?.name ?? 'An item';
    messages.push(`${label} was refreshed to match the latest menu.`);
  }

  for (const issue of result.issues.filter((entry) => entry.code === 'PRICE_CHANGED')) {
    const resolvedLine = result.resolvedLines?.find((line) => line.itemId === issue.itemId);
    if (resolvedLine?.unitPrice == null) continue;
    nextLines = nextLines.map((line) =>
      line.foodId === issue.itemId ? { ...line, price: resolvedLine.unitPrice! } : line,
    );
    const label = lines.find((line) => line.foodId === issue.itemId)?.name ?? 'An item';
    messages.push(`${label} price was updated to ₹${resolvedLine.unitPrice}.`);
  }

  if (messages.length > 0 || nextLines.length !== lines.length) {
    useCartStore.setState({
      lines: nextLines,
      visible: nextLines.length > 0,
    });
  }

  return messages;
}
