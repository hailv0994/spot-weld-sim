import { useRef, useCallback, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { WeldStack, type WeldStackHandles } from './WeldStack';
import { WeldAnimation } from './WeldAnimation';
import { useStore, type MeshRole } from '../state/store';

// ─── Panel HTML (trong Canvas qua <Html fullscreen>) ──────────────────────────

const PART_LABELS: [MeshRole, string][] = [
  ['part1', 'Linh kiện 1'],
  ['part2', 'Linh kiện 2'],
  ['electrode_upper', 'Điện cực trên'],
  ['electrode_lower', 'Điện cực dưới'],
  ['fixture', 'Gá đỡ'],
];

interface PanelProps {
  onMate: (moving: MeshRole, anchor: MeshRole) => void;
}

function AssemblyPanel({ onMate }: PanelProps) {
  const {
    selectedPart, fixedParts, transformMode, weldPhase,
    preWeldTransforms, postWeldTransforms, blocks,
    setSelectedPart, toggleFixed, setTransformMode,
    savePreWeld, savePostWeld,
    addBlock, clearBlocks,
    startWeldAnim, resetWeldAnim,
    thermal, thermalFrame,
  } = useStore();

  const [mateMoving, setMateMoving] = useState<MeshRole>('electrode_upper');
  const [mateAnchor, setMateAnchor] = useState<MeshRole>('part1');
  const [blockA, setBlockA] = useState<MeshRole>('electrode_upper');
  const [blockB, setBlockB] = useState<MeshRole>('part1');

  const isAnimating = weldPhase !== 'idle' && weldPhase !== 'done';
  const hasPreWeld = Object.keys(preWeldTransforms).length > 0;
  const hasPostWeld = Object.keys(postWeldTransforms).length > 0;

  const tf = thermal?.frames[thermalFrame];
  const meltD = tf ? (tf.meltRadius * 2 * 1000).toFixed(2) : '—';
  const peakT = tf ? Math.round(tf.peak - 273.15) : null;

  const phaseLabel: Record<string, string> = {
    idle: '⏸ Chờ',
    approach: '⬇ Tiếp cận',
    welding: '⚡ Đang hàn',
    done: '✓ Hoàn thành',
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex">

      {/* ── Panel trái: setup lắp ghép ── */}
      <div className="pointer-events-auto m-2 flex w-48 flex-col gap-2 self-start rounded-xl bg-white/90 p-2 shadow-xl ring-1 ring-black/10 backdrop-blur text-[11px]">

        {/* Transform mode */}
        <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
          {(['translate', 'rotate'] as const).map((m) => (
            <button key={m} onClick={() => setTransformMode(m)} disabled={isAnimating}
              className={`flex-1 rounded py-0.5 font-medium transition-colors ${transformMode === m ? 'bg-white shadow text-sky-700' : 'text-slate-400 hover:text-slate-600'} disabled:opacity-40`}>
              {m === 'translate' ? '⇥ Move' : '↻ Rotate'}
            </button>
          ))}
        </div>

        {/* Danh sách linh kiện */}
        <div className="space-y-0.5">
          <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Linh kiện</div>
          {PART_LABELS.map(([role, label]) => {
            const isFixed = fixedParts.includes(role);
            const isSelected = selectedPart === role;
            const inBlock = blocks.some((bl) => bl.includes(role));
            return (
              <div key={role}
                className={`flex items-center gap-1 rounded-lg px-1.5 py-1 cursor-pointer transition-colors ${isSelected ? 'bg-sky-50 ring-1 ring-sky-200' : 'hover:bg-slate-50'}`}
                onClick={() => setSelectedPart(isSelected ? null : role)}>
                <span className="flex-1 text-slate-700 truncate">{label}</span>
                {inBlock && <span className="text-[9px] text-purple-400" title="Trong block">⬡</span>}
                <button
                  className={`rounded px-1 py-0.5 text-[9px] font-bold transition-colors ${isFixed ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'}`}
                  onClick={(e) => { e.stopPropagation(); toggleFixed(role); }}
                  disabled={isAnimating}
                >
                  {isFixed ? 'Fix' : 'Move'}
                </button>
              </div>
            );
          })}
        </div>

        <hr className="border-slate-200" />

        {/* Mate */}
        <div className="space-y-1">
          <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Mate (áp sát)</div>
          <select value={mateMoving} onChange={(e) => setMateMoving(e.target.value as MeshRole)}
            className="w-full rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">
            {PART_LABELS.map(([r, l]) => <option key={r} value={r}>{l}</option>)}
          </select>
          <div className="text-center text-[9px] text-slate-400">→ tiếp xúc →</div>
          <select value={mateAnchor} onChange={(e) => setMateAnchor(e.target.value as MeshRole)}
            className="w-full rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">
            {PART_LABELS.map(([r, l]) => <option key={r} value={r}>{l}</option>)}
          </select>
          <button onClick={() => onMate(mateMoving, mateAnchor)} disabled={isAnimating || mateMoving === mateAnchor}
            className="w-full rounded-lg bg-sky-500 py-1 text-[10px] font-bold text-white transition hover:bg-sky-600 disabled:opacity-40">
            🔗 Mate!
          </button>
        </div>

        <hr className="border-slate-200" />

        {/* Block */}
        <div className="space-y-1">
          <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Block (di chuyển cùng)</div>
          <div className="flex gap-1">
            <select value={blockA} onChange={(e) => setBlockA(e.target.value as MeshRole)}
              className="flex-1 rounded bg-slate-100 px-1 py-0.5 text-[9px] text-slate-700">
              {PART_LABELS.map(([r, l]) => <option key={r} value={r}>{l}</option>)}
            </select>
            <select value={blockB} onChange={(e) => setBlockB(e.target.value as MeshRole)}
              className="flex-1 rounded bg-slate-100 px-1 py-0.5 text-[9px] text-slate-700">
              {PART_LABELS.map(([r, l]) => <option key={r} value={r}>{l}</option>)}
            </select>
          </div>
          <div className="flex gap-1">
            <button onClick={() => addBlock(blockA, blockB)} disabled={isAnimating || blockA === blockB}
              className="flex-1 rounded-lg bg-purple-500 py-1 text-[9px] font-bold text-white transition hover:bg-purple-600 disabled:opacity-40">
              ⬡ Block
            </button>
            <button onClick={clearBlocks} disabled={isAnimating}
              className="rounded-lg bg-slate-200 px-2 py-1 text-[9px] text-slate-600 hover:bg-slate-300 disabled:opacity-40">
              ✕
            </button>
          </div>
          {blocks.length > 0 && (
            <div className="text-[9px] text-slate-400">
              {blocks.map((bl, i) => <div key={i}>• {bl.join(' + ')}</div>)}
            </div>
          )}
        </div>

        <hr className="border-slate-200" />

        {/* Set vị trí */}
        <div className="space-y-1">
          <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Vị trí hàn</div>
          <button onClick={savePreWeld} disabled={isAnimating}
            className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-medium transition disabled:opacity-40 ${hasPreWeld ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            <span>📌</span>
            <span className="flex-1 text-left">Vị trí TRƯỚC hàn</span>
            {hasPreWeld && <span className="text-[9px] text-blue-400">✓</span>}
          </button>
          <button onClick={savePostWeld} disabled={isAnimating}
            className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-medium transition disabled:opacity-40 ${hasPostWeld ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            <span>🎯</span>
            <span className="flex-1 text-left">Vị trí SAU hàn</span>
            {hasPostWeld && <span className="text-[9px] text-orange-400">✓</span>}
          </button>
        </div>

        <hr className="border-slate-200" />

        {/* Simulate */}
        <div className="space-y-1">
          <button
            onClick={startWeldAnim}
            disabled={isAnimating || !hasPreWeld}
            className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 py-1.5 text-[11px] font-bold text-white shadow transition hover:from-orange-600 hover:to-rose-600 disabled:opacity-40">
            {isAnimating ? phaseLabel[weldPhase] : '▶ Mô phỏng'}
          </button>
          <button onClick={resetWeldAnim} disabled={weldPhase === 'idle'}
            className="w-full rounded-lg bg-slate-200 py-1 text-[10px] text-slate-600 transition hover:bg-slate-300 disabled:opacity-40">
            ⏹ Reset
          </button>
        </div>
      </div>

      {/* ── Status bar dưới: nhiệt + nugget ── */}
      {weldPhase !== 'idle' && (
        <div className="pointer-events-auto absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-4 rounded-full bg-black/70 px-4 py-1.5 text-[11px] text-white backdrop-blur">
          <span className="text-white/50">Phase:</span>
          <span className="font-semibold text-sky-300">{phaseLabel[weldPhase]}</span>
          {tf && (
            <>
              <span className="text-white/30">|</span>
              <span className="text-white/50">Nugget ⌀</span>
              <span className="font-semibold text-orange-300">{meltD} mm</span>
              <span className="text-white/30">|</span>
              <span className="text-white/50">T<sub>max</sub></span>
              <span className={`font-semibold ${(peakT ?? 0) > 1400 ? 'text-red-300' : 'text-yellow-300'}`}>
                {peakT !== null ? `${peakT} °C` : '—'}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Scene bên trong Canvas ───────────────────────────────────────────────────

function Scene({
  orbitRef,
  stackRef,
}: {
  orbitRef: React.RefObject<OrbitControlsImpl>;
  stackRef: React.RefObject<WeldStackHandles>;
}) {
  const { selectedPart, fixedParts, transformMode, weldPhase, setPartTransform } = useStore();

  const isAnimating = weldPhase !== 'idle' && weldPhase !== 'done';
  const selectedGroup = selectedPart ? stackRef.current?.getGroupRef(selectedPart) ?? null : null;
  const isFixed = selectedPart ? fixedParts.includes(selectedPart) : true;

  const handleDragStart = useCallback(() => {
    if (orbitRef.current) orbitRef.current.enabled = false;
  }, [orbitRef]);

  const handleDragEnd = useCallback(() => {
    if (orbitRef.current) orbitRef.current.enabled = true;
    if (selectedPart && selectedGroup) {
      setPartTransform(selectedPart, {
        position: selectedGroup.position.toArray() as [number, number, number],
        rotation: [selectedGroup.rotation.x, selectedGroup.rotation.y, selectedGroup.rotation.z],
      });
    }
  }, [selectedPart, selectedGroup, setPartTransform]);

  return (
    <>
      {/* Ánh sáng nền sáng */}
      <ambientLight intensity={1.2} />
      <hemisphereLight args={['#e8f0ff', '#c0d0e0', 0.8]} />
      <directionalLight position={[25, 40, 20]} intensity={2.0} castShadow
        shadow-mapSize={[1024, 1024]} shadow-camera-far={200} />
      <directionalLight position={[-20, 15, -15]} intensity={0.8} />
      <pointLight position={[0, 30, 0]} intensity={0.5} color="#fff5e0" />

      <WeldStack ref={stackRef} />
      <WeldAnimation stackRef={stackRef} />

      {/* TransformControls chỉ hoạt động khi không animate */}
      {selectedGroup && !isFixed && !isAnimating && (
        <TransformControls
          object={selectedGroup}
          mode={transformMode}
          size={0.6}
          onMouseDown={handleDragStart}
          onMouseUp={handleDragEnd}
        />
      )}

      {/* Grid sáng */}
      <Grid
        args={[80, 80]}
        cellSize={2}
        cellColor="#b0bec8"
        sectionSize={10}
        sectionColor="#8fa0b0"
        position={[0, -0.01, 0]}
        infiniteGrid
        fadeDistance={150}
      />

      <OrbitControls ref={orbitRef} makeDefault target={[0, 0, 0]}
        maxDistance={500} minDistance={2} />
    </>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function WeldScene() {
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const stackRef = useRef<WeldStackHandles>(null);
  const setPartTransform = useStore((s) => s.setPartTransform);

  // ── Mate: snap mặt tiếp xúc theo Y, dùng bounding box Three.js ──
  const handleMate = useCallback((movingRole: MeshRole, anchorRole: MeshRole) => {
    const movingGroup = stackRef.current?.getGroupRef(movingRole);
    const anchorGroup = stackRef.current?.getGroupRef(anchorRole);
    if (!movingGroup || !anchorGroup) return;

    const movingBox = new THREE.Box3().setFromObject(movingGroup);
    const anchorBox = new THREE.Box3().setFromObject(anchorGroup);

    const movingCenter = movingGroup.position.y;
    const anchorCenter = anchorGroup.position.y;
    let newY: number;
    if (movingCenter >= anchorCenter) {
      newY = movingGroup.position.y + (anchorBox.max.y - movingBox.min.y);
    } else {
      newY = movingGroup.position.y + (anchorBox.min.y - movingBox.max.y);
    }
    movingGroup.position.y = newY;
    setPartTransform(movingRole, {
      position: [movingGroup.position.x, newY, movingGroup.position.z],
      rotation: [movingGroup.rotation.x, movingGroup.rotation.y, movingGroup.rotation.z],
    });
  }, [setPartTransform]);

  return (
    <div className="relative h-full w-full">
      <Canvas
        frameloop="always"
        dpr={[1, 2]}
        camera={{ position: [22, 16, 28], fov: 42, near: 0.1, far: 2000 }}
        shadows
      >
        {/* Nền sáng xanh xám nhạt */}
        <color attach="background" args={['#d6e4ee']} />
        <fog attach="fog" args={['#d6e4ee', 120, 400]} />
        <Scene orbitRef={orbitRef} stackRef={stackRef} />
      </Canvas>

      {/* Panel điều khiển — DOM thường ngoài Canvas (luôn render) */}
      <AssemblyPanel onMate={handleMate} />
    </div>
  );
}
