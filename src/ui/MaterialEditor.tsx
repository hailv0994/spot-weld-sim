import { useEffect, useState } from 'react';
import type { Material } from '../physics/types';
import { resolveMaterial } from '../physics/materialInference';
import { NumberField } from './fields';

// Nhập mã vật liệu tiêu chuẩn → tự phân tích thông số (CSDL hoặc suy luận theo họ).
// Không gợi ý; user tự điền mã. Vẫn mở "Chi tiết" để sửa tay nếu cần.

interface Props {
  title: string;
  mat: Material;
  onPatch: (m: Partial<Material>) => void;
  onReplace: (m: Material) => void;
}

type MatchState =
  | { kind: 'idle' }
  | { kind: 'preset'; family: string }
  | { kind: 'inferred'; family: string }
  | { kind: 'notfound' };

export function MaterialEditor({ title, mat, onPatch, onReplace }: Props) {
  const [code, setCode] = useState(mat.id);
  const [match, setMatch] = useState<MatchState>({ kind: 'idle' });
  const [showDetail, setShowDetail] = useState(false);

  // Đồng bộ ô mã khi vật liệu bị thay từ ngoài (preset/AI).
  useEffect(() => setCode(mat.id), [mat.id]);

  function apply(raw: string) {
    setCode(raw);
    if (!raw.trim()) {
      setMatch({ kind: 'idle' });
      return;
    }
    const r = resolveMaterial(raw);
    if (!r) {
      setMatch({ kind: 'notfound' });
      return;
    }
    onReplace(r.material);
    setMatch(r.source === 'preset'
      ? { kind: 'preset', family: r.family }
      : { kind: 'inferred', family: r.family });
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

      {/* Ô nhập mã vật liệu */}
      <label className="block">
        <span className="field-label">Mã vật liệu</span>
        <input
          className="field-input w-full font-mono uppercase"
          placeholder="VD: SPCC, DP980, SUS304, AL6061-T6"
          value={code}
          onChange={(e) => apply(e.target.value)}
          spellCheck={false}
        />
      </label>

      {match.kind === 'preset' && (
        <p className="text-[11px] text-emerald-300">✓ {match.family} — lấy thông số từ CSDL.</p>
      )}
      {match.kind === 'inferred' && (
        <p className="text-[11px] text-sky-300">
          ✓ Suy luận theo họ: {match.family}. Giá trị là ước lượng — kiểm tra/hiệu chỉnh ở “Chi tiết”.
        </p>
      )}
      {match.kind === 'notfound' && (
        <p className="text-[11px] text-amber-300">
          Không nhận dạng được mã — mở “Chi tiết” để nhập thông số thủ công.
        </p>
      )}

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
