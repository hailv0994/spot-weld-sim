import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store';
import type { ThermalResult } from '../physics/thermalSolver';

// Heatmap mặt cắt trục đối xứng (r,z) của cụm hàn theo thời gian.
// Trục ngang = đường kính (gương quanh trục), trục dọc = chiều dày. Vùng T≥T_melt = vũng nóng chảy.

const MM = 1000;

/** Thang màu nhiệt (room→đỉnh): tím sẫm → đỏ → cam → vàng → trắng. */
function thermalColor(t: number): [number, number, number] {
  const stops: [number, [number, number, number]][] = [
    [0.0, [20, 16, 40]],
    [0.25, [90, 20, 90]],
    [0.45, [190, 45, 50]],
    [0.65, [240, 120, 30]],
    [0.82, [248, 205, 70]],
    [1.0, [255, 255, 235]],
  ];
  const x = Math.max(0, Math.min(1, t));
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i][0]) {
      const [x0, c0] = stops[i - 1];
      const [x1, c1] = stops[i];
      const f = (x - x0) / (x1 - x0 || 1);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * f),
        Math.round(c0[1] + (c1[1] - c0[1]) * f),
        Math.round(c0[2] + (c1[2] - c0[2]) * f),
      ];
    }
  }
  return stops[stops.length - 1][1];
}

function drawFrame(canvas: HTMLCanvasElement, th: ThermalResult, frameIdx: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const frame = th.frames[frameIdx];
  if (!frame) return;
  const { Nr, Nz } = th.grid;
  const { roomK, maxTemp, meltK } = th;

  const cols = 2 * Nr - 1;
  const rows = Nz;
  const off = document.createElement('canvas');
  off.width = cols;
  off.height = rows;
  const octx = off.getContext('2d')!;
  const img = octx.createImageData(cols, rows);

  const span = Math.max(1, maxTemp - roomK);
  for (let c = 0; c < cols; c++) {
    const i = Math.abs(c - (Nr - 1)); // gương quanh trục ở giữa
    for (let j = 0; j < rows; j++) {
      const T = frame.T[i * Nz + j];
      const norm = (T - roomK) / span;
      let [r, g, b] = thermalColor(norm);
      // Vũng nóng chảy: tô sáng rõ
      if (T >= meltK) {
        r = 255;
        g = 240;
        b = 200;
      }
      const o = (j * cols + c) * 4;
      img.data[o] = r;
      img.data[o + 1] = g;
      img.data[o + 2] = b;
      img.data[o + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);

  ctx.imageSmoothingEnabled = true;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(off, 0, 0, canvas.width, canvas.height);

  // Đường faying (giữa 2 tấm)
  const yFay = (th.grid.t1 / th.grid.Z) * canvas.height;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(0, yFay);
  ctx.lineTo(canvas.width, yFay);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function ThermalSection() {
  const { thermal, thermalFrame, setThermalFrame, runThermal } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number>(0);
  const accRef = useRef<number>(0);
  const lastRef = useRef<number>(0);

  // Vẽ khi đổi frame/thermal
  useEffect(() => {
    if (thermal && canvasRef.current) drawFrame(canvasRef.current, thermal, thermalFrame);
  }, [thermal, thermalFrame]);

  // Vòng phát animation
  useEffect(() => {
    if (!playing || !thermal) return;
    const n = thermal.frames.length;
    const fps = 24;
    const tick = (ts: number) => {
      if (!lastRef.current) lastRef.current = ts;
      accRef.current += ts - lastRef.current;
      lastRef.current = ts;
      if (accRef.current >= 1000 / fps) {
        accRef.current = 0;
        const cur = useStore.getState().thermalFrame;
        if (cur >= n - 1) {
          setThermalFrame(0);
        } else {
          setThermalFrame(cur + 1);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastRef.current = 0;
      accRef.current = 0;
    };
  }, [playing, thermal, setThermalFrame]);

  const frame = thermal?.frames[thermalFrame];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="section-title mb-0">Animation biến dạng nhiệt — mặt cắt</div>
        <button
          className="btn btn-primary"
          onClick={() => {
            runThermal();
            setPlaying(true);
          }}
        >
          🌡️ Chạy mô phỏng nhiệt
        </button>
      </div>

      {!thermal && (
        <p className="text-sm text-white/50">
          Bấm “Chạy mô phỏng nhiệt” để giải trường nhiệt (r,z) theo thời gian. Dùng tham số tối ưu nếu đã tính, nếu không dùng tham số thủ công.
        </p>
      )}

      {thermal && (
        <>
          <div className="overflow-hidden rounded-lg border border-white/10 bg-black">
            <canvas ref={canvasRef} width={520} height={300} className="w-full" />
          </div>

          {/* Điều khiển timeline */}
          <div className="flex items-center gap-3">
            <button
              className="btn btn-primary px-3 py-1"
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? '⏸' : '▶'}
            </button>
            <input
              type="range"
              min={0}
              max={thermal.frames.length - 1}
              value={thermalFrame}
              onChange={(e) => {
                setPlaying(false);
                setThermalFrame(parseInt(e.target.value));
              }}
              className="flex-1"
            />
            <span className="w-20 text-right font-mono text-xs text-white/60">
              {frame ? (frame.time * 1000).toFixed(0) : 0} ms
            </span>
          </div>

          {/* Chỉ số tức thời */}
          {frame && (
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <Readout label="t" value={`${(frame.time * 1000).toFixed(0)} ms`} />
              <Readout label="Đỉnh" value={`${(frame.peak - 273.15).toFixed(0)} °C`} />
              <Readout label="Ø nugget" value={`${(frame.meltRadius * 2 * MM).toFixed(2)} mm`} />
              <Readout
                label="Ngấu T/D"
                value={`${(frame.meltDepthTop * MM).toFixed(2)}/${(frame.meltDepthBottom * MM).toFixed(2)} mm`}
              />
            </div>
          )}

          {/* Thang màu */}
          <div className="flex items-center gap-2 text-[10px] text-white/50">
            <span>{(thermal.roomK - 273.15).toFixed(0)}°C</span>
            <div className="h-2 flex-1 rounded" style={{ background: 'linear-gradient(90deg,#141028,#5a145a,#be2d32,#f0781e,#f8cd46,#ffffeb)' }} />
            <span>{(thermal.maxTemp - 273.15).toFixed(0)}°C</span>
            <span className="ml-2 rounded bg-[#fff0c8] px-1 text-black">vùng nóng chảy</span>
          </div>
        </>
      )}
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-black/30 p-2">
      <div className="field-label">{label}</div>
      <div className="font-mono text-sm text-white">{value}</div>
    </div>
  );
}
