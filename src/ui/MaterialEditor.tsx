import type { Material } from '../physics/types';
import { MATERIAL_PRESETS, getPreset } from '../physics/materials';
import { NumberField } from './fields';

// Trình sửa thuộc tính vật liệu. Store giữ SI; ở đây đổi sang đơn vị kỹ thuật quen thuộc.

interface Props {
  title: string;
  mat: Material;
  onPatch: (m: Partial<Material>) => void;
  onReplace: (m: Material) => void;
}

export function MaterialEditor({ title, mat, onPatch, onReplace }: Props) {
  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/90">{title}</h3>
        <select
          className="field-input max-w-[55%]"
          value={MATERIAL_PRESETS.find((p) => p.name === mat.name)?.id ?? ''}
          onChange={(e) => {
            const p = getPreset(e.target.value);
            if (p) onReplace(p);
          }}
        >
          <option value="">— preset —</option>
          {MATERIAL_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <label className="block">
        <span className="field-label">Tên vật liệu</span>
        <input
          className="field-input"
          value={mat.name}
          onChange={(e) => onPatch({ name: e.target.value })}
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Điện trở suất"
          unit="µΩ·cm"
          decimals={2}
          step={0.5}
          value={mat.resistivity20 * 1e8}
          onChange={(v) => onPatch({ resistivity20: v / 1e8 })}
        />
        <NumberField
          label="Hệ số nhiệt ĐT-suất"
          unit="1/K"
          decimals={4}
          step={0.0005}
          value={mat.resistivityTempCoeff}
          onChange={(v) => onPatch({ resistivityTempCoeff: v })}
        />
        <NumberField
          label="Khối lượng riêng"
          unit="kg/m³"
          step={10}
          value={mat.density}
          onChange={(v) => onPatch({ density: v })}
        />
        <NumberField
          label="Nhiệt dung riêng"
          unit="J/kg·K"
          step={5}
          value={mat.specificHeat}
          onChange={(v) => onPatch({ specificHeat: v })}
        />
        <NumberField
          label="Độ dẫn nhiệt"
          unit="W/m·K"
          step={1}
          value={mat.thermalConductivity}
          onChange={(v) => onPatch({ thermalConductivity: v })}
        />
        <NumberField
          label="Nhiệt độ nóng chảy"
          unit="°C"
          step={5}
          value={mat.meltingPoint - 273.15}
          onChange={(v) => onPatch({ meltingPoint: v + 273.15 })}
        />
        <NumberField
          label="Ẩn nhiệt nóng chảy"
          unit="kJ/kg"
          step={5}
          value={mat.latentHeatFusion / 1000}
          onChange={(v) => onPatch({ latentHeatFusion: v * 1000 })}
        />
        <NumberField
          label="Giãn nở nhiệt"
          unit="µm/m·K"
          decimals={2}
          step={0.5}
          value={mat.thermalExpansion * 1e6}
          onChange={(v) => onPatch({ thermalExpansion: v / 1e6 })}
        />
        <NumberField
          label="Bền kéo UTS"
          unit="MPa"
          step={10}
          value={mat.ultimateTensileStrength / 1e6}
          onChange={(v) => onPatch({ ultimateTensileStrength: v * 1e6 })}
        />
        <NumberField
          label="Giới hạn chảy"
          unit="MPa"
          step={10}
          value={mat.yieldStrength / 1e6}
          onChange={(v) => onPatch({ yieldStrength: v * 1e6 })}
        />
      </div>
    </div>
  );
}
