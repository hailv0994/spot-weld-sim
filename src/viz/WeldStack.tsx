import { useRef, forwardRef, useImperativeHandle, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useStore, type MeshRole } from '../state/store';
import type { BufferGeometry } from 'three';

// Cụm hàn 3D. Trục Y = phương chiều dày; mặt faying tại y=0. Đơn vị mm.
// Group của mỗi linh kiện luôn bắt đầu tại (0,0,0); WeldAnimation và useEffect
// chịu trách nhiệm đặt vị trí qua Three.js object imperatively (không dùng position prop).

const MM = 1000;

function Plate({ geom, yCenter, thicknessMm, sizeMm, color, selected }: {
  geom?: BufferGeometry; yCenter: number; thicknessMm: number; sizeMm: number; color: string; selected?: boolean;
}) {
  const mat = <meshStandardMaterial color={selected ? '#7fc8f8' : color} metalness={0.55} roughness={0.4} emissive={selected ? '#1a3a5c' : '#000'} emissiveIntensity={selected ? 0.3 : 0} />;
  if (geom) return <mesh geometry={geom} castShadow receiveShadow>{mat}</mesh>;
  return (
    <mesh position={[0, yCenter, 0]} castShadow receiveShadow>
      <boxGeometry args={[sizeMm, thicknessMm, sizeMm]} />
      {mat}
    </mesh>
  );
}

function Electrode({ yBase, dir, faceRmm, selected }: { yBase: number; dir: 1 | -1; faceRmm: number; selected?: boolean }) {
  const bodyH = 9, tipH = 3, bodyR = faceRmm * 1.8;
  const color = selected ? '#e8a060' : '#b87333';
  return (
    <group>
      <mesh position={[0, yBase + dir * (tipH / 2), 0]} castShadow>
        <cylinderGeometry args={[faceRmm, bodyR, tipH, 40]} />
        <meshStandardMaterial color={color} metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[0, yBase + dir * (tipH + bodyH / 2), 0]} castShadow>
        <cylinderGeometry args={[bodyR, bodyR, bodyH, 40]} />
        <meshStandardMaterial color={color} metalness={0.85} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Nugget({ diameterMm, heightMm, tempRatio }: { diameterMm: number; heightMm: number; tempRatio: number }) {
  if (diameterMm <= 0) return null;
  // Màu nhiệt độ: đỏ → cam → vàng → trắng
  const r = Math.min(1, tempRatio * 2);
  const g = Math.min(1, Math.max(0, tempRatio * 2 - 0.3));
  const b = Math.min(1, Math.max(0, tempRatio * 2 - 1.2));
  const color = new THREE.Color(r, g, b);
  return (
    <mesh scale={[diameterMm / 2, heightMm / 2, diameterMm / 2]}>
      <sphereGeometry args={[1, 32, 24]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.0 + tempRatio * 1.5}
        metalness={0.1}
        roughness={0.5}
        transparent
        opacity={0.92}
      />
    </mesh>
  );
}

export interface WeldStackHandles {
  getGroupRef: (role: MeshRole) => THREE.Group | null;
}

export const WeldStack = forwardRef<WeldStackHandles>(function WeldStack(_, ref) {
  const store = useStore();
  const { geom, partGeoms, partTransforms, weldPhase, manualResult, recommendation, thermal, thermalFrame, selectedPart, setSelectedPart } = store;

  // Fixed individual refs (hooks không đặt trong loop)
  const part1Ref = useRef<THREE.Group>(null);
  const part2Ref = useRef<THREE.Group>(null);
  const elecUpperRef = useRef<THREE.Group>(null);
  const elecLowerRef = useRef<THREE.Group>(null);
  const fixtureRef = useRef<THREE.Group>(null);

  const roleToRef = useMemo<Record<MeshRole, React.RefObject<THREE.Group>>>(() => ({
    part1: part1Ref,
    part2: part2Ref,
    electrode_upper: elecUpperRef,
    electrode_lower: elecLowerRef,
    fixture: fixtureRef,
  }), []);

  useImperativeHandle(ref, () => ({
    getGroupRef: (role) => roleToRef[role]?.current ?? null,
  }));

  // Sync partTransforms → Three.js objects khi không đang animate
  useEffect(() => {
    if (weldPhase !== 'idle' && weldPhase !== 'done') return;
    for (const [roleStr, r] of Object.entries(roleToRef)) {
      const role = roleStr as MeshRole;
      const group = r.current;
      if (!group) continue;
      const t = partTransforms[role];
      if (t) {
        group.position.set(...t.position);
        group.rotation.set(...t.rotation);
      } else {
        group.position.set(0, 0, 0);
        group.rotation.set(0, 0, 0);
      }
    }
  }, [partTransforms, weldPhase, roleToRef]);

  const t1 = geom.thickness1 * MM;
  const t2 = geom.thickness2 * MM;
  const faceR = (geom.electrodeFaceDiameter * MM) / 2;
  const sizeMm = Math.max(20, geom.electrodeFaceDiameter * MM * 4);

  let nuggetD = 0, nuggetH = 0, tempRatio = 0;
  const tf = thermal?.frames[thermalFrame];
  if (tf && thermal) {
    nuggetD = tf.meltRadius * 2 * MM;
    nuggetH = (tf.meltDepthTop + tf.meltDepthBottom) * MM;
    tempRatio = thermal.maxTemp > thermal.roomK
      ? (tf.peak - thermal.roomK) / (thermal.maxTemp - thermal.roomK)
      : 0;
  } else {
    const result = manualResult ?? recommendation?.result ?? null;
    nuggetD = result ? result.nuggetDiameter * MM : 0;
    nuggetH = result ? Math.max(result.penetration * Math.min(t1, t2) * 2, nuggetD / 3) : 0;
  }

  const sel = (role: MeshRole) => selectedPart === role;
  const onClick = (role: MeshRole) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setSelectedPart(sel(role) ? null : role);
  };

  return (
    <group onClick={(e) => { if (e.object === e.eventObject) setSelectedPart(null); }}>
      {/* Linh kiện 1 */}
      <group ref={part1Ref} onClick={onClick('part1')}>
        <Plate geom={partGeoms.part1} yCenter={t1 / 2} thicknessMm={t1} sizeMm={sizeMm} color="#7f8c9b" selected={sel('part1')} />
      </group>

      {/* Linh kiện 2 */}
      <group ref={part2Ref} onClick={onClick('part2')}>
        <Plate geom={partGeoms.part2} yCenter={-t2 / 2} thicknessMm={t2} sizeMm={sizeMm} color="#6b7886" selected={sel('part2')} />
      </group>

      {/* Điện cực trên */}
      <group ref={elecUpperRef} onClick={onClick('electrode_upper')}>
        {partGeoms.electrode_upper
          ? <mesh geometry={partGeoms.electrode_upper}><meshStandardMaterial color={sel('electrode_upper') ? '#e8a060' : '#b87333'} metalness={0.85} roughness={0.3} /></mesh>
          : <Electrode yBase={t1} dir={1} faceRmm={faceR} selected={sel('electrode_upper')} />}
      </group>

      {/* Điện cực dưới */}
      <group ref={elecLowerRef} onClick={onClick('electrode_lower')}>
        {partGeoms.electrode_lower
          ? <mesh geometry={partGeoms.electrode_lower}><meshStandardMaterial color={sel('electrode_lower') ? '#e8a060' : '#b87333'} metalness={0.85} roughness={0.3} /></mesh>
          : <Electrode yBase={-t2} dir={-1} faceRmm={faceR} selected={sel('electrode_lower')} />}
      </group>

      {/* Fixture */}
      {partGeoms.fixture && (
        <group ref={fixtureRef} onClick={onClick('fixture')}>
          <mesh geometry={partGeoms.fixture}><meshStandardMaterial color="#9aa6b2" metalness={0.7} roughness={0.35} /></mesh>
        </group>
      )}

      {/* Nugget — luôn tại gốc, không theo group nào */}
      <Nugget diameterMm={nuggetD} heightMm={nuggetH} tempRatio={tempRatio} />
    </group>
  );
});
