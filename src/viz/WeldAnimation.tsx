import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore, type MeshRole } from '../state/store';
import type { WeldStackHandles } from './WeldStack';

// ─── Hệ thống particle bắn tóe ───────────────────────────────────────────────

const MAX_PARTICLES = 250;
const GRAVITY_MM = 9800; // mm/s²

interface Particle {
  life: number;
  maxLife: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  size: number;
}

const makeParticlePool = (): Particle[] =>
  Array.from({ length: MAX_PARTICLES }, () => ({
    life: 0, maxLife: 1,
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    size: 1,
  }));

function SpatterSystem({
  meltRadiusMm,
  fayingY,
  expulsionLevel,
}: {
  meltRadiusMm: number;
  fayingY: number;
  expulsionLevel: number; // 0-1, điều khiển tần suất bắn tóe
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const pool = useRef<Particle[]>(makeParticlePool());
  const dummy = useRef(new THREE.Object3D());

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Phát particle khi có vùng nóng chảy
    const emitRate = Math.floor(meltRadiusMm * 1.5 * (1 + expulsionLevel * 4));
    for (let e = 0; e < emitRate; e++) {
      const dead = pool.current.find((p) => p.life <= 0);
      if (!dead) break;
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * meltRadiusMm * 0.8;
      const speedH = (4 + Math.random() * 14) * (1 + expulsionLevel * 2);
      const speedV = (3 + Math.random() * 10) * (1 + expulsionLevel * 1.5);
      dead.maxLife = 0.3 + Math.random() * 0.9;
      dead.life = dead.maxLife;
      dead.size = 0.15 + Math.random() * 0.35 + expulsionLevel * 0.4;
      dead.pos.set(Math.cos(angle) * r, fayingY, Math.sin(angle) * r);
      dead.vel.set(Math.cos(angle) * speedH, speedV, Math.sin(angle) * speedH);
    }

    // Cập nhật vị trí
    for (const p of pool.current) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vel.y -= GRAVITY_MM * dt * 0.001;
      p.pos.addScaledVector(p.vel, dt);
    }

    // Upload matrix lên GPU
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = pool.current[i];
      dummy.current.position.copy(p.pos);
      const s = p.life > 0 ? p.size * (0.3 + 0.7 * (p.life / p.maxLife)) : 0;
      dummy.current.scale.setScalar(s);
      dummy.current.updateMatrix();
      mesh.setMatrixAt(i, dummy.current.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshStandardMaterial
        color="#ff5500"
        emissive="#ff3300"
        emissiveIntensity={2.5}
        roughness={0.7}
        metalness={0.2}
      />
    </instancedMesh>
  );
}

// ─── Arc flash + đèn hồ quang ────────────────────────────────────────────────

function ArcFlash({ fayingY, active }: { fayingY: number; active: boolean }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const light2Ref = useRef<THREE.PointLight>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const flicker = 0.5 + Math.random() * 0.5;
    const intensity = active ? flicker * 12 : 0;

    if (lightRef.current) lightRef.current.intensity = intensity;
    if (light2Ref.current) light2Ref.current.intensity = intensity * 0.4;

    if (meshRef.current) {
      (meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = active ? flicker * 5 : 0;
      meshRef.current.visible = active;
    }
  });

  return (
    <>
      {/* Ánh sáng hồ quang chính */}
      <pointLight ref={lightRef} position={[0, fayingY, 0]} color="#b8d8ff" distance={40} decay={2} intensity={0} />
      {/* Ánh sáng phụ tạo màu vàng ấm */}
      <pointLight ref={light2Ref} position={[0, fayingY + 0.5, 0]} color="#ffcc88" distance={20} decay={2} intensity={0} />
      {/* Quả cầu plasma nhỏ */}
      <mesh ref={meshRef} position={[0, fayingY, 0]} visible={false}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#aaddff"
          emissiveIntensity={0}
          transparent
          opacity={0.95}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

// ─── Blob kim loại lỏng phè ra ngoài ─────────────────────────────────────────

function ExpulsionRing({
  radiusMm,
  active,
  fayingY,
}: {
  radiusMm: number;
  active: boolean;
  fayingY: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const scaleRef = useRef(1);

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    if (active) {
      scaleRef.current = Math.min(scaleRef.current + dt * 0.5, 1.5);
    }
    meshRef.current.visible = active && radiusMm > 0;
    meshRef.current.scale.setScalar(scaleRef.current);
  });

  if (!active || radiusMm <= 0) return null;
  return (
    <mesh ref={meshRef} position={[0, fayingY, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radiusMm * 1.1, radiusMm * 0.12, 8, 40]} />
      <meshStandardMaterial
        color="#cc4400"
        emissive="#aa2200"
        emissiveIntensity={1.2}
        metalness={0.3}
        roughness={0.8}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

// ─── Component chính: vòng lặp animation ─────────────────────────────────────

const APPROACH_DURATION = 1.8; // giây từ vị trí trước hàn đến khi tiếp xúc
const ALL_ROLES: MeshRole[] = ['part1', 'part2', 'electrode_upper', 'electrode_lower', 'fixture'];

export function WeldAnimation({ stackRef }: { stackRef: React.RefObject<WeldStackHandles> }) {
  const phaseStartRef = useRef(0);

  useFrame(({ clock }) => {
    const s = useStore.getState();
    if (s.weldPhase === 'idle') return;

    const elapsed = clock.getElapsedTime() - phaseStartRef.current;

    // ── Phase 1: Approach — di chuyển linh kiện từ preWeld → contact ──
    if (s.weldPhase === 'approach') {
      const t = Math.min(1, elapsed / APPROACH_DURATION);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease in-out quad

      for (const role of ALL_ROLES) {
        if (s.fixedParts.includes(role)) continue;
        const group = stackRef.current?.getGroupRef(role);
        if (!group) continue;

        const pre = s.preWeldTransforms[role]?.position ?? [0, 0, 0];
        const contact = s.partTransforms[role]?.position ?? [0, 0, 0];

        // Áp block: nếu role này nằm trong block, tất cả block members di chuyển cùng nhau
        group.position.set(
          pre[0] + (contact[0] - pre[0]) * ease,
          pre[1] + (contact[1] - pre[1]) * ease,
          pre[2] + (contact[2] - pre[2]) * ease,
        );

        // Áp block members: nếu role là block "leader", di chuyển các members cùng delta
        for (const block of s.blocks) {
          if (!block.includes(role)) continue;
          const delta = {
            x: (contact[0] - pre[0]) * ease,
            y: (contact[1] - pre[1]) * ease,
            z: (contact[2] - pre[2]) * ease,
          };
          for (const member of block) {
            if (member === role) continue;
            const mGroup = stackRef.current?.getGroupRef(member);
            if (!mGroup) continue;
            const mPre = s.preWeldTransforms[member]?.position ?? [0, 0, 0];
            mGroup.position.set(mPre[0] + delta.x, mPre[1] + delta.y, mPre[2] + delta.z);
          }
        }
      }

      if (t >= 1) {
        phaseStartRef.current = clock.getElapsedTime();
        s.setWeldPhase('welding');
        // Chạy solver nhiệt nếu chưa có kết quả
        if (!s.thermal) s.runThermal();
      }
    }

    // ── Phase 2: Welding — phát lại thermal frames + setdown dần ──
    if (s.weldPhase === 'welding') {
      if (!s.thermal) return;
      const { frames, totalTime } = s.thermal;
      const t = Math.min(1, elapsed / totalTime);
      const frameIdx = Math.round(t * (frames.length - 1));
      s.setThermalFrame(frameIdx);

      // Setdown dần dần trong nửa đầu thời gian hàn
      const setdownT = Math.min(1, t * 2);
      for (const role of ALL_ROLES) {
        if (s.fixedParts.includes(role)) continue;
        const group = stackRef.current?.getGroupRef(role);
        if (!group) continue;
        const contact = s.partTransforms[role]?.position ?? [0, 0, 0];
        const post = s.postWeldTransforms[role]?.position ?? contact;
        group.position.y = contact[1] + (post[1] - contact[1]) * setdownT;
      }

      if (t >= 1) {
        s.setWeldPhase('done');
        // Đặt hẳn vào postWeld
        for (const role of ALL_ROLES) {
          const group = stackRef.current?.getGroupRef(role);
          if (!group) continue;
          const post = s.postWeldTransforms[role]?.position ?? s.partTransforms[role]?.position ?? [0, 0, 0];
          group.position.set(...post);
        }
      }
    }
  });

  // Dữ liệu reactive để render visual effects
  const { weldPhase, thermal, thermalFrame, geom, weldGapBefore, weldGapAfter } = useStore();
  const tf = thermal?.frames[thermalFrame];
  const meltRMm = tf ? tf.meltRadius * 1000 : 0;
  const fayingY = 0;

  const isWelding = weldPhase === 'welding';
  const isWeldingOrDone = isWelding || weldPhase === 'done';

  // Ước tính mức độ bắn tóe: setdown quá lớn → nhiều tóe
  const setdownRatio = weldGapBefore > 0 && weldGapAfter > 0 && weldGapBefore > weldGapAfter
    ? Math.min(1, (weldGapBefore - weldGapAfter) / (Math.min(geom.thickness1, geom.thickness2) * 1000) * 2)
    : 0.3;

  const hasExpulsion = isWelding && meltRMm > geom.electrodeFaceDiameter * 500 * 0.9; // nugget > 90% diện tích điện cực

  return (
    <>
      <ArcFlash fayingY={fayingY} active={isWelding && meltRMm > 0} />
      {isWeldingOrDone && meltRMm > 0 && (
        <SpatterSystem
          meltRadiusMm={isWelding ? meltRMm : 0}
          fayingY={fayingY}
          expulsionLevel={setdownRatio}
        />
      )}
      {hasExpulsion && (
        <ExpulsionRing radiusMm={meltRMm} active={hasExpulsion} fayingY={fayingY} />
      )}
    </>
  );
}
