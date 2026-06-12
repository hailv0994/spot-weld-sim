import type { WeldParameters } from '../physics/types';
import type { LobePoint } from '../physics/weldConditions';

// Biểu đồ weld lobe: vùng giữa I_min (tạo nugget) và I_exp (bắn tóe) theo thời gian hàn.

interface Props {
  lobe: LobePoint[];
  operating?: WeldParameters;
}

export function LobeChart({ lobe, operating }: Props) {
  if (lobe.length === 0) return null;

  const W = 360;
  const H = 200;
  const padL = 44;
  const padB = 28;
  const padT = 10;
  const padR = 10;

  const times = lobe.map((p) => p.weldTime * 1000); // ms
  const currents = lobe.flatMap((p) => [p.iMin, p.iExp]).filter((v) => Number.isFinite(v));
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const iMin = 0;
  const iMax = Math.max(...currents, operating?.current ?? 0) * 1.05;

  const x = (t: number) => padL + ((t - tMin) / (tMax - tMin || 1)) * (W - padL - padR);
  const y = (i: number) => H - padB - ((i - iMin) / (iMax - iMin || 1)) * (H - padT - padB);

  const minPath = lobe.map((p, k) => `${k ? 'L' : 'M'}${x(times[k])},${y(p.iMin)}`).join(' ');
  const expPath = lobe.map((p, k) => `${k ? 'L' : 'M'}${x(times[k])},${y(p.iExp)}`).join(' ');
  const areaPath =
    lobe.map((p, k) => `${k ? 'L' : 'M'}${x(times[k])},${y(p.iMin)}`).join(' ') +
    ' ' +
    [...lobe].reverse().map((p) => `L${x(p.weldTime * 1000)},${y(p.iExp)}`).join(' ') +
    ' Z';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <rect x={padL} y={padT} width={W - padL - padR} height={H - padT - padB} fill="#0b0f14" />
      {/* Vùng lobe an toàn */}
      <path d={areaPath} fill="#22c55e22" stroke="none" />
      <path d={minPath} fill="none" stroke="#38bdf8" strokeWidth={1.5} />
      <path d={expPath} fill="none" stroke="#f43f5e" strokeWidth={1.5} />

      {/* Điểm làm việc */}
      {operating && (
        <circle cx={x(operating.weldTime * 1000)} cy={y(operating.current)} r={4} fill="#fbbf24" />
      )}

      {/* Trục */}
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#ffffff30" />
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#ffffff30" />
      <text x={(W + padL) / 2} y={H - 6} fill="#ffffff80" fontSize={10} textAnchor="middle">
        Thời gian hàn (ms)
      </text>
      <text
        x={12}
        y={(H - padB + padT) / 2}
        fill="#ffffff80"
        fontSize={10}
        textAnchor="middle"
        transform={`rotate(-90 12 ${(H - padB + padT) / 2})`}
      >
        Dòng hàn (A)
      </text>
      <text x={padL} y={H - padB + 12} fill="#ffffff60" fontSize={9}>
        {tMin.toFixed(0)}
      </text>
      <text x={W - padR} y={H - padB + 12} fill="#ffffff60" fontSize={9} textAnchor="end">
        {tMax.toFixed(0)}
      </text>
      <text x={padL - 4} y={y(iMax) + 8} fill="#ffffff60" fontSize={9} textAnchor="end">
        {Math.round(iMax)}
      </text>
    </svg>
  );
}
