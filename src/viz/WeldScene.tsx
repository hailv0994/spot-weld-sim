import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { WeldStack } from './WeldStack';

// Khung cảnh 3D: camera, ánh sáng, lưới nền, điều khiển xoay. Đơn vị mm.
// frameloop="demand": chỉ render khi có thay đổi → nhẹ CPU, trang idle được (chụp ảnh OK).
// Không dùng <Environment> (tránh tải HDRI từ mạng); thay bằng đèn để vẫn lên khối kim loại.

export function WeldScene() {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ position: [18, 14, 22], fov: 45, near: 0.1, far: 2000 }}
    >
      <color attach="background" args={['#0b0f14']} />
      <ambientLight intensity={0.6} />
      <hemisphereLight args={['#bcd4ff', '#20303f', 0.6]} />
      <directionalLight position={[20, 30, 15]} intensity={1.6} />
      <directionalLight position={[-15, 10, -10]} intensity={0.6} />
      <pointLight position={[0, 8, 0]} intensity={0.4} />

      <WeldStack />

      <Grid
        args={[60, 60]}
        cellSize={2}
        cellColor="#1e2a36"
        sectionSize={10}
        sectionColor="#2e4156"
        position={[0, -0.001, 0]}
        infiniteGrid
        fadeDistance={120}
      />

      <OrbitControls makeDefault target={[0, 0, 0]} />
    </Canvas>
  );
}
