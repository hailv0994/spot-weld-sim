import type {
  Material,
  Geometry,
  ProductRequirement,
  ModelCoeffs,
  WeldParameters,
  WeldResult,
} from './types';
import { computeResistance } from './resistance';
import { jouleHeat, effectiveHeat } from './heat';
import { predictNugget, ruleOfThumbNuggetDiameter } from './nugget';
import { predictTensileForce } from './mechanical';

// ============================================================================
// Đánh giá đầy đủ một bộ tham số hàn → WeldResult (forward model).
// ============================================================================

export interface SimInputs {
  mat1: Material;
  mat2: Material;
  /** Vật liệu điện cực (tùy chọn) — ảnh hưởng điện trở khối điện cực */
  electrodeMat?: Material;
  geom: Geometry;
  requirement: ProductRequirement;
  coeffs: ModelCoeffs;
}

/**
 * Đường kính nugget mục tiêu = lớn nhất trong các ràng buộc:
 *  - yêu cầu trực tiếp (nếu nhập > 0),
 *  - quy tắc kinh nghiệm 4√t,
 *  - đường kính tối thiểu để đạt lực kéo phá hủy yêu cầu: d = √(4F/(π·τ)), τ = factor·UTS_min.
 */
export function targetNugget(inputs: SimInputs): number {
  const thinner = Math.min(inputs.geom.thickness1, inputs.geom.thickness2);

  const explicit = inputs.requirement.targetNuggetDiameter;
  const rule = ruleOfThumbNuggetDiameter(thinner);

  // Đường kính suy từ lực kéo yêu cầu
  const utsMin = Math.min(
    inputs.mat1.ultimateTensileStrength,
    inputs.mat2.ultimateTensileStrength,
  );
  const tau = inputs.coeffs.weldShearFactor * utsMin;
  const F = inputs.requirement.requiredTensileForce;
  const dFromTensile = F > 0 && tau > 0 ? Math.sqrt((4 * F) / (Math.PI * tau)) : 0;

  return Math.max(explicit > 0 ? explicit : 0, rule, dFromTensile);
}

export function simulate(inputs: SimInputs, params: WeldParameters): WeldResult {
  const { mat1, mat2, electrodeMat, geom, requirement, coeffs } = inputs;

  const R = computeResistance(mat1, mat2, geom, params.force, coeffs, 293.15, 293.15, electrodeMat);
  const Q = jouleHeat(params.current, R.total, params.weldTime);
  const Qeff = effectiveHeat(Q, coeffs);

  const nugget = predictNugget(mat1, mat2, geom, Qeff, coeffs);
  const tensile = predictTensileForce(nugget.diameter, mat1, mat2, coeffs);

  const dTarget = targetNugget(inputs);
  const expulsion =
    nugget.energyDensity > coeffs.expulsionEnergyDensity || nugget.penetration >= 0.99;

  return {
    params,
    totalResistance: R.total,
    heatGenerated: Q,
    effectiveHeat: Qeff,
    nuggetDiameter: nugget.diameter,
    penetration: nugget.penetration,
    peakTemperature: nugget.peakTemperature,
    predictedTensileForce: tensile,
    energyDensity: nugget.energyDensity,
    flags: {
      expulsion,
      notMelted: nugget.notMelted,
      meetsNugget: nugget.diameter >= dTarget,
      meetsPenetration: nugget.penetration >= requirement.minPenetration,
      meetsTensile: tensile >= requirement.requiredTensileForce,
    },
  };
}
