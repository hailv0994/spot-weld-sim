import { useState } from 'react';
import { useStore, type MeshRole } from '../state/store';
import { loadStep } from '../cad/stepLoader';

const ROLES: { role: MeshRole; label: string }[] = [
  { role: 'part1', label: 'Linh kiện 1' },
  { role: 'part2', label: 'Linh kiện 2' },
  { role: 'electrode_upper', label: 'Điện cực trên' },
  { role: 'electrode_lower', label: 'Điện cực dưới' },
  { role: 'fixture', label: 'Linh kiện gá vào điện cực' },
];

export function GeometryImport() {
  const { loadedMeshes, setPartGeom } = useStore();
  const [busy, setBusy] = useState<MeshRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(role: MeshRole, file: File) {
    setBusy(role);
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const { geometry } = await loadStep(buf);
      setPartGeom(role, geometry, file.name);
    } catch (e) {
      setError(`${role}: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {ROLES.map(({ role, label }) => {
          const loaded = loadedMeshes.find((m) => m.role === role);
          return (
            <div key={role} className="rounded border border-white/10 bg-black/20 p-2">
              <div className="field-label mb-1">{label}</div>
              <label className="block cursor-pointer rounded bg-sky-500/20 px-2 py-1 text-center text-xs text-sky-200 hover:bg-sky-500/30">
                {busy === role ? 'Đang đọc…' : loaded ? '↻ Đổi STEP' : '⬆ Nạp STEP'}
                <input
                  type="file"
                  accept=".step,.stp,.STEP,.STP"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFile(role, f);
                  }}
                />
              </label>
              {loaded && (
                <div className="mt-1 flex items-center justify-between gap-1">
                  <span className="truncate text-[10px] text-white/50" title={loaded.name}>
                    {loaded.name}
                  </span>
                  <button
                    className="text-[10px] text-rose-300 hover:text-rose-200"
                    onClick={() => setPartGeom(role, undefined)}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
