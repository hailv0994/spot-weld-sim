import type { MachineSpec, WeldParameters, WeldResult, Geometry } from './types';
import { electrodeContactArea } from './resistance';
import { simulate, targetNugget, type SimInputs } from './simulate';

// ============================================================================
// Tối ưu điều kiện hàn: tìm (I, F, t) trong dải spec máy để đạt nugget mục tiêu
// + lực kéo yêu cầu, nằm GIỮA weld lobe (an toàn, tránh bắn tóe).
//
// Tính chất khai thác: đường kính nugget TĂNG ĐƠN ĐIỆU theo dòng I (Q ∝ I²),
// nên với mỗi (F, t) ta tìm:
//   - I_min: dòng nhỏ nhất đạt đường kính mục tiêu
//   - I_exp: dòng bắt đầu gây bắn tóe (expulsion)
// Cửa sổ hàn (lobe) = [I_min, I_exp). Điểm làm việc đặt lệch trên I_min một biên.
// ============================================================================

const BISECT_ITERS = 36;

/** Lực ép gợi ý từ áp suất điện cực mục tiêu (mặc định ~80 MPa cho thép), kẹp theo máy. */
export function recommendedForce(geom: Geometry, machine: MachineSpec, pressurePa = 80e6): number {
  const f = pressurePa * electrodeContactArea(geom);
  return Math.min(machine.maxForce, Math.max(machine.minForce, f));
}

/** Dòng nhỏ nhất (A) đạt đường kính nugget mục tiêu cho (force, time). null nếu không khả thi. */
function currentForDiameter(
  inputs: SimInputs,
  machine: MachineSpec,
  force: number,
  weldTime: number,
  targetD: number,
): number | null {
  let lo = machine.minCurrent;
  let hi = machine.maxCurrent;
  const dAt = (I: number) =>
    simulate(inputs, { current: I, force, weldTime }).nuggetDiameter;

  if (dAt(hi) < targetD) return null; // ngay cả dòng max cũng không đạt
  if (dAt(lo) >= targetD) return lo;

  for (let i = 0; i < BISECT_ITERS; i++) {
    const mid = (lo + hi) / 2;
    if (dAt(mid) >= targetD) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** Dòng bắt đầu gây bắn tóe (A). Trả về maxCurrent nếu cả dải đều an toàn. */
function currentForExpulsion(
  inputs: SimInputs,
  machine: MachineSpec,
  force: number,
  weldTime: number,
): number {
  let lo = machine.minCurrent;
  let hi = machine.maxCurrent;
  const expAt = (I: number) =>
    simulate(inputs, { current: I, force, weldTime }).flags.expulsion;

  if (!expAt(hi)) return machine.maxCurrent; // không bắn tóe trong toàn dải
  if (expAt(lo)) return machine.minCurrent;

  for (let i = 0; i < BISECT_ITERS; i++) {
    const mid = (lo + hi) / 2;
    if (expAt(mid)) hi = mid;
    else lo = mid;
  }
  return lo;
}

export interface LobePoint {
  weldTime: number;
  iMin: number; // dòng tạo nugget tối thiểu
  iExp: number; // dòng bắt đầu bắn tóe
  feasible: boolean; // iMin < iExp (có cửa sổ hàn)
}

export interface WeldRecommendation {
  feasible: boolean;
  params: WeldParameters;
  result: WeldResult;
  /** Bề rộng cửa sổ hàn tại điểm chọn (A) */
  lobeWidth: number;
  /** Đường lobe theo thời gian để vẽ biểu đồ */
  lobe: LobePoint[];
  message: string;
}

/** Sinh danh sách thời gian hàn khảo sát (s). */
function candidateTimes(machine: MachineSpec): number[] {
  const tMax = machine.maxWeldTime;
  const tMin = Math.max(0.04, tMax * 0.1);
  const n = 12;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push(tMin + ((tMax - tMin) * i) / (n - 1));
  }
  return out;
}

/**
 * Tìm điều kiện hàn tối ưu.
 * Quét lực quanh giá trị gợi ý và thời gian trong dải máy; với mỗi cặp xác định
 * cửa sổ hàn và chấm điểm để chọn điểm làm việc bền vững nhất đạt mọi yêu cầu.
 */
export function optimizeWeld(inputs: SimInputs, machine: MachineSpec): WeldRecommendation {
  const targetD = targetNugget(inputs);
  const fRec = recommendedForce(inputs.geom, machine);
  const forces = [0.8, 1.0, 1.2].map((k) =>
    Math.min(machine.maxForce, Math.max(machine.minForce, fRec * k)),
  );
  const times = candidateTimes(machine);

  // Đường lobe ở lực gợi ý (cho biểu đồ)
  const lobe: LobePoint[] = times.map((t) => {
    const iMin = currentForDiameter(inputs, machine, fRec, t, targetD);
    const iExp = currentForExpulsion(inputs, machine, fRec, t);
    const min = iMin ?? machine.maxCurrent;
    return { weldTime: t, iMin: min, iExp, feasible: iMin !== null && min < iExp };
  });

  let best: WeldRecommendation | null = null;

  for (const force of forces) {
    for (const weldTime of times) {
      const iMin = currentForDiameter(inputs, machine, force, weldTime, targetD);
      if (iMin === null) continue;
      const iExp = currentForExpulsion(inputs, machine, force, weldTime);
      if (iMin >= iExp) continue; // không có cửa sổ

      // Điểm làm việc: lệch trên I_min 35% bề rộng lobe (biên an toàn 2 phía)
      const lobeWidth = iExp - iMin;
      const current = Math.min(machine.maxCurrent, iMin + 0.35 * lobeWidth);

      const result = simulate(inputs, { current, force, weldTime });
      const f = result.flags;
      const meetsAll = f.meetsNugget && f.meetsPenetration && f.meetsTensile && !f.expulsion;
      if (!meetsAll) continue;

      // Chấm điểm: ưu tiên lobe rộng (bền), năng lượng thấp (ít méo nhiệt)
      const score = lobeWidth / 1000 - result.effectiveHeat / 1e4;

      if (!best || score > best.lobeWidth / 1000 - best.result.effectiveHeat / 1e4) {
        best = {
          feasible: true,
          params: { current, force, weldTime },
          result,
          lobeWidth,
          lobe,
          message: `Đạt yêu cầu. Cửa sổ hàn rộng ~${Math.round(lobeWidth)} A tại t=${(weldTime * 1000).toFixed(0)} ms.`,
        };
      }
    }
  }

  if (best) return best;

  // Không tìm được điểm đạt — trả về điểm tốt nhất có thể (dòng max, lực & thời gian max) để chẩn đoán
  const fallbackParams: WeldParameters = {
    current: machine.maxCurrent,
    force: fRec,
    weldTime: machine.maxWeldTime,
  };
  const result = simulate(inputs, fallbackParams);
  return {
    feasible: false,
    params: fallbackParams,
    result,
    lobeWidth: 0,
    lobe,
    message:
      'Không tìm được điều kiện đạt mọi yêu cầu trong dải máy. Xem kết quả tại dòng/thời gian tối đa để chẩn đoán (có thể cần máy mạnh hơn, giảm chiều dày, hoặc nới yêu cầu).',
  };
}
