import type { Material } from './types';
import { getPreset } from './materials';

// ============================================================================
// Suy luận thông số vật liệu từ MÃ TIÊU CHUẨN bất kỳ (không cần có trong CSDL).
// Nhận diện họ vật liệu qua tiền tố + cấp độ bền nhúng trong mã (vd DP980 → UTS
// 980 MPa) rồi ước lượng các thuộc tính nhiệt-điện-cơ theo template của họ đó.
// → "bất kể vật liệu gì cũng phân tích được, miễn là mã tiêu chuẩn".
// Giá trị suy luận là ƯỚC LƯỢNG theo họ — nên hiệu chỉnh bằng mẫu thử thực tế.
// ============================================================================

export type MaterialSource = 'preset' | 'inferred';

export interface ResolvedMaterial {
  material: Material;
  source: MaterialSource;
  /** Nhãn họ vật liệu (hiển thị cho user) */
  family: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const C = (k: number) => k + 273.15; // °C → K

/**
 * Thép (carbon/HSLA/AHSS) suy từ giới hạn bền kéo (MPa).
 * Điện trở suất tăng & độ dẫn nhiệt giảm theo độ bền — khớp xu hướng AHSS thực tế.
 */
function steelFromUTS(id: string, name: string, utsMPa: number, yieldRatio = 0.6): Material {
  const resistivity20 = clamp(1.6e-7 + (utsMPa - 300) * 1.5e-10, 1.5e-7, 3.2e-7);
  const thermalConductivity = clamp(52 - (utsMPa - 300) * 0.02, 32, 55);
  return {
    id,
    name,
    resistivity20,
    resistivityTempCoeff: 4.3e-3,
    density: 7850,
    specificHeat: 475,
    thermalConductivity,
    meltingPoint: 1788,
    latentHeatFusion: 2.7e5,
    thermalExpansion: 1.2e-5,
    ultimateTensileStrength: utsMPa * 1e6,
    yieldStrength: utsMPa * yieldRatio * 1e6,
  };
}

/** Template nhôm theo series (4 chữ số đầu). */
function aluminum(id: string, series: number): Material {
  // [rho(Ω·m), k(W/mK), UTS(MPa), yield(MPa), tên series]
  const table: Record<number, [number, number, number, number, string]> = {
    1: [2.8e-8, 229, 90, 35, '1xxx (Al nguyên chất)'],
    2: [5.7e-8, 120, 430, 290, '2xxx (Al-Cu)'],
    3: [4.3e-8, 160, 180, 70, '3xxx (Al-Mn)'],
    5: [5.0e-8, 135, 240, 150, '5xxx (Al-Mg)'],
    6: [4.0e-8, 165, 290, 240, '6xxx (Al-Mg-Si)'],
    7: [5.2e-8, 130, 540, 470, '7xxx (Al-Zn)'],
  };
  const [rho, k, uts, yld, label] = table[series] ?? table[6];
  return {
    id,
    name: `Nhôm ${label}`,
    resistivity20: rho,
    resistivityTempCoeff: 4.0e-3,
    density: 2700,
    specificHeat: 900,
    thermalConductivity: k,
    meltingPoint: C(620),
    latentHeatFusion: 3.97e5,
    thermalExpansion: 2.36e-5,
    ultimateTensileStrength: uts * 1e6,
    yieldStrength: yld * 1e6,
  };
}

/** Thép không gỉ — austenitic (3xx) hoặc ferritic/martensitic (4xx). */
function stainless(id: string, kind: 'austenitic' | 'ferritic'): Material {
  if (kind === 'ferritic') {
    return {
      id, name: 'Thép không gỉ ferritic/martensitic (4xx)',
      resistivity20: 6.0e-7, resistivityTempCoeff: 1.3e-3,
      density: 7750, specificHeat: 460, thermalConductivity: 25,
      meltingPoint: 1753, latentHeatFusion: 2.7e5, thermalExpansion: 1.0e-5,
      ultimateTensileStrength: 480e6, yieldStrength: 280e6,
    };
  }
  return {
    id, name: 'Thép không gỉ austenitic (3xx)',
    resistivity20: 7.2e-7, resistivityTempCoeff: 1.0e-3,
    density: 8000, specificHeat: 500, thermalConductivity: 16,
    meltingPoint: 1723, latentHeatFusion: 2.8e5, thermalExpansion: 1.7e-5,
    ultimateTensileStrength: 520e6, yieldStrength: 210e6,
  };
}

/** Hợp kim đồng làm điện cực (Cu-Cr-Zr, C181xx, RWMA Class 2…). */
function copper(id: string): Material {
  return {
    id, name: 'Hợp kim đồng (điện cực)',
    resistivity20: 2.1e-8, resistivityTempCoeff: 3.0e-3,
    density: 8900, specificHeat: 385, thermalConductivity: 320,
    meltingPoint: 1356, latentHeatFusion: 2.05e5, thermalExpansion: 1.7e-5,
    ultimateTensileStrength: 420e6, yieldStrength: 360e6,
  };
}

/** Thép carbon thấp / tấm mạ (mild) khi không có cấp bền nhúng trong mã. */
function mildSteel(id: string, name: string): Material {
  return steelFromUTS(id, name, 320, 0.6);
}

interface Rule {
  re: RegExp;
  build: (code: string, m: RegExpMatchArray) => Material;
  family: string;
}

// Thứ tự: cụ thể → tổng quát. CC = mã đã chuẩn hoá (HOA, bỏ khoảng trắng).
const RULES: Rule[] = [
  // Đồng / điện cực — CuCr, CuCrZr, C18xxx, RWMA Class…
  { re: /^(CU[-]?CR|CUCRZR|CUCR1ZR|CUCRZ|C181\d\d|C152\d\d|C180\d\d|RWMA)/, family: 'Hợp kim đồng (điện cực)',
    build: (c) => copper(c) },
  // Thép tôi ép / boron (press-hardened)
  { re: /(22MNB5|MBW|USIBOR|PHS15\d\d|MARTENS)/, family: 'Thép tôi ép / martensitic',
    build: (c) => steelFromUTS(c, 'Thép tôi ép (press-hardened)', 1500, 0.73) },
  // AHSS có cấp bền trong mã: DP/TRIP/CP/FB/MS/MART/QP + số
  { re: /^(DP|TRIP|TRP|CP|FB|MS|MART|QP|RA)[-]?(\d{3,4})/, family: 'AHSS (suy từ cấp bền)',
    build: (c, m) => steelFromUTS(c, `AHSS ${m[1]}${m[2]}`, +m[2], 0.6) },
  // HSLA / thép tấm cường độ cao JIS có số = UTS: SAPH/SPFH/SPFC/SAFH/SPFC...
  { re: /^(SAPH|SPFH|SPFC|SAFH|SAFC|SPFE|HC|HX|HR|CR)[-]?(\d{3})/, family: 'HSLA (suy từ cấp bền)',
    build: (c, m) => steelFromUTS(c, `HSLA ${m[1]}${m[2]}`, +m[2], 0.65) },
  // Kết cấu JIS: SS + số (SS400). Phải sau SUS.
  { re: /^SS[-]?(\d{3})/, family: 'Thép kết cấu (suy từ cấp bền)',
    build: (c, m) => steelFromUTS(c, `Thép kết cấu ${c}`, +m[1], 0.6) },
  // Thép tấm carbon thấp JIS (mã chữ, không có số bền)
  { re: /^(SPCC|SPCD|SPCE|SPCEN|SPHC|SPHD|SPHE|SGCC|SGHC|SECC|SECD|SPCG|SPCF|ST\d\d)/,
    family: 'Thép carbon thấp / tấm mạ',
    build: (c) => mildSteel(c, `Thép carbon thấp ${c}`) },
  // Inox: SUS / AISI 3xx (austenitic) hoặc 4xx (ferritic). Cả EN 1.43xx, 1.44xx.
  { re: /^(SUS|AISI|UNS\s?S)?\s?3\d{2}$/, family: 'Inox austenitic (3xx)',
    build: (c) => stainless(c, 'austenitic') },
  { re: /^(SUS|AISI|UNS\s?S)?\s?4\d{2}$/, family: 'Inox ferritic/martensitic (4xx)',
    build: (c) => stainless(c, 'ferritic') },
  { re: /^1\.4(3|5|6)\d\d$/, family: 'Inox austenitic (EN 1.4xxx)',
    build: (c) => stainless(c, 'austenitic') },
  { re: /^1\.4(0|1|2)\d\d$/, family: 'Inox ferritic/martensitic (EN 1.4xxx)',
    build: (c) => stainless(c, 'ferritic') },
  // Nhôm: AL/A/EN-AW + 4 số, hoặc 4 số trần (1000–7999) với T/H temper tùy chọn.
  { re: /^(?:AL|A|ENAW)?[-]?([1-9])\d{3}(?:[-]?[THF]\d*)?$/, family: 'Hợp kim nhôm (suy từ series)',
    build: (c, m) => aluminum(c, +m[1]) },
];

/**
 * Phân giải mã vật liệu → Material.
 * 1) Khớp chính xác trong CSDL preset → source 'preset'.
 * 2) Nhận diện theo họ + cấp bền → source 'inferred'.
 * 3) Không nhận ra → null.
 */
export function resolveMaterial(rawCode: string): ResolvedMaterial | null {
  const trimmed = rawCode.trim();
  if (!trimmed) return null;

  // 1) CSDL preset (id lowercase, vd 'dp980', 'sus304', 'al6061-t6')
  const preset = getPreset(trimmed.toLowerCase());
  if (preset) return { material: preset, source: 'preset', family: preset.name };

  // 2) Suy luận theo họ
  const CC = trimmed.toUpperCase().replace(/\s+/g, '');
  for (const rule of RULES) {
    const m = CC.match(rule.re);
    if (m) {
      const mat = rule.build(trimmed.toLowerCase(), m);
      return { material: { ...mat, name: mat.name }, source: 'inferred', family: rule.family };
    }
  }
  return null;
}
