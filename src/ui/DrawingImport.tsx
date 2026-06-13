import { useState } from 'react';
import { useStore, type MeshRole } from '../state/store';

// Nạp bản vẽ 2D (PDF/ảnh) cho từng linh kiện thay cho file STEP 3D.
// Chỉ để hiển thị/tham khảo — số liệu hình học vẫn lấy từ form.

const ROLES: { role: MeshRole; label: string }[] = [
  { role: 'part1', label: 'Linh kiện 1' },
  { role: 'part2', label: 'Linh kiện 2' },
  { role: 'electrode', label: 'Điện cực' },
];

export function DrawingImport() {
  const { partDrawings, setPartDrawing } = useStore();
  const [active, setActive] = useState<MeshRole>('part1');
  const [error, setError] = useState<string | null>(null);

  function onFile(role: MeshRole, file: File) {
    const ok = file.type === 'application/pdf' || file.type.startsWith('image/');
    if (!ok) {
      setError(`${role}: chỉ nhận PDF hoặc ảnh.`);
      return;
    }
    setError(null);
    setPartDrawing(role, { name: file.name, url: URL.createObjectURL(file), type: file.type });
    setActive(role);
  }

  const current = partDrawings[active];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {ROLES.map(({ role, label }) => {
          const loaded = partDrawings[role];
          return (
            <div key={role} className="rounded border border-white/10 bg-black/20 p-2">
              <div className="field-label mb-1">{label}</div>
              <label className="block cursor-pointer rounded bg-sky-500/20 px-2 py-1 text-center text-xs text-sky-200 hover:bg-sky-500/30">
                {loaded ? '↻ Đổi bản vẽ' : '⬆ Nạp PDF/ảnh'}
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFile(role, f);
                    e.target.value = ''; // cho phép nạp lại cùng file
                  }}
                />
              </label>
              {loaded && (
                <div className="mt-1 flex items-center justify-between gap-1">
                  <button
                    className={`truncate text-left text-[10px] hover:text-white/80 ${
                      active === role ? 'text-sky-300' : 'text-white/50'
                    }`}
                    title={loaded.name}
                    onClick={() => setActive(role)}
                  >
                    {loaded.name}
                  </button>
                  <button
                    className="text-[10px] text-rose-300 hover:text-rose-200"
                    onClick={() => setPartDrawing(role, undefined)}
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

      <div className="h-[420px] overflow-hidden rounded-lg border border-white/10 bg-black/30">
        {current ? (
          current.type === 'application/pdf' ? (
            <object data={current.url} type="application/pdf" className="h-full w-full">
              <iframe src={current.url} title={current.name} className="h-full w-full" />
            </object>
          ) : (
            <div className="flex h-full w-full items-center justify-center p-2">
              <img
                src={current.url}
                alt={current.name}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-white/30">
            Chưa có bản vẽ 2D — nạp PDF/ảnh cho linh kiện ở trên.
          </div>
        )}
      </div>

      <p className="text-[11px] text-white/40">
        Bản vẽ 2D chỉ để tham khảo/hiển thị. Số liệu hình học vẫn lấy từ form (hoặc mục ⑥ AI trích xuất từ bản vẽ).
      </p>
    </div>
  );
}
