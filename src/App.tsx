import { useState } from 'react';
import { InputPanel } from './ui/InputPanel';
import { ResultsPanel } from './ui/ResultsPanel';
import { GeometryImport } from './ui/GeometryImport';
import { DrawingImport } from './ui/DrawingImport';
import { WeldScene } from './viz/WeldScene';
import { ThermalSection } from './viz/ThermalSection';

export default function App() {
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  return (
    <div className="mx-auto flex min-h-full max-w-[1600px] flex-col">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-3">
        <div>
          <h1 className="text-lg font-bold text-white">
            🔩 Spot Weld Sim <span className="text-sm font-normal text-white/40">— Mô phỏng hàn điểm</span>
          </h1>
          <p className="text-xs text-white/40">
            Mô hình kỹ thuật hybrid · điều kiện hàn · nugget &amp; độ ngấu · biến dạng nhiệt 3D
          </p>
        </div>
        <span className="rounded bg-white/5 px-2 py-1 text-xs text-white/40">Phase 1 · v0.1</span>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-6 p-6 lg:grid-cols-[minmax(360px,440px)_1fr]">
        {/* Cột trái: nhập liệu */}
        <div className="lg:max-h-[calc(100vh-90px)] lg:overflow-y-auto lg:pr-2">
          <InputPanel />
        </div>

        {/* Cột phải: kết quả + viewer */}
        <div className="space-y-6 lg:max-h-[calc(100vh-90px)] lg:overflow-y-auto">
          <ResultsPanel />

          {/* Viewer cụm hàn — 3D (STEP) hoặc bản vẽ 2D (PDF) (Phase 2) */}
          <section className="card space-y-3">
            <div className="flex items-center justify-between">
              <div className="section-title mb-0">Viewer — cụm hàn</div>
              <div className="flex gap-1 rounded bg-black/30 p-0.5 text-xs">
                <button
                  className={`rounded px-2 py-1 ${
                    viewMode === '3d' ? 'bg-sky-500/30 text-sky-200' : 'text-white/50 hover:text-white/80'
                  }`}
                  onClick={() => setViewMode('3d')}
                >
                  3D (STEP)
                </button>
                <button
                  className={`rounded px-2 py-1 ${
                    viewMode === '2d' ? 'bg-sky-500/30 text-sky-200' : 'text-white/50 hover:text-white/80'
                  }`}
                  onClick={() => setViewMode('2d')}
                >
                  Bản vẽ 2D (PDF)
                </button>
              </div>
            </div>
            {viewMode === '3d' ? (
              <>
                <GeometryImport />
                <div className="h-[420px] overflow-hidden rounded-lg border border-white/10">
                  <WeldScene />
                </div>
              </>
            ) : (
              <DrawingImport />
            )}
          </section>

          {/* Animation nhiệt (Phase 3) */}
          <section className="card">
            <ThermalSection />
          </section>
        </div>
      </div>
    </div>
  );
}
