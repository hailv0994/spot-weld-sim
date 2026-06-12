import type { Material, ModelCoeffs } from './types';

// ============================================================================
// Ước lượng cơ học mối hàn.
//   - Lực kéo phá hủy (tensile-shear): nugget phá theo cắt qua tiết diện.
//       F = A_nugget · τ ,  τ = weldShearFactor · UTS_min
//       A_nugget = (π/4)·d²
//   - Biến dạng nhiệt (cho viz): giãn nở dài δ = α·ΔT·L.
// ============================================================================

/** Lực kéo phá hủy dự đoán (N) từ đường kính nugget. */
export function predictTensileForce(
  nuggetDiameter: number,
  mat1: Material,
  mat2: Material,
  coeffs: ModelCoeffs,
): number {
  if (nuggetDiameter <= 0) return 0;
  const area = (Math.PI / 4) * nuggetDiameter * nuggetDiameter;
  const utsMin = Math.min(mat1.ultimateTensileStrength, mat2.ultimateTensileStrength);
  const tau = coeffs.weldShearFactor * utsMin;
  return area * tau;
}

/** Giãn nở nhiệt dài (m) của một đoạn vật liệu chiều dài L khi tăng ΔT. */
export function thermalExpansion(mat: Material, deltaT: number, length: number): number {
  return mat.thermalExpansion * deltaT * length;
}
