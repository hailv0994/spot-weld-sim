import { useState } from 'react';
import { useStore } from '../state/store';
import { extractSpecFromFile, type ExtractedSpec } from '../ai/extractSpec';

// Phase 4: upload ảnh/PDF bản vẽ → Claude trích xuất thông số → áp vào form (vẫn sửa được).

const KEY_LS = 'spotweld.anthropicKey';
const MODELS = [
  { id: 'claude-opus-4-8', label: 'Opus 4.8 (mạnh nhất)' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5 (rẻ/nhanh)' },
];

export function SpecImport() {
  const s = useStore();
  const [apiKey, setApiKey] = useState(localStorage.getItem(KEY_LS) ?? '');
  const [model, setModel] = useState(MODELS[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractedSpec | null>(null);

  function saveKey(k: string) {
    setApiKey(k);
    localStorage.setItem(KEY_LS, k);
  }

  async function onFile(file: File) {
    if (!apiKey) {
      setError('Nhập API key Anthropic trước.');
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await extractSpecFromFile(file, { apiKey, model });
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function applyAll() {
    if (!result) return;
    if (result.material1) s.setMat1(result.material1);
    if (result.material2) s.setMat2(result.material2);
    if (result.geometry) s.setGeom(result.geometry);
    if (result.machine) s.setMachine(result.machine);
    if (result.requirement) s.setRequirement(result.requirement);
  }

  const sections = result
    ? [
        ['Vật liệu 1', result.material1],
        ['Vật liệu 2', result.material2],
        ['Hình học', result.geometry],
        ['Máy hàn', result.machine],
        ['Yêu cầu', result.requirement],
      ].filter(([, v]) => v && Object.keys(v).length)
    : [];

  return (
    <section>
      <div className="section-title">⑥ Trích xuất từ bản vẽ (AI)</div>
      <div className="card space-y-3">
        <div className="grid grid-cols-1 gap-2">
          <label className="block">
            <span className="field-label">Anthropic API key (lưu cục bộ trình duyệt)</span>
            <input
              type="password"
              className="field-input"
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={(e) => saveKey(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="field-label">Model</span>
            <select className="field-input" value={model} onChange={(e) => setModel(e.target.value)}>
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block cursor-pointer rounded bg-sky-500/20 px-3 py-2 text-center text-sm text-sky-200 hover:bg-sky-500/30">
          {busy ? 'Đang đọc bản vẽ…' : '⬆ Upload ảnh / PDF bản vẽ'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </label>

        {error && <p className="text-xs text-rose-300">{error}</p>}

        {result && (
          <div className="space-y-2">
            <div className="text-xs text-white/60">Trích xuất được:</div>
            {sections.length === 0 && (
              <p className="text-xs text-amber-300">Không tìm thấy thông số rõ ràng trong bản vẽ.</p>
            )}
            {sections.map(([label, obj]) => (
              <div key={label as string} className="rounded bg-black/30 p-2">
                <div className="field-label">{label as string}</div>
                <div className="text-[11px] text-white/70">
                  {Object.entries(obj as Record<string, unknown>)
                    .map(([k, v]) => `${k}: ${typeof v === 'number' ? +v.toPrecision(4) : v}`)
                    .join(' · ')}
                </div>
              </div>
            ))}
            {result.notes && <p className="text-[11px] italic text-white/40">{result.notes}</p>}
            {sections.length > 0 && (
              <button className="btn btn-primary w-full" onClick={applyAll}>
                ✓ Áp vào form
              </button>
            )}
          </div>
        )}

        <p className="text-[11px] text-white/40">
          Gọi trực tiếp API Anthropic từ trình duyệt (key của mày, lưu localStorage). Số trích xuất là gợi ý — kiểm tra & sửa trước khi mô phỏng.
        </p>
      </div>
    </section>
  );
}
