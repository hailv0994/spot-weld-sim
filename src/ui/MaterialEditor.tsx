import { useRef, useState } from 'react';
import type { Material } from '../physics/types';
import { searchMaterials, getPreset } from '../physics/materials';
import { NumberField } from './fields';

// Nhập mã vật liệu → tự điền thông số. Vẫn sửa tay từng trường nếu cần.

interface Props {
  title: string;
  mat: Material;
  onPatch: (m: Partial<Material>) => void;
  onReplace: (m: Material) => void;
}

export function MaterialEditor({ title, mat, onPatch, onReplace }: Props) {
  const [query, setQuery] = useState(mat.id);
  const [open, setOpen] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = searchMaterials(query).slice(0, 8);

  function select(id: string) {
    const p = getPreset(id);
    if (!p) return;
    onReplace(p);
    setQuery(p.id);
    setOpen(false);
  }

  function onBlur() {
    // Delay để click vào suggestion kịp xử lý trước khi đóng
    blurTimer.current = setTimeout(() => setOpen(false), 150);
  }

  function onFocus() {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setOpen(true);
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="shrink-0 text-sm font-semibold text-white/90">{title}</h3>
        <button
          className="text-[11px] text-white/40 hover:text-white/70"
          onClick={() => setShowDetail((v) => !v)}
        >
          {showDetail ? '▲ Ẩn chi tiết' : '▼ Chi tiết'}
        </button>
      </div>

      {/* Ô tìm kiếm mã vật liệu */}
      <div className="relative">
        <input
          className="field-input w-full pr-6"
          placeholder="Nhập mã: SPCC, DP980, SUS304, Al6061…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={onFocus}
          onBlur={onBlur}
          spellCheck={false}
        />
        {query && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70"
            onMouseDown={(e) => { e.preventDefault(); setQuery(''); setOpen(true); }}
          >
            ✕
          </button>
        )}
        {open && suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full rounded border border-white/10 bg-[#1a2030] shadow-xl">
            {suggestions.map((m) => (
              <li key={m.id}>
                <button
                  className="flex w-full items-baseline gap-2 px-3 py-1.5 text-left hover:bg-white/10"
                  onMouseDown={(e) => { e.preventDefault(); select(m.id); }}
                >
                  <span className="font-mono text-xs font-semibold text-sky-300">{m.id.toUpperCase()}</span>
                  <span className="truncate text-[11px] text-white/50">{m.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Badge tóm tắt vật liệu đang chọn */}
      <div className="flex flex-wrap gap-2 text-[11px] text-white/60">
        <span className="rounded bg-white/5 px-2 py-0.5">
          UTS <strong className="text-white/80">{(mat.ultimateTensileStrength / 1e6).toFixed(0)} MPa</strong>
        </span>
        <span className="rounded bg-white/5 px-2 py-0.5">
          ρ <strong className="text-white/80">{(mat.resistivity20 * 1e8).toFixed(1)} µΩ·cm</strong>
        </span>
        <span className="rounded bg-white/5 px-2 py-0.5">
          λ <strong className="text-white/80">{mat.thermalConductivity} W/m·K</strong>
        </span>
        <span className="rounded bg-white/5 px-2 py-0.5">
          T<sub>melt</sub> <strong className="text-white/80">{(mat.meltingPoint - 273.15).toFixed(0)} °C</strong>
        </span>
      </div>

      {/* Chi tiết các trường — ẩn mặc định */}
      {showDetail && (
        <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-2">
          <label className="col-span-2 block">
            <span className="field-label">Tên hiển thị</span>
            <input className="field-input" value={mat.name} onChange={(e) => onPatch({ name: e.target.value })} />
          </label>
          <NumberField label="Điện trở suất" unit="µΩ·cm" decimals={2} step={0.5}
            value={mat.resistivity20 * 1e8} onChange={(v) => onPatch({ resistivity20: v / 1e8 })} />
          <NumberField label="Hệ số nhiệt ĐT-suất" unit="1/K" decimals={4} step={0.0005}
            value={mat.resistivityTempCoeff} onChange={(v) => onPatch({ resistivityTempCoeff: v })} />
          <NumberField label="Khối lượng riêng" unit="kg/m³" step={10}
            value={mat.density} onChange={(v) => onPatch({ density: v })} />
          <NumberField label="Nhiệt dung riêng" unit="J/kg·K" step={5}
            value={mat.specificHeat} onChange={(v) => onPatch({ specificHeat: v })} />
          <NumberField label="Độ dẫn nhiệt" unit="W/m·K" step={1}
            value={mat.thermalConductivity} onChange={(v) => onPatch({ thermalConductivity: v })} />
          <NumberField label="Nhiệt độ nóng chảy" unit="°C" step={5}
            value={mat.meltingPoint - 273.15} onChange={(v) => onPatch({ meltingPoint: v + 273.15 })} />
          <NumberField label="Ẩn nhiệt nóng chảy" unit="kJ/kg" step={5}
            value={mat.latentHeatFusion / 1000} onChange={(v) => onPatch({ latentHeatFusion: v * 1000 })} />
          <NumberField label="Giãn nở nhiệt" unit="µm/m·K" decimals={2} step={0.5}
            value={mat.thermalExpansion * 1e6} onChange={(v) => onPatch({ thermalExpansion: v / 1e6 })} />
          <NumberField label="Bền kéo UTS" unit="MPa" step={10}
            value={mat.ultimateTensileStrength / 1e6} onChange={(v) => onPatch({ ultimateTensileStrength: v * 1e6 })} />
          <NumberField label="Giới hạn chảy" unit="MPa" step={10}
            value={mat.yieldStrength / 1e6} onChange={(v) => onPatch({ yieldStrength: v * 1e6 })} />
        </div>
      )}
    </div>
  );
}
