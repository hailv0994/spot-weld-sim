import { useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { useStore, type MeshRole } from '../state/store';
import type { BufferGeometry } from 'three';

// Cụm hàn 3D: 2 tấm + 2 điện cực + nugget.
// Trục Y = phương chiều dày; mặt faying tại y=0. Đơn vị render = mm.

const MM = 1000;

function Plate({ geom, yCenter, thicknessMm, sizeMm, color }: {
  geom?: BufferGeometry; yCenter: number; thicknessMm: number; sizeMm: number; color: string;
}) {
  if (geom) return <mesh geometry={geom} castShadow receiveShadow><meshStandardMaterial color={color} metalness={0.6} roughness={0.4} /></mesh>;
  return (
    <mesh position={[0, yCenter, 0]} castShadow receiveShadow>
      <boxGeometry args={[sizeMm, thicknessMm, sizeMm]} />
      <meshStandardMaterial color={color} metalness={0.55} roughness={0.45} />
    </mesh>
  );
}

function Electrode({ yBase, dir, faceRmm }: { yBase: number; dir: 1 | -1; faceRmm: number }) {
  const bodyH = 9, tipH = 3, bodyR = faceRmm * 1.8;
  return (
    <group>
      <mesh position={[0, yBase + dir * (tipH / 2), 0]}>
        <cylinderGeometry args={[faceRmm, bodyR, tipH, 40]} />
        <meshStandardMaterial color="#b87333" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[0, yBase + dir * (tipH + bodyH / 2), 0]}>
        <cylinderGeometry args={[bodyR, bodyR, bodyH, 40]} />
        <meshStandardMaterial color="#b87333" metalness={0.85} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Nugget({ diameterMm, heightMm }: { diameterMm: number; heightMm: number }) {
  if (diameterMm <= 0) return null;
  return (
    <mesh scale={[diameterMm / 2, heightMm / 2, diameterMm / 2]}>
      <sphereGeometry args={[1, 32, 24]} />
      <meshStandardMaterial color="#ff6b35" emissive="#ff5a1f" emissiveIntensity={1.4} metalness={0.2} roughness={0.5} />
    </mesh>
  );
}

/** Slot riêng cho mỗi linh kiện — có ref để TransformControls bám vào. */
const PartSlot = forwardRef<THREE.Group, {
  role: MeshRole;
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}>(({ role, children, selected, onClick }, ref) => {
  const { partTransforms } = useStore();
  const t = partTransforms[role] ?? { position: [0, 0, 0] as [number,number,number], rotation: [0, 0, 0] as [number,number,number] };
  return (
    <group
      ref={ref}
      position={t.position}
      rotation={t.rotation}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      {selected && (
        <mesh>
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0} />
        </mesh>
      )}
      {children}
    </group>
  );
});
PartSlot.displayName = 'PartSlot';

export interface WeldStackHandles {
  getGroupRef: (role: MeshRole) => THREE.Group | null;
}

export const WeldStack = forwardRef<WeldStackHandles>((_props, ref) => {
  const { geom, partGeoms, manualResult, recommendation, thermal, thermalFrame, selectedPart, setSelectedPart } = useStore();

  const refs: Partial<Record<MeshRole, React.RefObject<THREE.Group>>> = {
    part1: useRef<THREE.Group>(null),
    part2: useRef<THREE.Group>(null),
    electrode_upper: useRef<THREE.Group>(null),
    electrode_lower: useRef<THREE.Group>(null),
    fixture: useRef<THREE.Group>(null),
  };

  useImperativeHandle(ref, () => ({
    getGroupRef: (role) => refs[role]?.current ?? null,
  }));

  const t1 = geom.thickness1 * MM;
  const t2 = geom.thickness2 * MM;
  const faceR = (geom.electrodeFaceDiameter * MM) / 2;
  const sizeMm = Math.max(20, geom.electrodeFaceDiameter * MM * 4);

  let nuggetD = 0, nuggetH = 0;
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
    <group onClick={(e) => { if (e.object === e.eventObject) setSelectedPart(null); }}>
      {/* Linh kiện 1 */}
      <PartSlot role="part1" ref={refs.part1} selected={selectedPart === 'part1'} onClick={() => setSelectedPart('part1')}>
        <Plate geom={partGeoms.part1} yCenter={t1 / 2} thicknessMm={t1} sizeMm={sizeMm} color="#7f8c9b" />
      </PartSlot>

      {/* Linh kiện 2 */}
      <PartSlot role="part2" ref={refs.part2} selected={selectedPart === 'part2'} onClick={() => setSelectedPart('part2')}>
        <Plate geom={partGeoms.part2} yCenter={-t2 / 2} thicknessMm={t2} sizeMm={sizeMm} color="#6b7886" />
      </PartSlot>

      {/* Điện cực trên */}
      <PartSlot role="electrode_upper" ref={refs.electrode_upper} selected={selectedPart === 'electrode_upper'} onClick={() => setSelectedPart('electrode_upper')}>
        {partGeoms.electrode_upper
          ? <mesh geometry={partGeoms.electrode_upper}><meshStandardMaterial color="#b87333" metalness={0.85} roughness={0.3} /></mesh>
          : <Electrode yBase={t1} dir={1} faceRmm={faceR} />}
      </PartSlot>

      {/* Điện cực dưới */}
      <PartSlot role="electrode_lower" ref={refs.electrode_lower} selected={selectedPart === 'electrode_lower'} onClick={() => setSelectedPart('electrode_lower')}>
        {partGeoms.electrode_lower
          ? <mesh geometry={partGeoms.electrode_lower}><meshStandardMaterial color="#b87333" metalness={0.85} roughness={0.3} /></mesh>
          : <Electrode yBase={-t2} dir={-1} faceRmm={faceR} />}
      </PartSlot>

      {/* Fixture */}
      {partGeoms.fixture && (
        <PartSlot role="fixture" ref={refs.fixture} selected={selectedPart === 'fixture'} onClick={() => setSelectedPart('fixture')}>
          <mesh geometry={partGeoms.fixture}><meshStandardMaterial color="#9aa6b2" metalness={0.7} roughness={0.35} /></mesh>
        </PartSlot>
      )}

      <Nugget diameterMm={nuggetD} heightMm={nuggetH} />
    </group>
  );
});
WeldStack.displayName = 'WeldStack';
