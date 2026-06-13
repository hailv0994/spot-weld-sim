import { useState, useCallback } from 'react';
import { useStore } from '../state/store';
import { MaterialEditor } from './MaterialEditor';
import { NumberField, SelectField } from './fields';
import { SpecImport } from './SpecImport';

const KEY_LS = 'spotweld.anthropicKey';

// Bảng nhập liệu bên trái: vật liệu, spec máy, yêu cầu sản phẩm, hệ số mô hình.
// Mục ② Hình học đã bỏ (chiều dày + điện cực lấy từ STEP / AI).

export function InputPanel() {
  const s = useStore();

  return (
    <div className="space-y-5">
      {/* Vật liệu */}
      <section>
        <div className="section-title">① Vật liệu</div>
        <div className="space-y-3">
          <MaterialEditor
            title="Linh kiện 1 (tấm trên)"
            mat={s.mat1}
            onPatch={s.setMat1}
            onReplace={s.replaceMat1}
          />
          <MaterialEditor
            title="Linh kiện 2 (tấm dưới)"
            mat={s.mat2}
            onPatch={s.setMat2}
            onReplace={s.replaceMat2}
          />
          <MaterialEditor
            title="Điện cực (Cu hợp kim)"
            mat={s.matElectrode}
            onPatch={s.setMatElectrode}
            onReplace={s.replaceMatElectrode}
          />
        </div>
      </section>

      {/* Spec máy */}
      <section>
        <div className="section-title">② Spec máy hàn điểm</div>
        <div className="card grid grid-cols-2 gap-2">
          <NumberField label="Dòng hàn min" unit="kA" decimals={1} step={0.5}
            value={s.machine.minCurrent / 1000}
            onChange={(v) => s.setMachine({ minCurrent: v * 1000 })} />
          <NumberField label="Dòng hàn max" unit="kA" decimals={1} step={0.5}
            value={s.machine.maxCurrent / 1000}
            onChange={(v) => s.setMachine({ maxCurrent: v * 1000 })} />
          <NumberField label="Lực ép min" unit="kN" decimals={2} step={0.1}
            value={s.machine.minForce / 1000}
            onChange={(v) => s.setMachine({ minForce: v * 1000 })} />
          <NumberField label="Lực ép max" unit="kN" decimals={2} step={0.1}
            value={s.machine.maxForce / 1000}
            onChange={(v) => s.setMachine({ maxForce: v * 1000 })} />
          <NumberField label="Thời gian hàn max" unit="ms" step={10}
            value={s.machine.maxWeldTime * 1000}
            onChange={(v) => s.setMachine({ maxWeldTime: v / 1000 })} />
          <NumberField label="Tần số nguồn" unit="Hz" step={10}
            value={s.machine.frequency}
            onChange={(v) => s.setMachine({ frequency: v })} />
          <SelectField label="Loại nguồn" value={s.machine.type}
            options={[
              { value: 'AC', label: 'AC' },
              { value: 'MFDC', label: 'MFDC' },
              { value: 'DC', label: 'DC' },
            ]}
            onChange={(v) => s.setMachine({ type: v })} />
        </div>
      </section>

      {/* Yêu cầu sản phẩm */}
      <section>
        <div className="section-title">③ Yêu cầu sản phẩm</div>
        <div className="card space-y-3">
          <DrawingRequirements />
          <WeldGapSection />
        </div>
      </section>

      {/* Hệ số mô hình */}
      <section>
        <div className="section-title">④ Hệ số mô hình (hiệu chỉnh)</div>
        <div className="card grid grid-cols-2 gap-2">
          <NumberField label="Hiệu suất nhiệt η" decimals={2} step={0.05} min={0.05}
            value={s.coeffs.heatEfficiency}
            onChange={(v) => s.setCoeffs({ heatEfficiency: v })} />
          <NumberField label="Tỉ lệ nugget d/H" decimals={2} step={0.1}
            value={s.coeffs.nuggetAspectRatio}
            onChange={(v) => s.setCoeffs({ nuggetAspectRatio: v })} />
          <NumberField label="Hệ số ĐT tiếp xúc" step={1000}
            value={s.coeffs.contactResistanceFactor}
            onChange={(v) => s.setCoeffs({ contactResistanceFactor: v })} />
          <NumberField label="Mũ phụ thuộc lực" decimals={2} step={0.05}
            value={s.coeffs.contactForceExp}
            onChange={(v) => s.setCoeffs({ contactForceExp: v })} />
          <NumberField label="Hệ số bền cắt mối hàn" decimals={2} step={0.05}
            value={s.coeffs.weldShearFactor}
            onChange={(v) => s.setCoeffs({ weldShearFactor: v })} />
          <NumberField label="Ngưỡng bắn tóe" unit="J/mm³" decimals={1} step={1}
            value={s.coeffs.expulsionEnergyDensity}
            onChange={(v) => s.setCoeffs({ expulsionEnergyDensity: v })} />
        </div>
      </section>

      {/* AI trích xuất từ bản vẽ */}
      <SpecImport />
    </div>
  );
}

// ─── Khoảng cách hàn → setdown → penetration ─────────────────────────────────

function WeldGapSection() {
  const { weldGapBefore, weldGapAfter, setWeldGap, geom } = useStore();

  const setdown = weldGapBefore > 0 && weldGapAfter > 0 ? weldGapBefore - weldGapAfter : null;
  const thinner = Math.min(geom.thickness1, geom.thickness2) * 1000; // mm
  const penetrationPct = setdown !== null && thinner > 0 ? Math.min(95, (setdown / thinner) * 100) : null;

  const setBefore = useCallback((v: number) => setWeldGap(v, weldGapAfter), [setWeldGap, weldGapAfter]);
  const setAfter = useCallback((v: number) => setWeldGap(weldGapBefore, v), [setWeldGap, weldGapBefore]);

  return (
    <div className="space-y-2 border-t border-white/10 pt-2">
      <div className="text-[11px] text-white/50">Khoảng cách 2 linh kiện (đo tại điểm tham chiếu)</div>
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Trước hàn" unit="mm" decimals={2} step={0.1}
          value={weldGapBefore} onChange={setBefore} />
        <NumberField label="Sau hàn (yêu cầu)" unit="mm" decimals={2} step={0.1}
          value={weldGapAfter} onChange={setAfter} />
      </div>
      {setdown !== null && setdown > 0 && (
        <div className="flex gap-3 rounded bg-sky-500/10 px-3 py-1.5 text-[11px]">
          <span className="text-white/60">Setdown: <strong className="text-sky-300">{setdown.toFixed(3)} mm</strong></span>
          {penetrationPct !== null && (
            <span className="text-white/60">→ Độ ngấu mục tiêu: <strong className="text-sky-300">{penetrationPct.toFixed(1)}%</strong></span>
          )}
        </div>
      )}
      {setdown !== null && setdown <= 0 && (
        <p className="text-[11px] text-amber-300">Khoảng cách sau hàn phải nhỏ hơn trước hàn.</p>
      )}
      <p className="text-[11px] text-white/30">
        Setdown = trước − sau → dùng để tính độ ngấu mục tiêu khi tối ưu. 0 = không đặt ràng buộc.
      </p>
    </div>
  );
}

// ─── Upload bản vẽ 2D + phân tích yêu cầu sản phẩm ─────────────────────────

function DrawingRequirements() {
  const s = useStore();
  const [drawing, setDrawing] = useState<{ url: string; name: string; type: string } | null>(null);
  const [apiKey] = useState(() => localStorage.getItem(KEY_LS) ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err' | 'nokey'; text: string } | null>(null);

  function onFile(file: File) {
    const ok = file.type === 'application/pdf' || file.type.startsWith('image/');
    if (!ok) return;
    if (drawing) URL.revokeObjectURL(drawing.url);
    setDrawing({ url: URL.createObjectURL(file), name: file.name, type: file.type });
    setMsg(null);
  }

  async function analyze() {
    if (!drawing) return;
    if (!apiKey) {
      setMsg({ kind: 'nokey', text: 'Nhập Anthropic API key ở mục ⑥ để dùng tính năng này.' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const { extractSpecFromFile } = await import('../ai/extractSpec');
      const resp = await fetch(drawing.url);
      const blob = await resp.blob();
      const file = new File([blob], drawing.name, { type: drawing.type });
      const { data } = await extractSpecFromFile(file, { apiKey });
      let filled = 0;
      if (data.geometry) { s.setGeom(data.geometry); filled++; }
      if (data.requirement) { s.setRequirement(data.requirement); filled++; }
      if (data.material1) { s.setMat1(data.material1); filled++; }
      if (data.material2) { s.setMat2(data.material2); filled++; }
      setMsg({ kind: 'ok', text: `Điền ${filled} nhóm thông số từ bản vẽ.` });
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message.slice(0, 120) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="cursor-pointer rounded bg-sky-500/20 px-3 py-1.5 text-xs text-sky-200 hover:bg-sky-500/30">
          {drawing ? `↻ ${drawing.name}` : '⬆ Upload bản vẽ 2D (PDF/ảnh)'}
          <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
        </label>
        {drawing && (
          <button
            className="rounded bg-violet-500/20 px-3 py-1.5 text-xs text-violet-200 hover:bg-violet-500/30 disabled:opacity-50"
            onClick={analyze}
            disabled={busy}
          >
            {busy ? 'Đang phân tích…' : '✦ Phân tích (AI)'}
          </button>
        )}
        {drawing && (
          <button className="text-[11px] text-rose-300 hover:text-rose-200"
            onClick={() => { URL.revokeObjectURL(drawing.url); setDrawing(null); setMsg(null); }}>
            ✕
          </button>
        )}
      </div>

      {msg && (
        <p className={`text-[11px] ${msg.kind === 'ok' ? 'text-emerald-300' : msg.kind === 'nokey' ? 'text-amber-300' : 'text-rose-300'}`}>
          {msg.kind === 'ok' ? '✓ ' : ''}{msg.text}
        </p>
      )}

      {drawing && (
        <div className="h-52 overflow-hidden rounded border border-white/10 bg-black/30">
          {drawing.type === 'application/pdf' ? (
            <object data={drawing.url} type="application/pdf" className="h-full w-full">
              <iframe src={drawing.url} title={drawing.name} className="h-full w-full" />
            </object>
          ) : (
            <div className="flex h-full items-center justify-center p-2">
              <img src={drawing.url} alt={drawing.name} className="max-h-full max-w-full object-contain" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
