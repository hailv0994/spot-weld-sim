import { useStore } from '../state/store';
import type { WeldResult } from '../physics/types';
import { LobeChart } from './LobeChart';
import { NumberField } from './fields';

// Bảng kết quả: điều kiện hàn tối ưu, các chỉ tiêu đạt/không, weld lobe, và what-if thủ công.

function Flag({ ok, label }: { ok: boolean; label: string }) {
  return <span className={ok ? 'pill-ok' : 'pill-bad'}>{ok ? '✓' : '✗'} {label}</span>;
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded bg-black/30 p-2">
      <div className="field-label">{label}</div>
      <div className="text-lg font-semibold text-white">
        {value}
        {unit ? <span className="ml-1 text-xs font-normal text-white/50">{unit}</span> : null}
      </div>
    </div>
  );
}

function ResultMetrics({ r }: { r: WeldResult }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Metric label="Đ.kính nugget" value={(r.nuggetDiameter * 1000).toFixed(2)} unit="mm" />
      <Metric label="Độ ngấu" value={(r.penetration * 100).toFixed(0)} unit="%" />
      <Metric label="Lực kéo phá hủy" value={(r.predictedTensileForce / 1000).toFixed(2)} unit="kN" />
      <Metric label="Nhiệt độ đỉnh" value={(r.peakTemperature - 273.15).toFixed(0)} unit="°C" />
      <Metric label="Nhiệt Joule" value={r.heatGenerated.toFixed(0)} unit="J" />
      <Metric label="Điện trở động" value={(r.totalResistance * 1e6).toFixed(1)} unit="µΩ" />
    </div>
  );
}

export function ResultsPanel() {
  const s = useStore();
  const rec = s.recommendation;
  const manual = s.manualResult;

  return (
    <div className="space-y-5">
      {/* Tối ưu điều kiện hàn */}
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <div className="section-title mb-0">Điều kiện hàn tối ưu</div>
          <button className="btn btn-primary" onClick={s.runOptimize}>
            ⚡ Tính tối ưu
          </button>
        </div>

        {!rec && <p className="text-sm text-white/50">Bấm “Tính tối ưu” để máy tìm dòng / lực / thời gian hàn.</p>}

        {rec && (
          <>
            <div
              className={`rounded-md p-3 text-sm ${
                rec.feasible ? 'bg-emerald-500/10 text-emerald-200' : 'bg-rose-500/10 text-rose-200'
              }`}
            >
              {rec.message}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Metric label="Dòng hàn" value={(rec.params.current / 1000).toFixed(2)} unit="kA" />
              <Metric label="Lực ép" value={(rec.params.force / 1000).toFixed(2)} unit="kN" />
              <Metric label="Thời gian" value={(rec.params.weldTime * 1000).toFixed(0)} unit="ms" />
            </div>

            <ResultMetrics r={rec.result} />

            <div className="flex flex-wrap gap-2">
              <Flag ok={rec.result.flags.meetsNugget} label="Đạt nugget" />
              <Flag ok={rec.result.flags.meetsPenetration} label="Đạt độ ngấu" />
              <Flag ok={rec.result.flags.meetsTensile} label="Đạt lực kéo" />
              {rec.result.flags.expulsion && <span className="pill-warn">⚠ Nguy cơ bắn tóe</span>}
              {rec.result.flags.notMelted && <span className="pill-warn">⚠ Chưa nóng chảy</span>}
            </div>

            <div>
              <div className="field-label mb-1">Weld lobe (cửa sổ hàn)</div>
              <LobeChart lobe={rec.lobe} operating={rec.params} />
              <div className="flex gap-4 text-xs text-white/50">
                <span><span className="text-sky-400">●</span> I tạo nugget</span>
                <span><span className="text-rose-400">●</span> I bắn tóe</span>
                <span><span className="text-amber-400">●</span> Điểm làm việc</span>
              </div>
            </div>
          </>
        )}
      </section>

      {/* What-if thủ công */}
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <div className="section-title mb-0">Thử thủ công (what-if)</div>
          <button className="btn btn-primary" onClick={s.runManual}>
            ▶ Mô phỏng
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <NumberField
            label="Dòng hàn"
            unit="kA"
            decimals={2}
            step={0.2}
            value={s.manualParams.current / 1000}
            onChange={(v) => s.setManualParams({ current: v * 1000 })}
          />
          <NumberField
            label="Lực ép"
            unit="kN"
            decimals={2}
            step={0.1}
            value={s.manualParams.force / 1000}
            onChange={(v) => s.setManualParams({ force: v * 1000 })}
          />
          <NumberField
            label="Thời gian"
            unit="ms"
            step={10}
            value={s.manualParams.weldTime * 1000}
            onChange={(v) => s.setManualParams({ weldTime: v / 1000 })}
          />
        </div>
        {manual && (
          <>
            <ResultMetrics r={manual} />
            <div className="flex flex-wrap gap-2">
              <Flag ok={manual.flags.meetsNugget} label="Đạt nugget" />
              <Flag ok={manual.flags.meetsPenetration} label="Đạt độ ngấu" />
              <Flag ok={manual.flags.meetsTensile} label="Đạt lực kéo" />
              {manual.flags.expulsion && <span className="pill-warn">⚠ Bắn tóe</span>}
              {manual.flags.notMelted && <span className="pill-warn">⚠ Chưa nóng chảy</span>}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
