import type { Material } from './types';

// ============================================================================
// Cơ sở dữ liệu vật liệu — tra theo mã tiêu chuẩn (JIS/ISO/EN/ASTM).
// Số liệu ở nhiệt độ phòng; là điểm khởi đầu, hiệu chỉnh theo thực tế xưởng.
// ============================================================================

export const MATERIAL_PRESETS: Material[] = [
  // ── Thép carbon thấp ──────────────────────────────────────────────────────
  {
    id: 'spcc',
    name: 'SPCC',
    resistivity20: 1.6e-7, resistivityTempCoeff: 4.5e-3,
    density: 7850, specificHeat: 486, thermalConductivity: 52,
    meltingPoint: 1793, latentHeatFusion: 2.7e5, thermalExpansion: 1.25e-5,
    ultimateTensileStrength: 320e6, yieldStrength: 195e6,
  },
  {
    id: 'sphc',
    name: 'SPHC',
    resistivity20: 1.55e-7, resistivityTempCoeff: 4.5e-3,
    density: 7850, specificHeat: 490, thermalConductivity: 51,
    meltingPoint: 1793, latentHeatFusion: 2.7e5, thermalExpansion: 1.25e-5,
    ultimateTensileStrength: 300e6, yieldStrength: 175e6,
  },
  {
    id: 'sgcc',
    name: 'SGCC (mạ kẽm)',
    resistivity20: 1.7e-7, resistivityTempCoeff: 4.4e-3,
    density: 7870, specificHeat: 480, thermalConductivity: 50,
    meltingPoint: 1793, latentHeatFusion: 2.7e5, thermalExpansion: 1.2e-5,
    ultimateTensileStrength: 340e6, yieldStrength: 210e6,
  },
  {
    id: 'secc',
    name: 'SECC (mạ điện phân)',
    resistivity20: 1.65e-7, resistivityTempCoeff: 4.4e-3,
    density: 7860, specificHeat: 483, thermalConductivity: 51,
    meltingPoint: 1793, latentHeatFusion: 2.7e5, thermalExpansion: 1.22e-5,
    ultimateTensileStrength: 330e6, yieldStrength: 200e6,
  },
  {
    id: 'ss400',
    name: 'SS400',
    resistivity20: 1.6e-7, resistivityTempCoeff: 4.5e-3,
    density: 7850, specificHeat: 486, thermalConductivity: 51,
    meltingPoint: 1793, latentHeatFusion: 2.7e5, thermalExpansion: 1.2e-5,
    ultimateTensileStrength: 430e6, yieldStrength: 245e6,
  },
  // ── Thép HSLA / cường độ cao ──────────────────────────────────────────────
  {
    id: 'saph370',
    name: 'SAPH370',
    resistivity20: 1.75e-7, resistivityTempCoeff: 4.3e-3,
    density: 7850, specificHeat: 475, thermalConductivity: 50,
    meltingPoint: 1788, latentHeatFusion: 2.7e5, thermalExpansion: 1.2e-5,
    ultimateTensileStrength: 370e6, yieldStrength: 225e6,
  },
  {
    id: 'saph440',
    name: 'SAPH440',
    resistivity20: 1.9e-7, resistivityTempCoeff: 4.3e-3,
    density: 7850, specificHeat: 470, thermalConductivity: 48,
    meltingPoint: 1788, latentHeatFusion: 2.7e5, thermalExpansion: 1.2e-5,
    ultimateTensileStrength: 440e6, yieldStrength: 305e6,
  },
  {
    id: 'dp590',
    name: 'DP590 (Dual Phase)',
    resistivity20: 2.1e-7, resistivityTempCoeff: 4.0e-3,
    density: 7850, specificHeat: 470, thermalConductivity: 45,
    meltingPoint: 1783, latentHeatFusion: 2.72e5, thermalExpansion: 1.18e-5,
    ultimateTensileStrength: 590e6, yieldStrength: 340e6,
  },
  {
    id: 'dp780',
    name: 'DP780 (Dual Phase)',
    resistivity20: 2.4e-7, resistivityTempCoeff: 3.8e-3,
    density: 7850, specificHeat: 465, thermalConductivity: 42,
    meltingPoint: 1783, latentHeatFusion: 2.72e5, thermalExpansion: 1.15e-5,
    ultimateTensileStrength: 780e6, yieldStrength: 440e6,
  },
  {
    id: 'dp980',
    name: 'DP980 (Dual Phase)',
    resistivity20: 2.7e-7, resistivityTempCoeff: 3.5e-3,
    density: 7850, specificHeat: 460, thermalConductivity: 40,
    meltingPoint: 1783, latentHeatFusion: 2.72e5, thermalExpansion: 1.12e-5,
    ultimateTensileStrength: 980e6, yieldStrength: 590e6,
  },
  {
    id: 'trip590',
    name: 'TRIP590',
    resistivity20: 2.2e-7, resistivityTempCoeff: 4.0e-3,
    density: 7850, specificHeat: 472, thermalConductivity: 44,
    meltingPoint: 1783, latentHeatFusion: 2.7e5, thermalExpansion: 1.18e-5,
    ultimateTensileStrength: 590e6, yieldStrength: 380e6,
  },
  {
    id: 'mart1200',
    name: 'Martensitic 1200',
    resistivity20: 3.0e-7, resistivityTempCoeff: 3.2e-3,
    density: 7850, specificHeat: 455, thermalConductivity: 37,
    meltingPoint: 1783, latentHeatFusion: 2.72e5, thermalExpansion: 1.1e-5,
    ultimateTensileStrength: 1200e6, yieldStrength: 950e6,
  },
  // ── Thép không gỉ ─────────────────────────────────────────────────────────
  {
    id: 'sus304',
    name: 'SUS304',
    resistivity20: 7.2e-7, resistivityTempCoeff: 1.0e-3,
    density: 8000, specificHeat: 500, thermalConductivity: 16,
    meltingPoint: 1723, latentHeatFusion: 2.8e5, thermalExpansion: 1.7e-5,
    ultimateTensileStrength: 515e6, yieldStrength: 205e6,
  },
  {
    id: 'sus301',
    name: 'SUS301',
    resistivity20: 6.9e-7, resistivityTempCoeff: 1.1e-3,
    density: 7900, specificHeat: 502, thermalConductivity: 15,
    meltingPoint: 1723, latentHeatFusion: 2.8e5, thermalExpansion: 1.72e-5,
    ultimateTensileStrength: 760e6, yieldStrength: 415e6,
  },
  {
    id: 'sus430',
    name: 'SUS430 (Ferritic)',
    resistivity20: 6.0e-7, resistivityTempCoeff: 1.3e-3,
    density: 7750, specificHeat: 460, thermalConductivity: 26,
    meltingPoint: 1753, latentHeatFusion: 2.7e5, thermalExpansion: 1.0e-5,
    ultimateTensileStrength: 480e6, yieldStrength: 205e6,
  },
  // ── Nhôm ──────────────────────────────────────────────────────────────────
  {
    id: 'al1050',
    name: 'Al 1050',
    resistivity20: 2.8e-8, resistivityTempCoeff: 4.0e-3,
    density: 2705, specificHeat: 920, thermalConductivity: 229,
    meltingPoint: 920, latentHeatFusion: 3.97e5, thermalExpansion: 2.36e-5,
    ultimateTensileStrength: 100e6, yieldStrength: 35e6,
  },
  {
    id: 'al5052',
    name: 'Al 5052',
    resistivity20: 4.9e-8, resistivityTempCoeff: 3.9e-3,
    density: 2680, specificHeat: 900, thermalConductivity: 138,
    meltingPoint: 880, latentHeatFusion: 3.97e5, thermalExpansion: 2.38e-5,
    ultimateTensileStrength: 228e6, yieldStrength: 195e6,
  },
  {
    id: 'al5754',
    name: 'Al 5754',
    resistivity20: 5.4e-8, resistivityTempCoeff: 3.7e-3,
    density: 2660, specificHeat: 900, thermalConductivity: 130,
    meltingPoint: 880, latentHeatFusion: 3.97e5, thermalExpansion: 2.38e-5,
    ultimateTensileStrength: 240e6, yieldStrength: 100e6,
  },
  {
    id: 'al6061-t6',
    name: 'Al 6061-T6',
    resistivity20: 3.99e-8, resistivityTempCoeff: 4.1e-3,
    density: 2700, specificHeat: 896, thermalConductivity: 167,
    meltingPoint: 890, latentHeatFusion: 3.97e5, thermalExpansion: 2.36e-5,
    ultimateTensileStrength: 310e6, yieldStrength: 276e6,
  },
  {
    id: 'al6016',
    name: 'Al 6016 (Automotive)',
    resistivity20: 4.3e-8, resistivityTempCoeff: 4.0e-3,
    density: 2700, specificHeat: 900, thermalConductivity: 160,
    meltingPoint: 890, latentHeatFusion: 3.97e5, thermalExpansion: 2.35e-5,
    ultimateTensileStrength: 240e6, yieldStrength: 145e6,
  },
  // ── Đồng / điện cực ───────────────────────────────────────────────────────
  {
    id: 'cu-cr-zr',
    name: 'Cu-Cr-Zr (điện cực)',
    resistivity20: 2.1e-8, resistivityTempCoeff: 3.0e-3,
    density: 8900, specificHeat: 385, thermalConductivity: 320,
    meltingPoint: 1356, latentHeatFusion: 2.05e5, thermalExpansion: 1.7e-5,
    ultimateTensileStrength: 420e6, yieldStrength: 360e6,
  },
];

export function getPreset(id: string): Material | undefined {
  const p = MATERIAL_PRESETS.find((m) => m.id === id);
  return p ? { ...p } : undefined;
}

/** Tìm kiếm theo mã hoặc tên (case-insensitive, tìm chuỗi con). */
export function searchMaterials(query: string): Material[] {
  const q = query.trim().toLowerCase();
  if (!q) return MATERIAL_PRESETS;
  return MATERIAL_PRESETS.filter(
    (m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q),
  );
}

/** Điện trở suất phụ thuộc nhiệt độ: ρ(T) = ρ20·(1 + α·(T − T_room)). */
export function resistivityAt(mat: Material, tempK: number, roomK = 293.15): number {
  return mat.resistivity20 * (1 + mat.resistivityTempCoeff * (tempK - roomK));
}

/** Năng lượng để nung 1 kg vật liệu từ nhiệt phòng đến nóng chảy hoàn toàn (J/kg). */
export function meltEnthalpyPerKg(mat: Material, roomK = 293.15): number {
  return mat.specificHeat * (mat.meltingPoint - roomK) + mat.latentHeatFusion;
}
