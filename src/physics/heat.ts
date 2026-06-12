import type { ModelCoeffs } from './types';

// ============================================================================
// Sinh nhiệt Joule và năng lượng hữu ích.
//   Q = I² · R · t            (định luật Joule)
//   Q_eff = η · Q             (η = heatEfficiency: phần đi vào tạo nugget)
// Phần (1−η) là tổn thất: dẫn ra tấm nền, điện cực làm mát nước, bức xạ/đối lưu.
// ============================================================================

/** Tổng nhiệt Joule (J). */
export function jouleHeat(current: number, resistance: number, weldTime: number): number {
  return current * current * resistance * weldTime;
}

/** Nhiệt hữu ích vào vùng nugget (J). */
export function effectiveHeat(totalHeat: number, coeffs: ModelCoeffs): number {
  return coeffs.heatEfficiency * totalHeat;
}

/**
 * Công suất tức thời (W) tại dòng RMS — dùng cho thermal solver.
 * Với AC, I là giá trị RMS nên P = I²·R đã là công suất trung bình.
 */
export function instantaneousPower(current: number, resistance: number): number {
  return current * current * resistance;
}
