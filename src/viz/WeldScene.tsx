import { useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, TransformControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { WeldStack, type WeldStackHandles } from './WeldStack';
import { useStore, type MeshRole } from '../state/store';

// ─── Scene (inside Canvas) ────────────────────────────────────────────────────

function Scene({ orbitRef }: { orbitRef: React.RefObject<OrbitControlsImpl> }) {
  const stackRef = useRef<WeldStackHandles>(null);
  const { selectedPart, fixedParts, transformMode, setSelectedPart, setPartTransform } = useStore();

  const selectedGroup = selectedPart ? stackRef.current?.getGroupRef(selectedPart) ?? null : null;
  const isFixed = selectedPart ? fixedParts.includes(selectedPart) : true;

  const handleDragStart = useCallback(() => {
    if (orbitRef.current) orbitRef.current.enabled = false;
  }, [orbitRef]);

  const handleDragEnd = useCallback(() => {
    if (orbitRef.current) orbitRef.current.enabled = true;
    // Sync vị trí sau khi kéo xong
    if (selectedPart && selectedGroup) {
      setPartTransform(selectedPart, {
        position: selectedGroup.position.toArray() as [number, number, number],
        rotation: [selectedGroup.rotation.x, selectedGroup.rotation.y, selectedGroup.rotation.z],
      });
    }
  }, [selectedPart, selectedGroup, setPartTransform]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <hemisphereLight args={['#bcd4ff', '#20303f', 0.6]} />
      <directionalLight position={[20, 30, 15]} intensity={1.6} />
      <directionalLight position={[-15, 10, -10]} intensity={0.6} />
      <pointLight position={[0, 8, 0]} intensity={0.4} />

      <WeldStack ref={stackRef} />

      {selectedGroup && !isFixed && (
        <TransformControls
          object={selectedGroup}
          mode={transformMode}
          size={0.7}
          onMouseDown={handleDragStart}
          onMouseUp={handleDragEnd}
        />
      )}

      <Grid args={[60, 60]} cellSize={2} cellColor="#1e2a36" sectionSize={10}
        sectionColor="#2e4156" position={[0, -0.001, 0]} infiniteGrid fadeDistance={120} />

      <OrbitControls ref={orbitRef} makeDefault target={[0, 0, 0]}
        onClick={() => setSelectedPart(null)} />
    </>
  );
}

// ─── Panel overlay (outside Canvas, absolute positioned) ─────────────────────

const PART_LABELS: [MeshRole, string][] = [
  ['part1', 'Linh kiện 1'],
  ['part2', 'Linh kiện 2'],
  ['electrode_upper', 'Điện cực trên'],
  ['electrode_lower', 'Điện cực dưới'],
  ['fixture', 'Linh kiện gá'],
];

function AssemblyPanel() {
  const { selectedPart, fixedParts, transformMode, setSelectedPart, toggleFixed, setTransformMode } = useStore();

  return (
    <div className="pointer-events-none absolute left-2 top-2 z-10 flex flex-col gap-2">
      {/* Mode selector */}
      <div className="pointer-events-auto flex gap-1 rounded bg-black/70 p-1 text-[11px] backdrop-blur">
        {(['translate', 'rotate'] as const).map((m) => (
          <button key={m} onClick={() => setTransformMode(m)}
            className={`rounded px-2 py-0.5 ${transformMode === m ? 'bg-sky-500/40 text-sky-200' : 'text-white/50 hover:text-white/80'}`}>
            {m === 'translate' ? '⇥ Di chuyển' : '↻ Xoay'}
          </button>
        ))}
      </div>

      {/* Part list */}
      <div className="pointer-events-auto rounded bg-black/70 p-1.5 backdrop-blur space-y-1">
        <div className="text-[10px] text-white/40 mb-1">Click vào linh kiện trong viewport để chọn</div>
        {PART_LABELS.map(([role, label]) => {
          const isFixed = fixedParts.includes(role);
          const isSelected = selectedPart === role;
          return (
            <div key={role} className={`flex items-center justify-between gap-2 rounded px-2 py-1 text-[11px] cursor-pointer transition-colors ${isSelected ? 'bg-sky-500/20 text-sky-200' : 'text-white/70 hover:bg-white/5'}`}
              onClick={() => setSelectedPart(isSelected ? null : role)}>
              <span>{label}</span>
              <button
                className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${isFixed ? 'bg-rose-500/30 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}
                onClick={(e) => { e.stopPropagation(); toggleFixed(role); }}
                title={isFixed ? 'Đang cố định — click để cho di chuyển' : 'Đang di chuyển được — click để cố định'}
              >
                {isFixed ? '🔒 Fix' : '✦ Move'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Exported component ───────────────────────────────────────────────────────

export function WeldScene() {
  const orbitRef = useRef<OrbitControlsImpl>(null);

  return (
    <div className="relative h-full w-full">
      <Canvas frameloop="demand" dpr={[1, 2]}
        camera={{ position: [18, 14, 22], fov: 45, near: 0.1, far: 2000 }}>
        <color attach="background" args={['#0b0f14']} />
        <Scene orbitRef={orbitRef} />
      </Canvas>
      <AssemblyPanel />
    </div>
  );
}
