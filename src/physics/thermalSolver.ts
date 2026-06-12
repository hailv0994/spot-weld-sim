import type { Material, Geometry, WeldParameters, ModelCoeffs } from './types';
import { computeResistance } from './resistance';
import { instantaneousPower } from './heat';

// ============================================================================
// Solver nhiệt transient trục đối xứng (r,z) bằng sai phân hữu hạn hiện (explicit).
//   ρ·c_p·∂T/∂t = (1/r)∂/∂r(k·r·∂T/∂r) + ∂/∂z(k·∂T/∂z) + q'''(r,z,t)
//
// - Trục z = phương chiều dày; mặt faying tại z = t1 (giữa 2 tấm).
// - Nguồn nhiệt Joule q''' phân bố trong cột tiếp xúc r < r_điện cực trong thời gian hàn.
// - Mặt điện cực (z=0, z=Z, r<r_e) làm mát nước → Dirichlet T = phòng.
// - Thuộc tính vật liệu phụ thuộc vị trí (tấm 1 cho z<t1, tấm 2 cho z>t1) → mô phỏng độ ngấu.
//
// Trả về chuỗi khung (frame) trường nhiệt theo thời gian để vẽ animation + đường nugget.
// ============================================================================

export interface ThermalGrid {
  Nr: number;
  Nz: number;
  dr: number; // m
  dz: number; // m
  R: number; // m (bán kính miền)
  Z: number; // m (tổng chiều dày)
  t1: number; // m (vị trí faying)
}

export interface ThermalFrame {
  time: number; // s
  T: Float32Array; // [Nr*Nz], K (T[i*Nz + j], i theo r, j theo z)
  peak: number; // K
  meltRadius: number; // m, bán kính nóng chảy tại faying
  meltDepthTop: number; // m, độ sâu ngấu vào tấm 1
  meltDepthBottom: number; // m, độ sâu ngấu vào tấm 2
}

export interface ThermalResult {
  grid: ThermalGrid;
  frames: ThermalFrame[];
  roomK: number;
  meltK: number; // nhiệt độ nóng chảy trung bình dùng cho isotherm
  maxTemp: number; // đỉnh toàn cục (cho thang màu)
  weldTime: number;
  totalTime: number;
}

export interface ThermalOptions {
  Nr?: number;
  Nz?: number;
  /** Hệ số bán kính miền so với bán kính điện cực */
  radiusFactor?: number;
  /** Thời gian nguội thêm sau khi ngắt dòng, theo bội số thời gian hàn */
  cooldownFactor?: number;
  /** Số khung xuất ra */
  frameCount?: number;
  roomK?: number;
}

const idx = (i: number, j: number, Nz: number) => i * Nz + j;

export function simulateThermal(
  mat1: Material,
  mat2: Material,
  geom: Geometry,
  params: WeldParameters,
  coeffs: ModelCoeffs,
  opts: ThermalOptions = {},
): ThermalResult {
  const Nr = opts.Nr ?? 46;
  const Nz = opts.Nz ?? 48;
  const radiusFactor = opts.radiusFactor ?? 2.6;
  const cooldownFactor = opts.cooldownFactor ?? 1.5;
  const frameCount = opts.frameCount ?? 80;
  const roomK = opts.roomK ?? 293.15;

  const rElec = geom.electrodeFaceDiameter / 2;
  const Z = geom.thickness1 + geom.thickness2;
  const R = Math.max(rElec * radiusFactor, rElec + 2e-3);
  const t1 = geom.thickness1;

  const dr = R / (Nr - 1);
  const dz = Z / (Nz - 1);

  // Thuộc tính theo node (phụ thuộc tấm). z(j) = j*dz; faying ở t1.
  const k = new Float32Array(Nr * Nz);
  const rhoCp = new Float32Array(Nr * Nz);
  const meltNode = new Float32Array(Nr * Nz); // nhiệt độ nóng chảy cục bộ
  for (let i = 0; i < Nr; i++) {
    for (let j = 0; j < Nz; j++) {
      const z = j * dz;
      const m = z <= t1 ? mat1 : mat2;
      const p = idx(i, j, Nz);
      k[p] = m.thermalConductivity;
      rhoCp[p] = m.density * m.specificHeat;
      meltNode[p] = m.meltingPoint;
    }
  }
  const meltK = (mat1.meltingPoint + mat2.meltingPoint) / 2;

  // Công suất Joule. Điện trở tại nhiệt phòng (giữ hằng cho ổn định số).
  const Rtot = computeResistance(mat1, mat2, geom, params.force, coeffs, roomK, roomK).total;
  const power = instantaneousPower(params.current, Rtot); // W

  // Nguồn thể tích trong cột r < rElec, toàn chiều dày, trong thời gian hàn.
  const colVolume = Math.PI * rElec * rElec * Z;
  const qVol = power / colVolume; // W/m³ (chỉ trong cột tiếp xúc)
  const inColumn = (i: number) => i * dr <= rElec;

  // Bước thời gian ổn định (explicit): dt ≤ f / (α·(2/dr² + 2/dz²))
  let alphaMax = 0;
  for (let p = 0; p < Nr * Nz; p++) alphaMax = Math.max(alphaMax, k[p] / rhoCp[p]);
  const dtStable = 0.4 / (alphaMax * (2 / (dr * dr) + 2 / (dz * dz)));

  const weldTime = params.weldTime;
  const totalTime = weldTime * (1 + cooldownFactor);
  let dt = dtStable;
  let nSteps = Math.ceil(totalTime / dt);
  const MAX_STEPS = 240000;
  if (nSteps > MAX_STEPS) {
    nSteps = MAX_STEPS;
    dt = totalTime / nSteps;
  }

  let T = new Float32Array(Nr * Nz).fill(roomK);
  let Tn = new Float32Array(Nr * Nz);

  const frames: ThermalFrame[] = [];
  const frameEvery = Math.max(1, Math.floor(nSteps / frameCount));
  let maxTemp = roomK;

  const harmonic = (a: number, b: number) => (2 * a * b) / (a + b || 1);

  for (let step = 0; step <= nSteps; step++) {
    const time = step * dt;
    const sourceOn = time <= weldTime;

    for (let i = 0; i < Nr; i++) {
      const r = i * dr;
      for (let j = 0; j < Nz; j++) {
        const p = idx(i, j, Nz);
        const Tp = T[p];

        // Biên Dirichlet: mặt điện cực làm mát (z=0 và z=Z, trong vùng tiếp xúc)
        if ((j === 0 || j === Nz - 1) && inColumn(i)) {
          Tn[p] = roomK;
          continue;
        }
        // Biên xa: r = R giữ nhiệt phòng (tản vào kim loại xung quanh)
        if (i === Nr - 1) {
          Tn[p] = roomK;
          continue;
        }

        // --- Khuếch tán theo r (trục đối xứng) ---
        let dr2 = 0;
        const kp = k[p];
        if (i === 0) {
          // Trục đối xứng: dùng giới hạn 4k(T1 - T0)/dr²
          const kE = harmonic(kp, k[idx(1, j, Nz)]);
          dr2 = (4 * kE * (T[idx(1, j, Nz)] - Tp)) / (dr * dr);
        } else {
          const kE = harmonic(kp, k[idx(i + 1, j, Nz)]);
          const kW = harmonic(kp, k[idx(i - 1, j, Nz)]);
          const rE = r + dr / 2;
          const rW = r - dr / 2;
          const fluxE = (kE * rE * (T[idx(i + 1, j, Nz)] - Tp)) / dr;
          const fluxW = (kW * rW * (Tp - T[idx(i - 1, j, Nz)])) / dr;
          dr2 = (fluxE - fluxW) / (r * dr);
        }

        // --- Khuếch tán theo z ---
        let dz2 = 0;
        {
          const kN = j < Nz - 1 ? harmonic(kp, k[idx(i, j + 1, Nz)]) : kp;
          const kS = j > 0 ? harmonic(kp, k[idx(i, j - 1, Nz)]) : kp;
          const TN = j < Nz - 1 ? T[idx(i, j + 1, Nz)] : Tp; // mặt tự do: cách nhiệt
          const TS = j > 0 ? T[idx(i, j - 1, Nz)] : Tp;
          dz2 = (kN * (TN - Tp) - kS * (Tp - TS)) / (dz * dz);
        }

        const q = sourceOn && inColumn(i) ? qVol : 0;
        Tn[p] = Tp + (dt / rhoCp[p]) * (dr2 + dz2 + q);
      }
    }

    // hoán đổi buffer
    const tmp = T;
    T = Tn;
    Tn = tmp;

    if (step % frameEvery === 0 || step === nSteps) {
      const frame = extractFrame(T, time, { Nr, Nz, dr, dz, R, Z, t1 }, meltNode);
      frames.push(frame);
      maxTemp = Math.max(maxTemp, frame.peak);
    }
  }

  return { grid: { Nr, Nz, dr, dz, R, Z, t1 }, frames, roomK, meltK, maxTemp, weldTime, totalTime };
}

function extractFrame(
  T: Float32Array,
  time: number,
  grid: ThermalGrid,
  meltNode: Float32Array,
): ThermalFrame {
  const { Nr, Nz, dr, dz, t1 } = grid;
  let peak = 0;
  for (let p = 0; p < T.length; p++) peak = Math.max(peak, T[p]);

  // Nugget tại mặt faying (j gần t1): bán kính lớn nhất còn nóng chảy
  const jFay = Math.round(t1 / dz);
  let meltRadius = 0;
  for (let i = 0; i < Nr; i++) {
    const p = idx(i, jFay, Nz);
    if (T[p] >= meltNode[p]) meltRadius = i * dr;
  }
  // Độ ngấu: dọc trục r=0, đo vùng nóng chảy lên trên (tấm1) và xuống dưới (tấm2)
  let meltDepthTop = 0;
  let meltDepthBottom = 0;
  for (let j = jFay; j >= 0; j--) {
    const p = idx(0, j, Nz);
    if (T[p] >= meltNode[p]) meltDepthTop = (jFay - j) * dz;
    else break;
  }
  for (let j = jFay; j < Nz; j++) {
    const p = idx(0, j, Nz);
    if (T[p] >= meltNode[p]) meltDepthBottom = (j - jFay) * dz;
    else break;
  }

  return {
    time,
    T: T.slice(),
    peak,
    meltRadius,
    meltDepthTop,
    meltDepthBottom,
  };
}
