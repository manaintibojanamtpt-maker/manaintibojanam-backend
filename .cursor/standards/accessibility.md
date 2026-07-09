# Accessibility Standards

## Target

**WCAG 2.1 Level AA** for all customer-facing surfaces (OrderBhojan priority).

## Requirements

### Perceivable

- Text contrast ≥ 4.5:1 (normal), 3:1 (large text)
- Images have meaningful `alt` or `alt=""` if decorative
- Color is not sole indicator of state

### Operable

- Full keyboard navigation
- Visible focus indicators (BDS focus ring)
- Touch targets ≥ 44×44 CSS pixels
- No keyboard traps in modals/sheets

### Understandable

- Form labels associated with inputs
- Error messages linked via `aria-describedby`
- Consistent navigation patterns

### Robust

- Valid semantic HTML
- ARIA roles only when HTML semantics insufficient
- Test with screen reader smoke (VoiceOver / NVDA)

## Motion

```css
@media (prefers-reduced-motion: reduce) {
  /* disable or simplify animations */
}
```

Motion agent implements; Accessibility agent verifies.

## Dark Mode

- Contrast re-checked in dark theme
- Focus rings visible on dark backgrounds

## Testing

| Check | Method |
|-------|--------|
| Automated | axe-core in CI (when configured) |
| Manual | Keyboard-only navigation |
| Manual | Screen reader spot check |
| Manual | 200% zoom readability |

## BDS

Use BDS components — they encode baseline a11y. Do not strip ARIA from BDS wrappers.

## Milestone Checklist

- [ ] All interactive elements keyboard reachable
- [ ] Focus order logical
- [ ] Images have alt text
- [ ] Forms labeled
- [ ] Reduced motion respected
- [ ] Dark mode contrast OK

## Related

- Agent: [agents/11-accessibility.md](../agents/11-accessibility.md)
- Workflow: [workflows/design-review.md](../workflows/design-review.md)
