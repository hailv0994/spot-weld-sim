import type { Material, Geometry, ModelCoeffs } from './types';
import { electrodeContactArea } from './resistance';

// ============================================================================
// Dự đoán nugget (vùng nóng chảy) & độ ngấu từ cân bằng năng lượng.
//
// 1. Năng lượng riêng để nóng chảy hoàn toàn 1 m³ (từ nhiệt phòng):
//        e_melt = ρ·(c_p·(T_melt − T0) + L)            [J/m³]
// 2. Thể tích nóng chảy được với nhiệt hữu ích Q_eff:
//        V_n = Q_eff / e_melt
//    (η đã gộp tổn thất dẫn nhiệt/điện cực, nên ở đây coi Q_eff dồn vào nóng chảy)
// 3. Hình dạng nugget = ellipsoid dẹt, AR = d/H:
//        V_n = (π/4)·d²·H = (π/4)·AR²·H³  ⇒  H = (4·V_n/(π·AR²))^(1/3)
//        d = AR·H ; độ ngấu mỗi tấm = H/2
// 4. Nhiệt độ đỉnh ước lượng trong cột điện cực (kiểm tra nóng chảy & bắn tóe).
// ============================================================================

export interface NuggetResult {
  /** Đường kính nugget (m) */
  diameter: number;
  /** Chiều cao nugget tổng qua mặt faying (m) */
  height: number;
  /** Độ ngấu (phần chiều dày tấm mỏng hơn, 0–1) */
  penetration: number;
  /** Thể tích nóng chảy (m³) */
  meltedVolume: number;
  /** Nhiệt độ đỉnh vùng hàn (K) */
  peakTemperature: number;
  /** Mật độ năng lượng trong cột điện cực (J/mm³) */
  energyDensity: number;
  notMelted: boolean;
}

/** Trung bình hai vật liệu cho ước lượng nhiệt-vật-lý chung. */
function avg(a: number, b: number): number {
  return (a + b) / 2;
}

export function predictNugget(
  mat1: Material,
  mat2: Material,
  geom: Geometry,
  effectiveHeatJ: number,
  coeffs: ModelCoeffs,
  roomK = 293.15,
): NuggetResult {
  const density = avg(mat1.density, mat2.density);
  const cp = avg(mat1.specificHeat, mat2.specificHeat);
  const tMelt = avg(mat1.meltingPoint, mat2.meltingPoint);
  const latent = avg(mat1.latentHeatFusion, mat2.latentHeatFusion);

  const eMelt = density * (cp * (tMelt - roomK) + latent); // J/m³

  // Cột điều khiển dưới điện cực (để ước lượng nhiệt độ đỉnh & mật độ năng lượng)
  const area = electrodeContactArea(geom);
  const columnHeight = geom.thickness1 + geom.thickness2;
  const controlVolume = area * columnHeight; // m³
  const thinner = Math.min(geom.thickness1, geom.thickness2);
  const rhoCpV = density * cp * controlVolume;
  const energyDensity = effectiveHeatJ / (controlVolume * 1e9); // J/mm³

  // Ngưỡng tạo nugget: năng lượng đủ nung chảy một lớp mỏng tại mặt faying
  // (đĩa đường kính = mặt điện cực, dày h0 = 0.15·t_mỏng). NHẤT QUÁN với cách tính
  // thể tích bên dưới → nugget lớn dần từ ngưỡng thay vì nhảy bậc.
  const h0 = 0.15 * thinner;
  const eThreshold = area * h0 * eMelt;

  // Chưa đạt nóng chảy
  if (effectiveHeatJ <= eThreshold) {
    return {
      diameter: 0,
      height: 0,
      penetration: 0,
      meltedVolume: 0,
      peakTemperature: roomK + effectiveHeatJ / rhoCpV,
      energyDensity,
      notMelted: true,
    };
  }

  // Thể tích nóng chảy từ năng lượng VƯỢT ngưỡng
  const meltedVolume = (effectiveHeatJ - eThreshold) / eMelt;

  const AR = coeffs.nuggetAspectRatio;
  let height = Math.cbrt((4 * meltedVolume) / (Math.PI * AR * AR));
  let diameter = AR * height;

  // Giới hạn chiều cao bởi tổng chiều dày (vật lý: không vượt quá 2 tấm)
  const maxHeight = columnHeight;
  if (height > maxHeight) {
    height = maxHeight;
    diameter = Math.sqrt((4 * meltedVolume) / (Math.PI * height));
  }

  const penetration = Math.min(1, height / 2 / thinner);

  // Nhiệt độ đỉnh: ≥ T_melt khi đã chảy, tăng theo năng lượng vượt ngưỡng, chặn trần.
  // (Lumped bỏ qua dẫn nhiệt tản → trường nhiệt chính xác xem ở solver FDM.)
  const peakTemperature = Math.min(
    tMelt + (effectiveHeatJ - eThreshold) / rhoCpV,
    tMelt + 1500,
  );

  return {
    diameter,
    height,
    penetration,
    meltedVolume,
    peakTemperature,
    energyDensity,
    notMelted: false,
  };
}

/** Quy tắc kinh nghiệm đường kính nugget tối thiểu: d_min ≈ 4√t (t,d tính theo mm). */
export function ruleOfThumbNuggetDiameter(thicknessThinner_m: number): number {
  const t_mm = thicknessThinner_m * 1000;
  const d_mm = 4 * Math.sqrt(t_mm);
  return d_mm / 1000; // về mét
}
