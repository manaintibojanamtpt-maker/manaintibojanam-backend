import { SoftButton } from '../primitives/SoftButton';
import { SectionHeader } from '../primitives/SectionHeader';
import { CustomizationToggleButton, QuantityStepperView } from '../primitives/QuantityStepperView';
import { FoodCustomizationStoryView } from './FoodCustomizationStoryView';
import type { CustomizationOptionViewModel, FoodCustomizationPanelViewModel } from './types';

export interface FoodCustomizationPanelViewProps {
  readonly model: FoodCustomizationPanelViewModel;
  readonly onSelectVariant: (id: string) => void;
  readonly onToggleAddon: (id: string) => void;
  readonly onQuantityChange: (quantity: number) => void;
  readonly onInstructionsChange: (value: string) => void;
  readonly onConfirm: () => void;
}

function SegmentVariants({
  options,
  onSelect,
}: {
  readonly options: readonly CustomizationOptionViewModel[];
  readonly onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Choose size">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={option.selected}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            option.selected
              ? 'border-[#FF7A00]/50 bg-[#FF7A00]/15 text-white'
              : 'border-white/10 bg-white/5 text-white/70 hover:border-[#FF7A00]/30'
          }`}
          onClick={() => onSelect(option.id)}
        >
          {option.label}
          {option.priceLabel ? ` · ${option.priceLabel}` : ''}
        </button>
      ))}
    </div>
  );
}

function ListOptionRow({
  option,
  onPress,
}: {
  readonly option: CustomizationOptionViewModel;
  readonly onPress: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
        option.selected
          ? 'border-[#FF7A00]/40 bg-[#FF7A00]/10'
          : 'border-white/10 bg-white/[0.03] hover:border-white/20'
      }`}
      aria-pressed={option.selected}
      onClick={onPress}
    >
      <span className="text-sm font-semibold text-white">{option.label}</span>
      {option.priceLabel ? (
        <span className="shrink-0 rounded-full bg-[#FF7A00]/15 px-2 py-0.5 text-xs font-bold text-[#F4C27A]">
          {option.priceLabel}
        </span>
      ) : null}
    </button>
  );
}

export function FoodCustomizationPanelView({
  model,
  onSelectVariant,
  onToggleAddon,
  onQuantityChange,
  onInstructionsChange,
  onConfirm,
}: FoodCustomizationPanelViewProps) {
  return (
    <div className="flex flex-col pb-4 text-white">
      {model.heroBlurUrl ? (
        <div
          className="-mx-6 mb-4 h-28 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url(${model.heroBlurUrl})` }}
          aria-hidden
        />
      ) : null}

      {model.story ? <FoodCustomizationStoryView story={model.story} /> : null}

      {model.showVariantSection ? (
        <section className="mb-6" aria-label={model.variantSectionTitle}>
          <SectionHeader title={model.variantSectionTitle} align="left" className="!mb-3 !text-left" />
          {model.variantMode === 'segment' ? (
            <SegmentVariants options={model.variantOptions} onSelect={onSelectVariant} />
          ) : (
            <div className="flex flex-col gap-2">
              {model.variantOptions.map((option) => (
                <ListOptionRow
                  key={option.id}
                  option={option}
                  onPress={() => onSelectVariant(option.id)}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {model.showAddonSection ? (
        <section className="mb-6" aria-label={model.addonSectionTitle}>
          <SectionHeader title={model.addonSectionTitle} align="left" className="!mb-3 !text-left" />
          <div className="flex flex-col gap-2">
            {model.addonOptions.map((option) => (
              <div
                key={option.id}
                className="flex items-center justify-between gap-3 border-b border-white/5 py-3 last:border-b-0"
              >
                <div>
                  <p className="text-sm font-bold text-white">{option.label}</p>
                  {option.priceLabel ? (
                    <p className="text-xs font-medium text-white/50">{option.priceLabel}</p>
                  ) : null}
                </div>
                <CustomizationToggleButton
                  selected={option.selected}
                  label={`${option.selected ? 'Remove' : 'Add'} ${option.label}`}
                  onToggle={() => onToggleAddon(option.id)}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mb-6" aria-label="Quantity">
        <SectionHeader title="Quantity" align="left" className="!mb-3 !text-left" />
        <QuantityStepperView
          value={model.quantity}
          ariaLabel={model.quantityAriaLabel}
          onChange={onQuantityChange}
        />
      </section>

      {model.spiceNote ? (
        <p className="mb-4 text-xs font-medium uppercase tracking-wide text-white/50">{model.spiceNote}</p>
      ) : null}

      <section className="mb-6" aria-label="Special instructions">
        <SectionHeader title="Special instructions" align="left" className="!mb-3 !text-left" />
        <textarea
          className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#FF7A00]/40 focus:outline-none focus:ring-1 focus:ring-[#FF7A00]/30"
          rows={3}
          placeholder={model.instructionsPlaceholder}
          value={model.instructions}
          onChange={(event) => onInstructionsChange(event.target.value)}
        />
      </section>

      <div className="sticky bottom-0 -mx-6 border-t border-white/10 bg-[#0d0d0d] px-6 pb-safe pt-4">
        <div className="mb-3 flex items-end justify-between gap-4">
          <p className="text-xs text-white/50">{model.unitPriceSummary}</p>
          <p className="text-xl font-black text-white tabular-nums" aria-live="polite">
            {model.lineTotalLabel}
          </p>
        </div>
        <SoftButton type="button" fullWidth onClick={onConfirm} aria-label={model.confirmLabel}>
          {model.confirmLabel}
        </SoftButton>
      </div>
    </div>
  );
}
