import { useRef, useCallback, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { WeldStack, type WeldStackHandles } from './WeldStack';
import { WeldAnimation } from './WeldAnimation';
import { useStore, type MeshRole } from '../state/store';

// ─── Panel điều khiển Assembly (DOM thường, ngoài Canvas) ────────────────────

const PART_LABELS: [MeshRole, string][] = [
  ['part1', 'Linh kiện 1'],
  ['part2', 'Linh kiện 2'],
  ['electrode_upper', 'Điện cực trên'],
  ['electrode_lower', 'Điện cực dưới'],
  ['fixture', 'Gá đỡ'],
];

const FACE_LABELS: ['top' | 'bottom', string][] = [
  ['top', 'Mặt trên'],
  ['bottom', 'Mặt dưới'],
];

interface PanelProps {
  onMate: (moving: MeshRole, movingFace: 'top' | 'bottom', anchor: MeshRole, anchorFace: 'top' | 'bottom', offsetMm: number) => void;
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
  const [mateMovingFace, setMateMovingFace] = useState<'top' | 'bottom'>('bottom');
  const [mateAnchor, setMateAnchor] = useState<MeshRole>('part1');
  const [mateAnchorFace, setMateAnchorFace] = useState<'top' | 'bottom'>('top');
  const [mateOffset, setMateOffset] = useState(0);

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
    approach: '⬇ Tiếp cận...',
    welding: '⚡ Đang hàn...',
    done: '✓ Hoàn thành',
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-10">

      {/* ── Panel trái ── */}
      <div className="pointer-events-auto absolute left-2 top-2 flex w-52 flex-col gap-2 rounded-xl bg-white/95 p-2.5 shadow-xl ring-1 ring-black/8 text-[11px] max-h-[calc(100%-16px)] overflow-y-auto">

        {/* Mode */}
        <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
          {(['translate', 'rotate'] as const).map((m) => (
            <button key={m} onClick={() => setTransformMode(m)} disabled={isAnimating}
              className={`flex-1 rounded py-1 font-semibold transition-all ${transformMode === m ? 'bg-white shadow-sm text-sky-700' : 'text-slate-400 hover:text-slate-600'} disabled:opacity-40`}>
              {m === 'translate' ? '⇥ Di chuyển' : '↻ Xoay'}
            </button>
          ))}
        </div>

        {/* Danh sách linh kiện */}
        <div>
          <div className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Linh kiện</div>
          <div className="space-y-0.5">
            {PART_LABELS.map(([role, label]) => {
              const isFixed = fixedParts.includes(role);
              const isSelected = selectedPart === role;
              const inBlock = blocks.some((bl) => bl.includes(role));
              return (
                <div key={role}
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 cursor-pointer transition-colors ${isSelected ? 'bg-sky-50 ring-1 ring-sky-200' : 'hover:bg-slate-50'}`}
                  onClick={() => setSelectedPart(isSelected ? null : role)}>
                  <span className={`flex-1 truncate font-medium ${isSelected ? 'text-sky-700' : 'text-slate-700'}`}>{label}</span>
                  {inBlock && <span className="text-[9px] text-purple-500 font-bold" title="Đang block">⬡</span>}
                  <button
                    className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold transition-colors ${isFixed ? 'bg-rose-100 text-rose-600 hover:bg-rose-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                    onClick={(e) => { e.stopPropagation(); toggleFixed(role); }}
                    disabled={isAnimating}
                  >
                    {isFixed ? '🔒 Fix' : '✦ Move'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* Mate theo mặt (SolidWorks style) */}
        <div>
          <div className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Mate (áp mặt)</div>
          <div className="space-y-1">
            {/* Moving part + face */}
            <div className="flex gap-1">
              <select value={mateMoving} onChange={(e) => setMateMoving(e.target.value as MeshRole)}
                className="flex-1 min-w-0 rounded bg-slate-100 px-1.5 py-1 text-[10px] text-slate-700">
                {PART_LABELS.map(([r, l]) => <option key={r} value={r}>{l}</option>)}
              </select>
              <select value={mateMovingFace} onChange={(e) => setMateMovingFace(e.target.value as 'top' | 'bottom')}
                className="w-[68px] rounded bg-blue-50 px-1 py-1 text-[9px] text-blue-700 font-semibold">
                {FACE_LABELS.map(([f, l]) => <option key={f} value={f}>{l}</option>)}
              </select>
            </div>

            {/* Offset */}
            <div className="flex items-center gap-1.5 px-1">
              <span className="text-[9px] text-slate-400 flex-1">Khoảng cách</span>
              <input type="number" value={mateOffset} step={0.1}
                onChange={(e) => setMateOffset(parseFloat(e.target.value) || 0)}
                className="w-16 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-center text-slate-700" />
              <span className="text-[9px] text-slate-400">mm</span>
            </div>

            {/* Anchor part + face */}
            <div className="flex items-center gap-1 px-1 text-[9px] text-slate-400">
              <span>→ tiếp xúc với →</span>
            </div>
            <div className="flex gap-1">
              <select value={mateAnchor} onChange={(e) => setMateAnchor(e.target.value as MeshRole)}
                className="flex-1 min-w-0 rounded bg-slate-100 px-1.5 py-1 text-[10px] text-slate-700">
                {PART_LABELS.map(([r, l]) => <option key={r} value={r}>{l}</option>)}
              </select>
              <select value={mateAnchorFace} onChange={(e) => setMateAnchorFace(e.target.value as 'top' | 'bottom')}
                className="w-[68px] rounded bg-orange-50 px-1 py-1 text-[9px] text-orange-700 font-semibold">
                {FACE_LABELS.map(([f, l]) => <option key={f} value={f}>{l}</option>)}
              </select>
            </div>

            <button
              onClick={() => onMate(mateMoving, mateMovingFace, mateAnchor, mateAnchorFace, mateOffset)}
              disabled={isAnimating || mateMoving === mateAnchor}
              className="w-full rounded-lg bg-sky-500 py-1.5 text-[10px] font-bold text-white transition hover:bg-sky-600 disabled:opacity-40">
              🔗 Mate!
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* Block */}
        <div>
          <div className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Block (di chuyển cùng)</div>
          <div className="space-y-1">
            <div className="flex gap-1">
              <select value={blockA} onChange={(e) => setBlockA(e.target.value as MeshRole)}
                className="flex-1 min-w-0 rounded bg-slate-100 px-1 py-1 text-[9px] text-slate-700">
                {PART_LABELS.map(([r, l]) => <option key={r} value={r}>{l}</option>)}
              </select>
              <span className="self-center text-[9px] text-slate-400">+</span>
              <select value={blockB} onChange={(e) => setBlockB(e.target.value as MeshRole)}
                className="flex-1 min-w-0 rounded bg-slate-100 px-1 py-1 text-[9px] text-slate-700">
                {PART_LABELS.map(([r, l]) => <option key={r} value={r}>{l}</option>)}
              </select>
            </div>
            <div className="flex gap-1">
              <button onClick={() => addBlock(blockA, blockB)} disabled={isAnimating || blockA === blockB}
                className="flex-1 rounded-lg bg-purple-500 py-1.5 text-[9px] font-bold text-white transition hover:bg-purple-600 disabled:opacity-40">
                ⬡ Tạo Block
              </button>
              <button onClick={clearBlocks} disabled={isAnimating || blocks.length === 0}
                className="rounded-lg bg-slate-200 px-2 py-1.5 text-[9px] text-slate-600 hover:bg-slate-300 disabled:opacity-40">
                ✕ Xoá
              </button>
            </div>
            {blocks.length > 0 && (
              <div className="rounded-lg bg-purple-50 px-2 py-1.5 text-[9px] text-purple-700 space-y-0.5">
                {blocks.map((bl, i) => (
                  <div key={i} className="font-medium">⬡ {bl.map(r => PART_LABELS.find(([k]) => k === r)?.[1] ?? r).join(' + ')}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* Set vị trí */}
        <div>
          <div className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Vị trí hàn</div>
          <div className="space-y-1.5">
            <button onClick={savePreWeld} disabled={isAnimating}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] font-semibold transition disabled:opacity-40 ${hasPreWeld ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <span>📌</span>
              <span className="flex-1 text-left">Lưu vị trí TRƯỚC hàn</span>
              {hasPreWeld && <span className="text-[9px] bg-blue-200 text-blue-700 rounded px-1">✓ đã lưu</span>}
            </button>
            <button onClick={savePostWeld} disabled={isAnimating}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] font-semibold transition disabled:opacity-40 ${hasPostWeld ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <span>🎯</span>
              <span className="flex-1 text-left">Lưu vị trí SAU hàn</span>
              {hasPostWeld && <span className="text-[9px] bg-orange-200 text-orange-700 rounded px-1">✓ đã lưu</span>}
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* Simulate */}
        <div className="space-y-1.5">
          <button onClick={startWeldAnim} disabled={isAnimating}
            className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 py-2.5 text-[12px] font-bold text-white shadow-md transition hover:from-orange-600 hover:to-rose-600 active:scale-[0.98] disabled:opacity-50">
            {isAnimating ? phaseLabel[weldPhase] ?? '...' : '▶  Bắt đầu mô phỏng'}
          </button>
          <button onClick={resetWeldAnim} disabled={weldPhase === 'idle'}
            className="w-full rounded-xl bg-slate-200 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-300 disabled:opacity-40">
            ⏹ Reset
          </button>
        </div>
      </div>

      {/* ── Status bar dưới ── */}
      {weldPhase !== 'idle' && (
        <div className="pointer-events-auto absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full bg-black/75 px-5 py-2 text-[11px] text-white shadow-lg backdrop-blur">
          <span className="text-white/50">Phase:</span>
          <span className="font-bold text-sky-300">{phaseLabel[weldPhase]}</span>
          {tf && (
            <>
              <span className="text-white/25">│</span>
              <span className="text-white/50">Nugget ⌀</span>
              <span className="font-bold text-orange-300">{meltD} mm</span>
              <span className="text-white/25">│</span>
              <span className="text-white/50">T<sub>max</sub></span>
              <span className={`font-bold ${(peakT ?? 0) > 1400 ? 'text-red-300' : 'text-yellow-200'}`}>
                {peakT !== null ? `${peakT} °C` : '—'}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Scene (bên trong Canvas) ─────────────────────────────────────────────────

function Scene({
  orbitRef,
  stackRef,
}: {
  orbitRef: React.RefObject<OrbitControlsImpl>;
  stackRef: React.RefObject<WeldStackHandles>;
}) {
  const { selectedPart, fixedParts, transformMode, weldPhase, setPartTransform } = useStore();

  const isAnimating = weldPhase !== 'idle' && weldPhase !== 'done';

  // Tính selectedGroup fresh mỗi render (tránh stale ref)
  const getSelectedGroup = useCallback(() =>
    selectedPart ? stackRef.current?.getGroupRef(selectedPart) ?? null : null,
    [selectedPart, stackRef]
  );

  const isFixed = selectedPart ? fixedParts.includes(selectedPart) : true;

  // Lưu vị trí ban đầu của TẤT CẢ parts khi bắt đầu drag
  const dragStartPositions = useRef<Partial<Record<MeshRole, THREE.Vector3>>>({});

  const handleDragStart = useCallback(() => {
    if (orbitRef.current) orbitRef.current.enabled = false;
    const allRoles: MeshRole[] = ['part1', 'part2', 'electrode_upper', 'electrode_lower', 'fixture'];
    for (const role of allRoles) {
      const g = stackRef.current?.getGroupRef(role);
      if (g) dragStartPositions.current[role] = g.position.clone();
    }
  }, [orbitRef, stackRef]);

  // Gọi mỗi frame khi đang kéo — propagate delta sang block members
  const handleChange = useCallback(() => {
    if (!selectedPart) return;
    const movingGroup = stackRef.current?.getGroupRef(selectedPart);
    if (!movingGroup) return;
    const startPos = dragStartPositions.current[selectedPart];
    if (!startPos) return;

    const delta = new THREE.Vector3().subVectors(movingGroup.position, startPos);
    const s = useStore.getState();

    for (const block of s.blocks) {
      if (!block.includes(selectedPart)) continue;
      for (const role of block) {
        if (role === selectedPart) continue;
        const memberGroup = stackRef.current?.getGroupRef(role);
        const memberStart = dragStartPositions.current[role];
        if (memberGroup && memberStart) {
          memberGroup.position.copy(memberStart).add(delta);
        }
      }
    }
  }, [selectedPart, stackRef]);

  const handleDragEnd = useCallback(() => {
    if (orbitRef.current) orbitRef.current.enabled = true;
    if (!selectedPart) return;
    const s = useStore.getState();

    // Sync selected part
    const g = stackRef.current?.getGroupRef(selectedPart);
    if (g) {
      setPartTransform(selectedPart, {
        position: g.position.toArray() as [number, number, number],
        rotation: [g.rotation.x, g.rotation.y, g.rotation.z],
      });
    }

    // Sync block members
    for (const block of s.blocks) {
      if (!block.includes(selectedPart)) continue;
      for (const role of block) {
        if (role === selectedPart) continue;
        const mg = stackRef.current?.getGroupRef(role);
        if (mg) {
          setPartTransform(role, {
            position: mg.position.toArray() as [number, number, number],
            rotation: [mg.rotation.x, mg.rotation.y, mg.rotation.z],
          });
        }
      }
    }
  }, [orbitRef, selectedPart, stackRef, setPartTransform]);

  const selectedGroup = getSelectedGroup();

  return (
    <>
      <ambientLight intensity={1.2} />
      <hemisphereLight args={['#e8f0ff', '#c0d0e0', 0.8]} />
      <directionalLight position={[25, 40, 20]} intensity={2.0} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-far={200} />
      <directionalLight position={[-20, 15, -15]} intensity={0.8} />
      <pointLight position={[0, 30, 0]} intensity={0.5} color="#fff5e0" />

      <WeldStack ref={stackRef} />
      <WeldAnimation stackRef={stackRef} />

      {selectedGroup && !isFixed && !isAnimating && (
        <TransformControls
          object={selectedGroup}
          mode={transformMode}
          size={0.6}
          onMouseDown={handleDragStart}
          onChange={handleChange}
          onMouseUp={handleDragEnd}
        />
      )}

      <Grid args={[80, 80]} cellSize={2} cellColor="#b0bec8" sectionSize={10} sectionColor="#8fa0b0"
        position={[0, -0.01, 0]} infiniteGrid fadeDistance={150} />

      <OrbitControls ref={orbitRef} makeDefault target={[0, 0, 0]} maxDistance={500} minDistance={2} />
    </>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function WeldScene() {
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const stackRef = useRef<WeldStackHandles>(null);
  const setPartTransform = useStore((s) => s.setPartTransform);

  // Mate theo mặt cụ thể + khoảng cách (SolidWorks style)
  const handleMate = useCallback((
    movingRole: MeshRole,
    movingFace: 'top' | 'bottom',
    anchorRole: MeshRole,
    anchorFace: 'top' | 'bottom',
    offsetMm: number,
  ) => {
    const movingGroup = stackRef.current?.getGroupRef(movingRole);
    const anchorGroup = stackRef.current?.getGroupRef(anchorRole);
    if (!movingGroup || !anchorGroup) return;

    const movingBox = new THREE.Box3().setFromObject(movingGroup);
    const anchorBox = new THREE.Box3().setFromObject(anchorGroup);

    // Vị trí world Y của mặt được chọn
    const movingFaceY = movingFace === 'top' ? movingBox.max.y : movingBox.min.y;
    const anchorFaceY = anchorFace === 'top' ? anchorBox.max.y : anchorBox.min.y;

    // Delta: dịch moving sao cho movingFace = anchorFace + offsetMm
    const delta = anchorFaceY + offsetMm - movingFaceY;
    const newY = movingGroup.position.y + delta;

    movingGroup.position.y = newY;
    setPartTransform(movingRole, {
      position: [movingGroup.position.x, newY, movingGroup.position.z],
      rotation: [movingGroup.rotation.x, movingGroup.rotation.y, movingGroup.rotation.z],
    });
  }, [setPartTransform]);

  return (
    <div className="relative h-full w-full">
      <Canvas frameloop="always" dpr={[1, 2]} camera={{ position: [22, 16, 28], fov: 42, near: 0.1, far: 2000 }} shadows>
        <color attach="background" args={['#d6e4ee']} />
        <fog attach="fog" args={['#d6e4ee', 120, 400]} />
        <Scene orbitRef={orbitRef} stackRef={stackRef} />
      </Canvas>
      <AssemblyPanel onMate={handleMate} />
    </div>
  );
}
