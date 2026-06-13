import type {
  Geometry,
  MachineSpec,
  ProductRequirement,
  ModelCoeffs,
} from './types';
import { getPreset } from './materials';

// ============================================================================
// Giá trị mặc định khởi tạo — tất cả sửa được trong UI.
// Chọn theo một mối hàn thép tấm 1mm điển hình để app chạy ra kết quả hợp lý ngay.
// ============================================================================

export const DEFAULT_MATERIAL_1 = getPreset('spcc')!;
export const DEFAULT_MATERIAL_2 = getPreset('spcc')!;
export const DEFAULT_MATERIAL_ELECTRODE = getPreset('cu-cr-zr')!;

export const DEFAULT_GEOMETRY: Geometry = {
  thickness1: 1.0e-3, // 1.0 mm
  thickness2: 1.0e-3,
  electrodeFaceDiameter: 6.0e-3, // 6 mm (≈ 5√t mm)
};

export const DEFAULT_MACHINE: MachineSpec = {
  maxCurrent: 14000, // 14 kA
  minCurrent: 2000,
  maxForce: 6000, // 6 kN
  minForce: 500,
  maxWeldTime: 0.5, // 500 ms
  frequency: 50,
  type: 'AC',
};

export const DEFAULT_REQUIREMENT: ProductRequirement = {
  targetNuggetDiameter: 0, // 0 → tự suy quy tắc 4√t
  minPenetration: 0.3, // ≥30% chiều dày tấm mỏng
  requiredTensileForce: 3000, // 3 kN (hợp lý cho thép tấm 1mm)
};

export const DEFAULT_COEFFS: ModelCoeffs = {
  heatEfficiency: 0.25,
  contactResistanceFactor: 2.0e4,
  contactForceExp: -0.5,
  weldShearFactor: 0.6,
  expulsionEnergyDensity: 12, // J/mm³
  nuggetAspectRatio: 2.5,
};
