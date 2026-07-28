/* ALN — Gạch & Kim Cương: thang cấp bậc + SVG ngôi nhà dùng chung
   (xem CLAUDE.md mục "Gạch & Kim Cương").
   Nạp bằng <script src="aln-tiers.js"></script> trong <head>, TRƯỚC mọi
   script gọi ALN_TIERS/alnHouseSVG — script thường (không type="module"),
   chạy đồng bộ theo thứ tự nên chỉ cần nạp trước là đủ. */
var ALN_TIERS = [
  { min: 0,    name: 'Nền Móng',  icon: '🧱' },
  { min: 50,   name: 'Khung Nhà', icon: '🏗️' },
  { min: 150,  name: 'Mái Ấm',    icon: '🏠' },
  { min: 400,  name: 'Biệt Thự',  icon: '🏡' },
  { min: 1000, name: 'Dinh Thự',  icon: '🏰' },
];

/* Hình ngôi nhà xây dần theo cấp bậc (0..4) — "trò chơi tỷ phú" trực quan thay số khô khan.
   height mặc định 72 (khớp client_CN/kts_dashboard/designer_dashboard/ncc-dashboard);
   ctv_dashboard.html gọi alnHouseSVG(idx, 90) để giữ đúng kích thước gốc của trang đó. */
function alnHouseSVG(idx, height){
  height = height || 72;
  var lvl = Math.max(0, Math.min(4, idx || 0));
  var s = '<svg viewBox="0 0 140 92" width="100%" height="' + height + '" style="display:block" aria-hidden="true">';
  s += '<line x1="6" y1="86" x2="134" y2="86" stroke="currentColor" stroke-opacity=".22" stroke-width="2"/>';
  s += '<rect x="30" y="78" width="80" height="8" rx="1" fill="currentColor" fill-opacity="' + (lvl >= 1 ? '.3' : '.55') + '"/>';
  if (lvl >= 1) {
    s += '<line x1="34" y1="78" x2="34" y2="44" stroke="currentColor" stroke-opacity=".5" stroke-width="3"/>';
    s += '<line x1="106" y1="78" x2="106" y2="44" stroke="currentColor" stroke-opacity=".5" stroke-width="3"/>';
    s += '<line x1="70" y1="78" x2="70" y2="44" stroke="currentColor" stroke-opacity=".3" stroke-width="3"/>';
    s += '<line x1="34" y1="44" x2="106" y2="44" stroke="currentColor" stroke-opacity=".5" stroke-width="3"/>';
  }
  if (lvl >= 2) {
    s += '<rect x="34" y="44" width="72" height="34" fill="currentColor" fill-opacity=".16"/>';
    s += '<polygon points="27,44 70,17 113,44" fill="#98690a"/>';
  }
  if (lvl >= 3) {
    s += '<rect x="62" y="58" width="16" height="20" rx="1" fill="currentColor" fill-opacity=".65"/>';
    s += '<rect x="42" y="54" width="12" height="12" rx="1" fill="#fff" fill-opacity=".85"/>';
    s += '<rect x="86" y="54" width="12" height="12" rx="1" fill="#fff" fill-opacity=".85"/>';
    s += '<circle cx="18" cy="68" r="8" fill="#3a7d44" fill-opacity=".55"/>';
    s += '<line x1="18" y1="76" x2="18" y2="86" stroke="currentColor" stroke-opacity=".4" stroke-width="2"/>';
  }
  if (lvl >= 4) {
    s += '<rect x="46" y="28" width="16" height="16" fill="currentColor" fill-opacity=".22"/>';
    s += '<line x1="70" y1="17" x2="70" y2="6" stroke="currentColor" stroke-opacity=".6" stroke-width="2"/>';
    s += '<polygon points="70,6 82,10 70,14" fill="#d4a017"/>';
    s += '<line x1="8" y1="86" x2="8" y2="80" stroke="currentColor" stroke-opacity=".35" stroke-width="2"/>';
    s += '<line x1="132" y1="86" x2="132" y2="80" stroke="currentColor" stroke-opacity=".35" stroke-width="2"/>';
  }
  s += '</svg>';
  return s;
}
