import { useStore } from '../state/store';
import type { BufferGeometry } from 'three';

// Cụm hàn 3D: 2 tấm + 2 điện cực + nugget. Trục Y = phương chiều dày; mặt faying tại y=0.
// Đơn vị render = mm (store là mét → ×1000). Nếu có geometry STEP nạp vào thì ưu tiên dùng.

const MM = 1000;

function Plate({
  geom,
  yCenter,
  thicknessMm,
  sizeMm,
  color,
}: {
  geom?: BufferGeometry;
  yCenter: number;
  thicknessMm: number;
  sizeMm: number;
  color: string;
}) {
  if (geom) {
    return (
      <mesh geometry={geom} castShadow receiveShadow>
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
      </mesh>
    );
  }
  return (
    <mesh position={[0, yCenter, 0]} castShadow receiveShadow>
      <boxGeometry args={[sizeMm, thicknessMm, sizeMm]} />
      <meshStandardMaterial color={color} metalness={0.55} roughness={0.45} />
    </mesh>
  );
}

function Electrode({ yBase, dir, faceRmm }: { yBase: number; dir: 1 | -1; faceRmm: number }) {
  const bodyH = 9;
  const tipH = 3;
  const bodyR = faceRmm * 1.8;
  // Thân điện cực (trụ) + đầu côn tiếp xúc
  const yTipCenter = yBase + dir * (tipH / 2);
  const yBodyCenter = yBase + dir * (tipH + bodyH / 2);
  return (
    <group>
      <mesh position={[0, yTipCenter, 0]}>
        <cylinderGeometry args={[faceRmm, bodyR, tipH, 40]} />
        <meshStandardMaterial color="#b87333" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[0, yBodyCenter, 0]}>
        <cylinderGeometry args={[bodyR, bodyR, bodyH, 40]} />
        <meshStandardMaterial color="#b87333" metalness={0.85} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Nugget({ diameterMm, heightMm }: { diameterMm: number; heightMm: number }) {
  if (diameterMm <= 0) return null;
  return (
    <mesh position={[0, 0, 0]} scale={[diameterMm / 2, heightMm / 2, diameterMm / 2]}>
      <sphereGeometry args={[1, 32, 24]} />
      <meshStandardMaterial
        color="#ff6b35"
        emissive="#ff5a1f"
        emissiveIntensity={1.4}
        metalness={0.2}
        roughness={0.5}
      />
    </mesh>
  );
}

export function WeldStack() {
  const { geom, partGeoms, manualResult, recommendation, thermal, thermalFrame } = useStore();

  const t1 = geom.thickness1 * MM;
  const t2 = geom.thickness2 * MM;
  const faceR = (geom.electrodeFaceDiameter * MM) / 2;
  const sizeMm = Math.max(20, geom.electrodeFaceDiameter * MM * 4);

  // Ưu tiên nugget từ frame nhiệt (animation); nếu không có thì lấy từ kết quả lumped.
  let nuggetD = 0;
  let nuggetH = 0;
  const tf = thermal?.frames[thermalFrame];
  if (tf) {
    nuggetD = tf.meltRadius * 2 * MM;
    nuggetH = (tf.meltDepthTop + tf.meltDepthBottom) * MM;
  } else {
    const result = manualResult ?? recommendation?.result ?? null;
    nuggetD = result ? result.nuggetDiameter * MM : 0;
    nuggetH = result ? Math.max(result.penetration * Math.min(t1, t2) * 2, nuggetD / 3) : 0;
  }

  return (
    <group>
      <Plate geom={partGeoms.part1} yCenter={t1 / 2} thicknessMm={t1} sizeMm={sizeMm} color="#7f8c9b" />
      <Plate geom={partGeoms.part2} yCenter={-t2 / 2} thicknessMm={t2} sizeMm={sizeMm} color="#6b7886" />
      {/* Điện cực trên */}
      {partGeoms.electrode_upper ? (
        <mesh geometry={partGeoms.electrode_upper}>
          <meshStandardMaterial color="#b87333" metalness={0.85} roughness={0.3} />
        </mesh>
      ) : (
        <Electrode yBase={t1} dir={1} faceRmm={faceR} />
      )}
      {/* Điện cực dưới */}
      {partGeoms.electrode_lower ? (
        <mesh geometry={partGeoms.electrode_lower}>
          <meshStandardMaterial color="#b87333" metalness={0.85} roughness={0.3} />
        </mesh>
      ) : (
        <Electrode yBase={-t2} dir={-1} faceRmm={faceR} />
      )}
      {partGeoms.fixture && (
        <mesh geometry={partGeoms.fixture}>
          <meshStandardMaterial color="#9aa6b2" metalness={0.7} roughness={0.35} />
        </mesh>
      )}
      <Nugget diameterMm={nuggetD} heightMm={nuggetH} />
    </group>
  );
}
