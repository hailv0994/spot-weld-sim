// ============================================================================
// Kiểu dữ liệu lõi cho mô phỏng hàn điểm (resistance spot welding)
// Đơn vị SI nội bộ: m, kg, s, A, K, Pa, J, W. UI có thể hiển thị mm/kN/°C.
// ============================================================================

/** Thuộc tính vật liệu của một linh kiện (tấm hàn). Tất cả do user nhập, có preset gợi ý. */
export interface Material {
  id: string;
  name: string;
  /** Điện trở suất ở nhiệt độ phòng (Ω·m). Thép thấp ~1.6e-7, inox ~7.2e-7, nhôm ~2.8e-8 */
  resistivity20: number;
  /** Hệ số nhiệt của điện trở suất (1/K). Thép ~4.5e-3 */
  resistivityTempCoeff: number;
  /** Khối lượng riêng (kg/m³) */
  density: number;
  /** Nhiệt dung riêng (J/kg·K) */
  specificHeat: number;
  /** Độ dẫn nhiệt (W/m·K) */
  thermalConductivity: number;
  /** Nhiệt độ nóng chảy (K) */
  meltingPoint: number;
  /** Ẩn nhiệt nóng chảy (J/kg) */
  latentHeatFusion: number;
  /** Hệ số giãn nở nhiệt dài (1/K) */
  thermalExpansion: number;
  /** Giới hạn bền kéo UTS (Pa) */
  ultimateTensileStrength: number;
  /** Giới hạn chảy (Pa) */
  yieldStrength: number;
}

/** Hình học mối hàn / điện cực. */
export interface Geometry {
  /** Chiều dày tấm 1 (m) */
  thickness1: number;
  /** Chiều dày tấm 2 (m) */
  thickness2: number;
  /** Đường kính mặt tiếp xúc điện cực (m). Quy tắc: d_e ≈ 5√t (t theo mm) → mm */
  electrodeFaceDiameter: number;
}

/** Spec máy hàn điểm — giới hạn quá trình. */
export interface MachineSpec {
  /** Dòng hàn tối đa (A) */
  maxCurrent: number;
  /** Dòng hàn tối thiểu khả dụng (A) */
  minCurrent: number;
  /** Lực ép điện cực tối đa (N) */
  maxForce: number;
  /** Lực ép tối thiểu (N) */
  minForce: number;
  /** Thời gian hàn tối đa (s) */
  maxWeldTime: number;
  /** Tần số nguồn (Hz) — AC 50/60, hoặc MFDC */
  frequency: number;
  /** Loại nguồn */
  type: 'AC' | 'MFDC' | 'DC';
}

/** Yêu cầu sản phẩm từ bản vẽ 2D. */
export interface ProductRequirement {
  /** Đường kính nugget mục tiêu (m). Nếu 0 → tự suy từ quy tắc 5√t */
  targetNuggetDiameter: number;
  /** Độ ngấu tối thiểu (% chiều dày tấm mỏng hơn), 0–1 */
  minPenetration: number;
  /** Lực kéo phá hủy mối hàn yêu cầu (N) */
  requiredTensileForce: number;
}

/** Hệ số mô hình (hiệu chỉnh được — đây là phần "hybrid"). */
export interface ModelCoeffs {
  /** Hiệu suất nhiệt η: phần Q đi vào tạo nugget (0.2–0.5) */
  heatEfficiency: number;
  /** Hệ số điện trở tiếp xúc faying (Ω·N^contactForceExp tham chiếu) */
  contactResistanceFactor: number;
  /** Mũ phụ thuộc lực của điện trở tiếp xúc (âm: lực tăng → R giảm) */
  contactForceExp: number;
  /** Hệ số bền cắt mối hàn so với UTS (τ = factor·UTS), ~0.5–0.7 */
  weldShearFactor: number;
  /** Ngưỡng bắn tóe: mật độ năng lượng tới hạn (J/mm³) gây expulsion */
  expulsionEnergyDensity: number;
  /** Tỉ lệ hình dạng nugget AR = đường kính / chiều cao (nugget dẹt: ~2–3.5) */
  nuggetAspectRatio: number;
}

/** Một bộ tham số hàn (điểm làm việc). */
export interface WeldParameters {
  /** Dòng hàn (A) */
  current: number;
  /** Lực ép (N) */
  force: number;
  /** Thời gian hàn (s) */
  weldTime: number;
}

/** Kết quả tính cho một bộ tham số. */
export interface WeldResult {
  params: WeldParameters;
  /** Tổng điện trở động hiệu dụng (Ω) */
  totalResistance: number;
  /** Nhiệt Joule sinh ra (J) */
  heatGenerated: number;
  /** Nhiệt hữu ích vào nugget (J) */
  effectiveHeat: number;
  /** Đường kính nugget dự đoán (m) */
  nuggetDiameter: number;
  /** Độ ngấu (phần chiều dày tấm mỏng, 0–1) */
  penetration: number;
  /** Nhiệt độ đỉnh vùng hàn (K) */
  peakTemperature: number;
  /** Lực kéo phá hủy dự đoán (N) */
  predictedTensileForce: number;
  /** Mật độ năng lượng (J/mm³) — chỉ báo bắn tóe */
  energyDensity: number;
  /** Cờ cảnh báo */
  flags: {
    expulsion: boolean;
    notMelted: boolean;
    meetsNugget: boolean;
    meetsPenetration: boolean;
    meetsTensile: boolean;
  };
}

export const T_ROOM = 293.15; // K (20°C)
