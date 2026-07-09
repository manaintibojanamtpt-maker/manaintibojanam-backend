# Design Review Workflow

## Owner

Design Review Board (DRB)

## When Required

- Every UI/UX milestone before implementation
- BDS extension proposals
- Premium experience evolutions (with Experience Evolution agent)
- Cross-product visual consistency audits

## Review Process

### 1. Intake

**Inputs:**

- Product Manager milestone template + acceptance criteria
- Experience Evolution visual brief (if applicable)
- Reference screenshots / Mana Inti patterns
- Mobile-first wireframe or existing shell description

### 2. BDS Compliance

| Check | Requirement |
|-------|-------------|
| Components | `@bhojan/design-system` only |
| Tokens | CSS variables `--bds-*` |
| Typography | BDS scale |
| Spacing | 4px grid / BDS spacing tokens |
| Color | Bhojan orange identity preserved |
| Dark mode | Must work in both themes |

**Block:** Custom Button, Card, Input, Modal in app code.

### 3. UX Review

- Food-first imagery hierarchy
- Thumb-zone navigation (mobile)
- Guest vs authenticated flows clear
- Error and empty states designed
- Loading skeletons where appropriate

### 4. Accessibility Preview

DRB coordinates with Accessibility agent:

- Color contrast intent (WCAG AA)
- Focus order plan
- Reduced motion alternative
- Touch target sizes ≥ 44px

### 5. Motion Intent

For animated milestones, DRB defines intent for Motion agent:

- Transition duration ranges
- Scroll-linked chrome behavior
- Bottom sheet / floating cart patterns
- `prefers-reduced-motion` fallback

### 6. Sign-Off

**Outputs:**

- [design-review.md](../templates/design-review.md)
- GO / NO-GO / GO WITH CONDITIONS
- BDS gap list (if tokens/components missing)

## Design Rules (Non-Negotiable)

1. **Mobile-first** — design for 375px, enhance for desktop.
2. **Warm Bhojan identity** — orange accent, food photography, approachable tone.
3. **No backend changes** from design milestones.
4. **Mock data OK** for shell milestones — label clearly in docs.
5. **Premium ≠ cluttered** — whitespace and hierarchy over decoration.

## Block Conditions

DRB blocks when:

- Custom UI primitives proposed without BDS ADR
- Brand colors diverge from BDS tokens
- Desktop-only layout without mobile plan
- Motion without reduced-motion fallback plan
- Accessibility not considered

## Escalation

- BDS gap → Design System agent
- Major brand change → CEO + Experience Evolution
- Performance-heavy visuals → Performance agent consult

## Checklist

- [ ] BDS components only
- [ ] Dark mode verified in design intent
- [ ] Responsive breakpoints defined
- [ ] Empty/error/loading states specified
- [ ] Motion intent documented (if applicable)
- [ ] Accessibility considerations noted
- [ ] Experience Evolution brief aligned (premium milestones)
