import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type {
  StorefrontAddonGroupSnapshot,
  StorefrontAddonOptionSnapshot,
  StorefrontVariantSnapshot,
} from '../../domain/storefront/menu-item-projection';
import {
  VARIANT_KIND_OPTIONS,
  createAddonGroupDraft,
  createAddonOptionDraft,
  createVariantDraft,
} from '../../lib/menuItemOptions';

export interface MenuItemOptionsEditorProps {
  readonly basePrice: number;
  readonly variants: StorefrontVariantSnapshot[];
  readonly addonGroups: StorefrontAddonGroupSnapshot[];
  readonly onVariantsChange: (variants: StorefrontVariantSnapshot[]) => void;
  readonly onAddonGroupsChange: (groups: StorefrontAddonGroupSnapshot[]) => void;
}

export const MenuItemOptionsEditor: React.FC<MenuItemOptionsEditorProps> = ({
  basePrice,
  variants,
  addonGroups,
  onVariantsChange,
  onAddonGroupsChange,
}) => {
  const updateVariant = (index: number, patch: Partial<StorefrontVariantSnapshot>) => {
    onVariantsChange(variants.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  };

  const removeVariant = (index: number) => {
    onVariantsChange(variants.filter((_, i) => i !== index));
  };

  const updateGroup = (groupIndex: number, patch: Partial<StorefrontAddonGroupSnapshot>) => {
    onAddonGroupsChange(
      addonGroups.map((group, i) => (i === groupIndex ? { ...group, ...patch } : group)),
    );
  };

  const updateOption = (
    groupIndex: number,
    optionIndex: number,
    patch: Partial<StorefrontAddonOptionSnapshot>,
  ) => {
    onAddonGroupsChange(
      addonGroups.map((group, gi) => {
        if (gi !== groupIndex) return group;
        return {
          ...group,
          options: group.options.map((option, oi) =>
            oi === optionIndex ? { ...option, ...patch } : option,
          ),
        };
      }),
    );
  };

  const removeGroup = (groupIndex: number) => {
    onAddonGroupsChange(addonGroups.filter((_, i) => i !== groupIndex));
  };

  const removeOption = (groupIndex: number, optionIndex: number) => {
    onAddonGroupsChange(
      addonGroups.map((group, gi) => {
        if (gi !== groupIndex) return group;
        return { ...group, options: group.options.filter((_, oi) => oi !== optionIndex) };
      }),
    );
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">Sizes &amp; variants</h3>
            <p className="text-xs text-white/45 mt-0.5">Half / full, portion sizes — synced to OrderBhojan.</p>
          </div>
          <button
            type="button"
            onClick={() => onVariantsChange([...variants, createVariantDraft(basePrice)])}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold transition-colors"
          >
            <Plus size={14} />
            Add size
          </button>
        </div>

        {variants.length === 0 ? (
          <p className="text-xs text-white/40 italic">No variants — customers see base price only.</p>
        ) : (
          <div className="space-y-3">
            {variants.map((variant, index) => (
              <div
                key={variant.variantId ?? index}
                className="grid grid-cols-1 sm:grid-cols-[7rem_1fr_6rem_6rem_auto] gap-2 items-end"
              >
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">Kind</label>
                  <select
                    value={variant.kind}
                    onChange={(e) => {
                      const kind = e.target.value;
                      const label =
                        VARIANT_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? kind;
                      updateVariant(index, { kind, displayName: variant.displayName || label });
                    }}
                    className="w-full bg-[#151515] border border-white/10 rounded-lg px-2 py-2 text-sm"
                  >
                    {VARIANT_KIND_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-[#0f0f11]">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">Label</label>
                  <input
                    type="text"
                    value={variant.displayName}
                    onChange={(e) => updateVariant(index, { displayName: e.target.value })}
                    placeholder="Full plate"
                    className="w-full bg-[#151515] border border-white/10 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">Price ₹</label>
                  <input
                    type="number"
                    min={0}
                    value={variant.price}
                    onChange={(e) => updateVariant(index, { price: Number(e.target.value) })}
                    className="w-full bg-[#151515] border border-white/10 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">Offer ₹</label>
                  <input
                    type="number"
                    min={0}
                    value={variant.offerPrice ?? ''}
                    onChange={(e) =>
                      updateVariant(index, {
                        offerPrice: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                    placeholder="Optional"
                    className="w-full bg-[#151515] border border-white/10 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeVariant(index)}
                  className="p-2 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  aria-label="Remove variant"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">Add-on groups</h3>
            <p className="text-xs text-white/45 mt-0.5">Extra raita, egg, etc. — grouped for customer selection.</p>
          </div>
          <button
            type="button"
            onClick={() => onAddonGroupsChange([...addonGroups, createAddonGroupDraft()])}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold transition-colors"
          >
            <Plus size={14} />
            Add group
          </button>
        </div>

        {addonGroups.length === 0 ? (
          <p className="text-xs text-white/40 italic">No add-ons configured.</p>
        ) : (
          <div className="space-y-4">
            {addonGroups.map((group, groupIndex) => (
              <div key={group.groupId ?? groupIndex} className="rounded-lg border border-white/10 p-3 space-y-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[10rem]">
                    <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">Group name</label>
                    <input
                      type="text"
                      value={group.displayName}
                      onChange={(e) => updateGroup(groupIndex, { displayName: e.target.value })}
                      placeholder="Extras"
                      className="w-full bg-[#151515] border border-white/10 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs text-white/60 pb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={group.required === true}
                      onChange={(e) => updateGroup(groupIndex, { required: e.target.checked })}
                      className="rounded border-white/20"
                    />
                    Required
                  </label>
                  <button
                    type="button"
                    onClick={() => removeGroup(groupIndex)}
                    className="p-2 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    aria-label="Remove add-on group"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="space-y-2">
                  {group.options.map((option, optionIndex) => (
                    <div
                      key={option.optionId ?? optionIndex}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_6rem_auto] gap-2 items-end"
                    >
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">Option</label>
                        <input
                          type="text"
                          value={option.displayName}
                          onChange={(e) =>
                            updateOption(groupIndex, optionIndex, { displayName: e.target.value })
                          }
                          placeholder="Extra raita"
                          className="w-full bg-[#151515] border border-white/10 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">Price ₹</label>
                        <input
                          type="number"
                          min={0}
                          value={option.price}
                          onChange={(e) =>
                            updateOption(groupIndex, optionIndex, { price: Number(e.target.value) })
                          }
                          className="w-full bg-[#151515] border border-white/10 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeOption(groupIndex, optionIndex)}
                        className="p-2 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        aria-label="Remove add-on option"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    updateGroup(groupIndex, { options: [...group.options, createAddonOptionDraft()] })
                  }
                  className="text-xs font-semibold text-white/60 hover:text-white transition-colors"
                >
                  + Add option
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
