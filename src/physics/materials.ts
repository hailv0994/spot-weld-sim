import type { Material } from './types';

// ============================================================================
// Preset vật liệu gợi ý — TẤT CẢ đều sửa được trong UI (user tự nhập là chính).
// Số liệu tham khảo ở nhiệt độ phòng; là điểm khởi đầu, không phải khóa cứng.
// ============================================================================

export const MATERIAL_PRESETS: Material[] = [
  {
    id: 'low-carbon-steel',
    name: 'Thép carbon thấp (SPCC/SPHC)',
    resistivity20: 1.6e-7,
    resistivityTempCoeff: 4.5e-3,
    density: 7850,
    specificHeat: 486,
    thermalConductivity: 52,
    meltingPoint: 1793, // ~1520°C
    latentHeatFusion: 2.7e5,
    thermalExpansion: 1.25e-5,
    ultimateTensileStrength: 350e6,
    yieldStrength: 210e6,
  },
  {
    id: 'hsla-steel',
    name: 'Thép HSLA (SAPH440)',
    resistivity20: 1.9e-7,
    resistivityTempCoeff: 4.3e-3,
    density: 7850,
    specificHeat: 470,
    thermalConductivity: 48,
    meltingPoint: 1788,
    latentHeatFusion: 2.7e5,
    thermalExpansion: 1.2e-5,
    ultimateTensileStrength: 440e6,
    yieldStrength: 305e6,
  },
  {
    id: 'stainless-304',
    name: 'Thép không gỉ (SUS304)',
    resistivity20: 7.2e-7,
    resistivityTempCoeff: 1.0e-3,
    density: 8000,
    specificHeat: 500,
    thermalConductivity: 16,
    meltingPoint: 1723,
    latentHeatFusion: 2.8e5,
    thermalExpansion: 1.7e-5,
    ultimateTensileStrength: 515e6,
    yieldStrength: 205e6,
  },
  {
    id: 'aluminum-5052',
    name: 'Nhôm (Al 5052)',
    resistivity20: 4.9e-8,
    resistivityTempCoeff: 3.9e-3,
    density: 2680,
    specificHeat: 900,
    thermalConductivity: 138,
    meltingPoint: 880, // ~607°C
    latentHeatFusion: 3.97e5,
    thermalExpansion: 2.38e-5,
    ultimateTensileStrength: 228e6,
    yieldStrength: 195e6,
  },
];

export function getPreset(id: string): Material | undefined {
  const p = MATERIAL_PRESETS.find((m) => m.id === id);
  return p ? { ...p } : undefined;
}

/** Điện trở suất phụ thuộc nhiệt độ: ρ(T) = ρ20·(1 + α·(T − T_room)). */
export function resistivityAt(mat: Material, tempK: number, roomK = 293.15): number {
  return mat.resistivity20 * (1 + mat.resistivityTempCoeff * (tempK - roomK));
}

/** Năng lượng để nung 1 kg vật liệu từ nhiệt phòng đến nóng chảy hoàn toàn (J/kg). */
export function meltEnthalpyPerKg(mat: Material, roomK = 293.15): number {
  return mat.specificHeat * (mat.meltingPoint - roomK) + mat.latentHeatFusion;
}
