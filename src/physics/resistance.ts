import type { Material, Geometry, ModelCoeffs } from './types';
import { resistivityAt } from './materials';

// ============================================================================
// Mô hình điện trở động của mối hàn điểm.
// R_total = R_bulk(2 tấm) + R_contact(faying, giữa 2 tấm) + R_electrode(2 mặt).
//
// - R_bulk: điện trở khối qua chiều dày, tiết diện ≈ mặt tiếp xúc điện cực.
// - R_contact: điện trở tiếp xúc bề mặt, GIẢM khi lực ép tăng (mô hình Holm rút gọn):
//       R_c = k_c · ρ_e_avg · F^(contactForceExp)   (contactForceExp < 0)
// - R_electrode: tiếp xúc Cu-thép, nhỏ; gộp gần đúng = 0.2·R_contact mỗi mặt.
//
// Đây là mô hình kỹ thuật rút gọn (hybrid) — minh bạch & hiệu chỉnh bằng ModelCoeffs.
// ============================================================================

/** Diện tích mặt tiếp xúc điện cực (m²). */
export function electrodeContactArea(geom: Geometry): number {
  const r = geom.electrodeFaceDiameter / 2;
  return Math.PI * r * r;
}

export interface ResistanceBreakdown {
  bulk: number;
  contactFaying: number;
  contactElectrode: number;
  total: number;
}

/**
 * Tính điện trở động tại nhiệt độ trung bình tempK và lực ép force.
 * @param mat1 vật liệu tấm 1
 * @param mat2 vật liệu tấm 2
 */
export function computeResistance(
  mat1: Material,
  mat2: Material,
  geom: Geometry,
  force: number,
  coeffs: ModelCoeffs,
  tempK = 293.15,
  roomK = 293.15,
): ResistanceBreakdown {
  const area = electrodeContactArea(geom);

  const rho1 = resistivityAt(mat1, tempK, roomK);
  const rho2 = resistivityAt(mat2, tempK, roomK);

  // Điện trở khối qua từng tấm: R = ρ·L/A
  const bulk1 = (rho1 * geom.thickness1) / area;
  const bulk2 = (rho2 * geom.thickness2) / area;
  const bulk = bulk1 + bulk2;

  // Điện trở tiếp xúc faying — dùng ρ trung bình 2 vật liệu.
  const rhoAvg = (rho1 + rho2) / 2;
  const forceSafe = Math.max(force, 1);
  const contactFaying =
    coeffs.contactResistanceFactor * rhoAvg * Math.pow(forceSafe, coeffs.contactForceExp);

  // 2 mặt điện cực — gộp gần đúng nhỏ hơn faying.
  const contactElectrode = 0.4 * contactFaying;

  const total = bulk + contactFaying + contactElectrode;
  return { bulk, contactFaying, contactElectrode, total };
}
