import { PRESET_COMBOS, type PresetCombo } from "../aiAdvisorPresets";

interface AIAdvisorPresetsProps {
  onSelectPreset: (preset: PresetCombo) => void;
}

/**
 * Danh sách bộ combo mẫu có sẵn cho chế độ chọn nhanh không cần chờ AI (UC2.4.1).
 */
export function AIAdvisorPresets({ onSelectPreset }: AIAdvisorPresetsProps) {
  return (
    <div className="card-panel cp-card cp-card--lg">
      <div className="mb-5 pb-3 border-b border-gray-100">
        <h3 className="font-display font-bold text-lg text-bark cp-card-title">
          Bộ combo mẫu tuyển chọn sẵn (Preset Combos)
        </h3>
        <p className="cp-ai-presets-desc">
          Giải pháp đóng gói sẵn theo các kịch bản dã ngoại thực tế, không cần chờ AI suy nghĩ. Quý khách có thể chọn và chỉnh sửa số lượng tùy ý.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {PRESET_COMBOS.map((preset) => (
          <div
            key={preset.id}
            className="cp-ai-preset-card"
          >
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="cp-ai-preset-tag">
                    {preset.tag}
                  </span>
                  <span className="cp-ai-preset-for">
                    {preset.suitableFor}
                  </span>
                </div>
                <h4 className="cp-ai-preset-name">
                  {preset.name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => onSelectPreset(preset)}
                className="btn btn-primary btn-sm cp-ai-preset-btn"
              >
                Chọn bộ này & Chỉnh sửa →
              </button>
            </div>

            <p className="cp-ai-preset-desc">
              {preset.description}
            </p>

            <div className="flex gap-2 flex-wrap">
              {preset.items.map((it, idx) => (
                <span
                  key={idx}
                  className="cp-ai-preset-chip"
                >
                  ✓ {it.cat}: <strong>{it.qty} chiếc</strong> ({it.reason})
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
