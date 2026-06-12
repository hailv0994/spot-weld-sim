# NIGHTLOG — Spot Weld Sim

Nhật ký làm việc tự động đêm 2026-06-12 → sáng 2026-06-13.
Mục tiêu: hoàn thiện Phase 2 (viewer 3D STEP) → Phase 3 (animation nhiệt) → Phase 4 (AI trích xuất).

## Trạng thái
- [x] **Phase 1** — physics engine + UI + tính điều kiện hàn / nugget / weld lobe. Typecheck PASS, verify trên app thật.
- [x] **Phase 2** — STEP loader (occt-import-js wasm) + viewer 3D R3F (2 tấm + điện cực + nugget). Render OK trên browser.
- [x] **Phase 3** — solver nhiệt FDM trục đối xứng (82 frame) + animation mặt cắt + timeline. ĐÃ VERIFY: chu trình nhiệt vật lý đúng, nugget khớp mô hình lumped (4.51mm).
- [x] **Phase 4** — upload ảnh/PDF bản vẽ → Claude trích xuất thông số → áp vào form. Code typecheck + build PASS, UI render. CẦN API KEY để chạy thật (xem "Cần user").

## Quy ước khi tự động
- Sau mỗi mốc: chạy typecheck, cập nhật mục Trạng thái + Log bên dưới.
- Nếu bị chặn (cần file thật / quyết định của user): ghi vào "Cần user", dùng phương án mặc định hợp lý rồi đi tiếp.
- Không phá code Phase trước; chỉ thêm/mở rộng.

## Cần user (đọc khi dậy)
- **Phase 4 (AI trích xuất)**: nhập Anthropic API key vào ô ở mục ⑥ trên app (lưu localStorage trình duyệt) rồi upload ảnh/PDF bản vẽ để test. Chưa có key nên tao không chạy thật được phần này.
- **File STEP thật**: tao test viewer bằng hình tham số (tấm + điện cực). Khi mày có file STEP thật, thả vào mục "Viewer 3D" để kiểm tra occt-import-js đọc đúng.
- **Hiệu chỉnh hệ số mô hình (mục ⑤)**: số tuyệt đối (nugget, lực kéo, bắn tóe) cần calibrate theo mẫu thử thực tế của xưởng. Mặc định đang chỉnh cho thép tấm 1mm.

## Log
- [Phase 1] Hoàn tất scaffold + physics core + UI. Typecheck PASS sau khi sửa import LobePoint.
- [Phase 2] STEP loader (occt-import-js wasm, ?url) + viewer R3F. Sửa lỗi build: occt-import-js là CJS → đổi optimizeDeps exclude→include; bỏ <Environment> + frameloop="demand" để screenshot/idle được.
- [Phase 3] Thermal solver FDM trục đối xứng (82 frame) + heatmap mặt cắt + timeline. VERIFY trên app: chu trình nhiệt đúng (719°C→1841°C nóng chảy→nguội 128°C), nugget 4.51mm khớp lumped.
- [Calibration] Sửa bug nugget nhảy bậc: ngưỡng tạo nugget dùng lớp mỏng faying (nhất quán thể tích) + targetNugget tính cả đường kính từ lực kéo yêu cầu → có cửa sổ hàn liền mạch. Optimizer ra I=10.8kA/F=2.7kN/t=91ms feasible. Trần nhiệt độ đỉnh để hết số phi vật lý.
- [Phase 4] extractSpec.ts gọi Claude (browser-direct, opus-4-8) đọc ảnh/PDF → map SI → form. Build full PASS. manualChunks tách three/react.
