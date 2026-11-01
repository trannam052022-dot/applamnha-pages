/* ═══════════════════════════════════════════════════════════════
   Văn phòng ALN (ảo) — /van-phong/ (01/11/2026)

   Một mặt bằng văn phòng isometric dẫn vào các công cụ THẬT của ALN.
   Ba vai, chọn ở màn đầu (nhớ trong localStorage, đổi được bất cứ lúc nào):
   - chu-nha  : bấm vào phòng → nhân vật "Bạn" đi tới phòng → mở trang thật
                trong khung (du-toan-nha, ho-so-mau, khong-gian-nha...). Trang
                trong khung cùng origin nên văn phòng nghe được sự kiện thật
                (aln_du_toan_tinh, aln_lead_submit, aln_khung_gio_chon...) và
                cho nhân viên trong phòng phản hồi ngay bằng số liệu của khách.
   - ctv      : như chủ nhà, mở sẵn Phòng Cộng tác viên (ctv_dashboard.html).
   - quan-tri : chỉ Founder (users/{uid}.role=='founder'). Đọc dữ liệu thật:
                houses trước C1 (onSnapshot — tức thời) + segmentContacts
                (callable, 60 giây/lần) → khách mới, lưu dự toán, hẹn giờ gọi,
                đã gọi, đổi giai đoạn hiện thành hoạt động trong văn phòng.
   Không ghi Firestore, không đụng firestore.rules. Chữ công khai: chỉ dùng
   câu đã có trên chu-nha.html / CLAUDE.md (mức B — Founder duyệt qua PR).
   Không hiện SĐT đầy đủ ở bất kỳ đâu (chỉ 4 số cuối, chế độ quản trị).
   ═══════════════════════════════════════════════════════════════ */
const $=s=>document.querySelector(s);
const GW=26, GH=19, WALLH=86;
const OX=GH*16+40, OY=WALLH+40;
const worldW=(GW+GH)*16+80, worldH=OY+(GW+GH)*8+70;
const P=(x,y,z=0)=>[OX+(x-y)*16, OY+(x+y)*8-z];
const BRASS="#c9a35b";
let MODE="chu-nha"; // chu-nha | ctv | quan-tri
const ADMIN=()=>MODE==="quan-tri";

/* ---------- dữ liệu phòng ----------
   pub: cách phòng hiện với chủ nhà/CTV (null = khu nội bộ, không mở).
   adm: cách phòng hiện với quản trị. go = trang thật mở trong khung. */
const Z=[
 {id:"gd",x0:8,y0:7,x1:13,y1:12,c:"#c9a35b",
  pub:{name:"Phòng KTS Trần Long",st:"live",who:"Kiến trúc sư phụ trách hồ sơ thiết kế",
   items:["Hồ sơ do kiến trúc sư có chứng chỉ hành nghề ký, đủ điều kiện xin phép xây dựng","Đơn giá thiết kế niêm yết sẵn theo m², anh chị tự tính được ngay"],go:"/chu-nha.html#tinhngay",cta:"Tính phí cho nhà của tôi"},
  adm:{name:"Phòng Giám đốc",st:"live",who:"Nam (KTS Trần Long), Phó Giám đốc",
   items:["Gọi lại khách khi có lead mới, bấm “Đã gọi” để dừng SLA","Duyệt đề xuất của Trưởng phòng","Ký hợp đồng thiết kế TUQ. Giám đốc"],go:"/founder_panel.html",cta:"Mở trang quản trị",tab:1}},
 {id:"tiep",x0:13,y0:7,x1:18,y1:12,c:"#e6c27a",
  pub:{name:"Phòng tiếp khách",st:"live",who:"Nơi chủ nhà gặp KTS, trao đổi nhu cầu",
   items:["Gửi thông tin khu đất, nhận phương án và báo giá","KTS sẽ liên hệ trong 24 giờ làm việc"],go:"/chu-nha.html#tuvan",cta:"Nhận tư vấn thiết kế"},
  adm:{name:"Phòng tiếp khách",st:"live",who:"KTS gặp chủ nhà, chốt phiếu thống nhất yêu cầu",
   items:["Brief buổi gặp: nút Brief ở tab Pipeline / Hồ sơ dự toán","Phiếu thống nhất yêu cầu thiết kế trước khi ký"],go:"/founder_panel.html",cta:"Mở trang quản trị",tab:1}},
 {id:"ceo",x0:10,y0:0,x1:16,y1:6,c:"#8fb3ff",
  pub:{name:"Phòng họp · Quy trình 4 bước",st:"live",who:"Thanh toán theo Quy trình 4 bước đảm bảo",
   items:["C1 Chốt việc · 10%","C2 Chốt phương án · 20%","C3 Chốt triển khai, hồ sơ kỹ thuật · 60%","C4 Nghiệm thu & bàn giao hồ sơ · 10%","Nghiệm thu, hài lòng rồi mới trả cho bước đó"],go:"/chu-nha.html",cta:"Xem quy trình và phí thiết kế"},
  adm:{name:"Phòng Chiến lược",st:"live",who:"CEO Agent v2.3, chạy khi Nam gõ lệnh",
   items:["CEO TODAY: đọc state.md + assumptions.md, trả 5 dòng việc","CEO LOG: ghi quyết định mới với mã DEC","Chỉ tạo việc nối được tới doanh thu"],go:null}},
 {id:"kho",x0:5,y0:0,x1:10,y1:6,c:"#b07cc6",
  pub:{name:"Thư viện hồ sơ mẫu",st:"live",who:"Bộ hồ sơ thiết kế mẫu 4 bộ môn",
   items:["Xem trước công khai","Xem đủ bộ sau khi xác thực số điện thoại"],go:"/ho-so-mau.html",cta:"Vào thư viện"},
  adm:{name:"Thư viện · Bộ não ALN",st:"live",who:"Bộ não ALN, kho bản vẽ, HOUSE DNA",
   items:["Một bản đồ nguồn sự thật trong repo ALN (docs/INDEX.md)","Bài học sau mỗi công trình vào docs/bai-hoc/","HOUSE DNA: quy tắc thiết kế nhà Việt dạng máy đọc được"],go:"/ho-so-mau.html",cta:"Xem thư viện công khai"}},
 {id:"kd",x0:0,y0:0,x1:5,y1:6,c:"#52c49a",
  pub:null,
  adm:{name:"Phòng Kinh doanh",st:"live",who:"Trưởng phòng AI (24/7) và Linh gọi khách",
   items:["Báo lead mới vào nhóm Telegram, chỉ hiện 4 số cuối","7:30 báo cáo ngày, 17:00 thứ Sáu báo cáo tuần","Đề xuất cách xử lý, chờ Nam duyệt"],go:"/founder_panel.html",cta:"Mở Pipeline (tab Pipeline)",tab:1}},
 {id:"pl",x0:16,y0:0,x1:21,y1:6,c:"#e08f6a",
  pub:{name:"Phòng hợp đồng",st:"live",who:"Hợp đồng tư vấn thiết kế ký trực tiếp với ALN",
   items:["ALN là nhà thầu tư vấn thiết kế, chịu trách nhiệm toàn bộ hồ sơ thiết kế","Thanh toán theo Quy trình 4 bước đảm bảo (C1–C4)"],go:"/chu-nha.html",cta:"Xem quy trình và phí thiết kế"},
  adm:{name:"Hành chính · Pháp lý",st:"live",who:"Lý Mỹ Linh, Giám đốc, người đại diện pháp luật",
   items:["GPKD, giấy ủy quyền ký hợp đồng","Hợp đồng tư vấn thiết kế mẫu, phiếu thống nhất yêu cầu","Thu theo mốc C1 10% · C2 20% · C3 60% · C4 10%"],go:null}},
 {id:"dt",x0:0,y0:7,x1:8,y1:12,c:"#5fb7d4",
  pub:{name:"Phòng Dự toán",st:"live",who:"Bảng dự toán phần thô theo kích thước lô",
   items:["Nhập kích thước lô và số tầng, có số tiền ngay","Lưu bảng chi tiết, chọn giờ để KTS gọi lại"],go:"/du-toan-nha.html",cta:"Lập dự toán"},
  adm:{name:"Phòng Dự toán",st:"live",who:"Công cụ dự toán trên applamnha.vn",
   items:["Chủ nhà lập miễn phí, tối đa 3 bảng/năm","Bản doanh nghiệp trả trước mới xem","Dự toán theo tầng nối sang Không gian Nhà"],go:"/du-toan-nha.html",cta:"Mở công cụ dự toán"}},
 {id:"tk",x0:18,y0:7,x1:26,y1:12,c:"#d6c27a",
  pub:{name:"Xưởng thiết kế",st:"trial",who:"Thử phương án mặt bằng cho lô đất của bạn",
   items:["Nhập kích thước lô và nhu cầu gia đình","Xem 3 phương án mặt bằng từng tầng (bản dùng thử)"],go:"/thiet-ke-mat-bang/",cta:"Xem thử mặt bằng"},
  adm:{name:"Xưởng Thiết kế",st:"live",who:"Nam làm phương án; KTV, KS, điện nước theo hồ sơ",
   items:["Phương án mặt bằng + phối cảnh khoảng 7 ngày","Kiến trúc, kết cấu, điện nước khoảng 15 ngày; giao hồ sơ 3 ngày"],go:"/thiet-ke-mat-bang/",cta:"Mở công cụ mặt bằng"}},
 {id:"sanh",x0:8,y0:13,x1:18,y1:19,c:"#e2a3b8",
  pub:{name:"Sảnh · Lễ tân MyMy",st:"live",who:"MyMy, trợ lý của ALN",
   items:["Hỏi về phí thiết kế, quy trình, dự toán","Bạn bấm đồng ý thì MyMy mới lưu số điện thoại"],go:"/?mymy=1",cta:"Trò chuyện với MyMy"},
  adm:{name:"Sảnh · Lễ tân MyMy",st:"live",who:"MyMy, trợ lý chat trên applamnha.vn",
   items:["Đón khách ở trang dự toán, diễn đàn, Kho Mẫu","Khách bấm đồng ý rồi mới lưu số điện thoại"],go:"/du-toan-nha.html?mymy=1",cta:"Thử MyMy"}},
 {id:"tt",x0:0,y0:13,x1:8,y1:19,c:"#f07a5a",
  pub:{name:"Phòng Cộng tác viên",st:"live",who:"Đồng hành cùng ALN, tích Gạch",
   items:["Làm nhiệm vụ đơn giản, không cần tài khoản","Giới thiệu chủ nhà sắp xây nhà, nhận thưởng giới thiệu"],go:"/ctv_dashboard.html",cta:"Vào phòng CTV"},
  adm:{name:"Tiếp thị · CTV",st:"live",who:"Quảng cáo Meta, Google Ads, SEO, Zalo OA, game CTV",
   items:["Trước Tết chỉ đẩy quảng cáo Gói Quản lý Thi công","Game CTV công khai, không cần tài khoản"],go:"/ctv_dashboard.html",cta:"Xem phòng CTV"}},
 {id:"kgn",x0:18,y0:13,x1:26,y1:19,c:"#7fd18b",
  pub:{name:"Không gian Nhà",st:"trial",who:"Nơi chủ nhà theo dõi hồ sơ nhà của mình",
   items:["Đăng nhập bằng mã OTP số điện thoại","Theo dõi các mốc, tài liệu và sổ chi"],go:"/khong-gian-nha.html",cta:"Vào Không gian Nhà"},
  adm:{name:"Showroom Không gian Nhà",st:"trial",who:"Cổng chủ nhà, đăng nhập bằng OTP",
   items:["Theo dõi 4 mốc C1–C4, tài liệu, nhật ký, sổ chi","Gói Quản lý Thi công: công cụ tự quản, không có người giám sát"],go:"/khong-gian-nha.html",cta:"Mở Không gian Nhà"}},
 {id:"cho",x0:21,y0:0,x1:26,y1:6,c:"#80858e",
  pub:null,
  adm:{name:"Phòng chờ mở",st:"pause",who:"Dự án đang tạm dừng",
   items:["Công ty MMT: tạm dừng từ 18/10","Radar tăng trưởng: tạm dừng từ 27/09"],go:null}}
];
const ZM={}; Z.forEach(z=>{ZM[z.id]=z; z.act="";});
const ST={live:"ĐANG MỞ",trial:"DÙNG THỬ",pause:"TẠM DỪNG",noi:"NỘI BỘ"};
const view=z=>ADMIN()?z.adm:(z.pub||{name:"Khu nội bộ",st:"noi",who:"Khu làm việc nội bộ của ALN",items:[],go:null});
const zname=z=>view(z).name;

/* ---------- tiện ích vẽ ---------- */
function rng(s){return function(){s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hex(h){h=h.replace("#","");return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]}
function shade(h,f){const c=hex(h).map(v=>Math.round(f>0?v+(255-v)*f:v*(1+f)));return"rgb("+c.join(",")+")"}
function poly(g,pts,fill,stroke,lw){g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.closePath();if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=lw||1;g.stroke()}}
function line(g,a,b,c,lw){g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.strokeStyle=c;g.lineWidth=lw||1;g.stroke()}
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function box(g,x,y,w,d,h,z,col,top){
  const a=P(x,y,z+h),b=P(x+w,y,z+h),c=P(x+w,y+d,z+h),e=P(x,y+d,z+h),c0=P(x+w,y+d,z),e0=P(x,y+d,z),b0=P(x+w,y,z);
  poly(g,[e,c,c0,e0],col); poly(g,[c,b,b0,c0],shade(col.startsWith("#")?col:"#888888",-.2));
  poly(g,[a,b,c,e],top||shade(col,.12));
}

/* ---------- đồ nội thất (lớp động, sắp theo chiều sâu) ---------- */
const F=[], GLOW=[], BLOCK=[];
// L3: bản ghi đồ đạc để van-phong-3d.js dựng lại đúng mặt bằng này bằng 3D
const L3=[]; function rec(t,a){L3.push({t,a:Array.from(a)})}
function add(key,draw,block){F.push({key,draw});if(block)BLOCK.push(block)}
let now=0, night=false;

function monitor(g,x,y,z,w,tint){
  box(g,x+w/2-.05,y+.05,.1,.1,4,z,"#2a2a2d");
  box(g,x,y,w,.08,9,z+4,"#18181b");
  const a=P(x+.06,y+.081,z+5),b=P(x+w-.06,y+.081,z+5),c=P(x+w-.06,y+.081,z+12.3),d=P(x+.06,y+.081,z+12.3);
  poly(g,[a,b,c,d],tint);
  g.save();g.globalAlpha=.55;for(let i=0;i<3;i++){const t=.25+i*.18;line(g,P(x+.15,y+.081,z+11-i*2),P(x+.15+(w-.3)*(.4+((i*37+Math.floor(now/900))%5)/10),y+.081,z+11-i*2),"#ffffff",.6)}g.restore();
}
function desk(x,y,w,d,o){rec("desk",arguments);o=o||{};const top=o.top||"#6e4629";
  add(x+w/2+y+d/2,g=>{
    box(g,x+.12,y+.12,w-.24,d-.24,11,0,"#3a2a1f");
    box(g,x,y,w,d,2.2,11,top,shade(top,.18));
    line(g,P(x,y+d,11.2),P(x+w,y+d,11.2),BRASS,.9);
    (o.mons||[]).forEach(m=>monitor(g,x+m,y+.12,13.2,.82,o.tint||"#63c9b8"));
    if(o.lamp){const lx=x+w-.3,ly=y+.25;line(g,P(lx,ly,13),P(lx,ly,22),BRASS,1.2);box(g,lx-.18,ly-.18,.36,.36,4,21,"#efe4cf")}
    if(o.paper){poly(g,[P(x+.3,y+.4,13.3),P(x+.9,y+.3,13.3),P(x+1,y+.75,13.3),P(x+.4,y+.85,13.3)],"#f4f1ea")}
  },[x,y,w,d]);
  (o.mons||[]).forEach(m=>GLOW.push({x:x+m+.4,y:y+.4,z:20,r:26,c:"95,215,195"}));
  if(o.lamp)GLOW.push({x:x+w-.3,y:y+.25,z:22,r:36,c:"255,196,120"});
}
function chair(x,y,col){rec("chair",arguments);add(x+y+.55,g=>{box(g,x+.3,y+.3,.1,.1,6,0,"#2b2b2b");box(g,x,y,.72,.72,2.6,6,col||"#2c2a28")})}
function plant(x,y,s,pot){rec("plant",arguments);s=s||1;pot=pot||"#b98d4e";const r=rng(Math.round(x*100+y));const leaves=[];for(let i=0;i<9;i++)leaves.push([r()-.5,r()-.5,r()]);
  add(x+y+.6*s,g=>{box(g,x,y,.6*s,.6*s,9*s,0,pot);const c=P(x+.3*s,y+.3*s,9*s);
    leaves.forEach((l,i)=>{g.beginPath();g.arc(c[0]+l[0]*16*s,c[1]-8*s-l[2]*12*s+l[1]*6,(4+l[2]*3)*s,0,7);g.fillStyle=i%3?"#3f7a52":"#5c9a68";g.fill()});},[x,y,.6*s,.6*s])}
function olive(x,y){rec("olive",arguments);const r=rng(Math.round(x*77+y*13));const lv=[];for(let i=0;i<40;i++)lv.push([r()*2-1,r(),r()]);
  add(x+y+.8,g=>{box(g,x,y,.8,.8,13,0,"#e6dfd3");const b=P(x+.4,y+.4,13);line(g,b,[b[0]+1,b[1]-26],"#5b4636",2.4);
    lv.forEach(l=>{g.beginPath();g.arc(b[0]+l[0]*15,b[1]-28-l[1]*24,2.2+l[2]*1.6,0,7);g.fillStyle=l[2]>.5?"#8fa271":"#6f8457";g.fill()});},[x,y,.8,.8])}
function lamp(x,y){rec("lamp",arguments);add(x+y+.2,g=>{const b=P(x,y,0);g.beginPath();g.ellipse(b[0],b[1],4,2,0,0,7);g.fillStyle="#222";g.fill();line(g,b,P(x,y,42),BRASS,1.3);
  const t=P(x,y,46);g.beginPath();g.moveTo(t[0]-5,t[1]+4);g.lineTo(t[0]+5,t[1]+4);g.lineTo(t[0]+3.5,t[1]-4);g.lineTo(t[0]-3.5,t[1]-4);g.closePath();g.fillStyle="#f1e6cf";g.fill();});
  GLOW.push({x,y,z:44,r:60,c:"255,190,110"})}
function sofa(x,y,w,d,col,back){rec("sofa",arguments);add(x+w/2+y+d/2,g=>{const dk=shade(col,-.25);
  if(back==="y"){box(g,x,y,w,.32,16,0,col);box(g,x,y,w,d,7,0,col);box(g,x,y,.28,d,11,0,col);box(g,x+w-.28,y,.28,d,11,0,col)}
  else{box(g,x,y,.32,d,16,0,col);box(g,x,y,w,d,7,0,col);box(g,x,y,w,.28,11,0,col);box(g,x,y+d-.28,w,.28,11,0,col)}
  line(g,P(x,y+d,7),P(x+w,y+d,7),dk,.6);},[x,y,w,d])}
function table(x,y,w,d,h,top){rec("table",arguments);add(x+w/2+y+d/2,g=>{box(g,x+w/2-.15,y+d/2-.15,.3,.3,h-2,0,"#2a2522");box(g,x,y,w,d,2,h-2,top||"#ece6dc");line(g,P(x,y+d,h-2),P(x+w,y+d,h-2),BRASS,.8)},[x,y,w,d])}
function counter(x,y,w,d){rec("counter",arguments);add(x+w/2+y+d/2,g=>{box(g,x,y,w,d,16,0,"#e9e2d6","#f6f2ea");poly(g,[P(x,y+d,6),P(x+w,y+d,6),P(x+w,y+d,7.4),P(x,y+d,7.4)],BRASS);
  poly(g,[P(x+w,y,6),P(x+w,y+d,6),P(x+w,y+d,7.4),P(x+w,y,7.4)],"#a8853f");},[x,y,w,d])}
function cabinet(x,y,w,d,h,col){rec("cabinet",arguments);add(x+w/2+y+d/2,g=>{box(g,x,y,w,d,h,0,col);for(let i=1;i<4;i++){const zz=h*i/4;line(g,P(x,y+d,zz),P(x+w,y+d,zz),"rgba(0,0,0,.35)",.6);
  const m=P(x+w/2,y+d,zz-h/8);g.fillStyle=BRASS;g.fillRect(m[0]-2,m[1]-.6,4,1.2)}},[x,y,w,d])}
function server(x,y){rec("server",arguments);add(x+.45+y+.35,g=>{box(g,x,y,.9,.7,40,0,"#1d1f24");for(let r=0;r<6;r++)for(let c=0;c<3;c++){const p=P(x+.15+c*.25,y+.7,8+r*5);
  const on=((r*3+c+Math.floor(now/400))%5)!==0;g.fillStyle=on?(c===2?"#e9b85c":"#4fd8b0"):"#2f3640";g.fillRect(p[0]-1,p[1]-.7,2,1.4)}},[x,y,.9,.7]);GLOW.push({x:x+.45,y:y+.8,z:20,r:30,c:"80,220,180"})}
function drafting(x,y,w,d){rec("drafting",arguments);add(x+w/2+y+d/2,g=>{box(g,x+.1,y+.4,.1,.1,12,0,"#2b2b2b");box(g,x+w-.2,y+.4,.1,.1,12,0,"#2b2b2b");
  poly(g,[P(x,y,18),P(x+w,y,18),P(x+w,y+d,11),P(x,y+d,11)],"#efe9dd","#8a7a5c",.6);
  g.save();g.globalAlpha=.6;for(let i=1;i<5;i++)line(g,P(x+.2,y+i*d/5,18-7*i/5),P(x+w-.2,y+i*d/5,18-7*i/5),"#4b6f9a",.5);g.restore();
  line(g,P(x+.2,y+.1,17.6),P(x+w-.4,y+d-.2,11.5),BRASS,.8);},[x,y,w,d])}
function maquette(x,y){rec("maquette",arguments);add(x+1.1+y+.7,g=>{box(g,x,y,2.2,1.4,14,0,"#efeae1","#faf7f1");
  box(g,x+.3,y+.25,1.2,.8,9,14,"#f4f1ea");box(g,x+.25,y+.2,1.3,.9,1.2,23,"#3a3532");box(g,x+1.1,y+.45,.75,.65,15,14,"#e3dccf");box(g,x+1.05,y+.4,.85,.75,1.2,29,"#3a3532");
  for(let i=0;i<3;i++){const a=P(x+.4+i*.35,y+1.05,16),b=P(x+.6+i*.35,y+1.05,16);poly(g,[a,b,[b[0],b[1]-4],[a[0],a[1]-4]],"#86b8d1")}
  const t=P(x+.3,y+1.15,14);g.beginPath();g.arc(t[0],t[1]-6,3.4,0,7);g.fillStyle="#5c9a68";g.fill();},[x,y,2.2,1.4])}
function sheet(x,y,w,d,h){rec("sheet",arguments);add(x+w/2+y+d/2,g=>{box(g,x,y,w,d,h,0,"#d9d5cc","#e7e3db");poly(g,[P(x,y+d,0),P(x+w,y+d,0),P(x+w,y+d,3),P(x,y+d,3)],"#c9c4b9")},[x,y,w,d])}
function espresso(x,y){rec("espresso",arguments);add(x+y+.9,g=>{box(g,x,y,.5,.5,7,16,"#b9bdc2","#d7dadd");box(g,x+.1,y+.5,.3,.05,2,18,"#2a2a2a")})}
function sign(x,y,txt){rec("sign",arguments);add(x+y+.3,g=>{const b=P(x,y,0);line(g,b,P(x,y,24),BRASS,1.2);const t=P(x,y,30);rr(g,t[0]-24,t[1]-8,48,14,3);g.fillStyle="#1d2026";g.fill();g.strokeStyle=BRASS;g.lineWidth=.6;g.stroke();
  g.fillStyle="#e2c48a";g.font="600 6px 'JetBrains Mono',monospace";g.textAlign="center";g.fillText(txt,t[0],t[1]+1.5)})}

/* vách kính: đoạn 1 ô, chặn lối đi */
function glassX(X,y0,y1,gaps){rec("glassX",arguments);for(let y=y0;y<y1;y++){if(gaps&&gaps.some(([a,b])=>y>=a&&y<b))continue;const yy=y;
  add(X+yy+.5,g=>glassSeg(g,X,yy,X,yy+1));BLOCK.push([X-.2,yy,.4,1])}}
function glassY(Y,x0,x1,gaps){rec("glassY",arguments);for(let x=x0;x<x1;x++){if(gaps&&gaps.some(([a,b])=>x>=a&&x<b))continue;const xx=x;
  add(xx+.5+Y,g=>glassSeg(g,xx,Y,xx+1,Y));BLOCK.push([xx,Y-.2,1,.4])}}
function glassSeg(g,ax,ay,bx,by){const h=44;poly(g,[P(ax,ay,0),P(bx,by,0),P(bx,by,h),P(ax,ay,h)],night?"rgba(120,160,200,.10)":"rgba(185,215,232,.20)");
  line(g,P(ax,ay,h),P(bx,by,h),BRASS,1.6);line(g,P(ax,ay,0),P(bx,by,0),"#1c1c1e",1.2);line(g,P(ax,ay,0),P(ax,ay,h),"rgba(40,40,44,.8)",.8);
  g.save();g.globalAlpha=.35;line(g,P(ax+(bx-ax)*.2,ay+(by-ay)*.2,h-6),P(ax+(bx-ax)*.5,ay+(by-ay)*.5,8),"#ffffff",.7);g.restore()}

/* ---------- bố trí ----------
   Theo hành trình chủ nhà (01/11/2026): cửa chính giữa → Sảnh MyMy → TRUNG TÂM (Phòng KTS + Phòng tiếp khách)
   → sau lưng là Phòng họp quy trình 4 bước + Phòng hợp đồng. Hai bên trung tâm: Dự toán, Thư viện (trái);
   Xưởng thiết kế, Không gian Nhà (phải). Cộng tác viên cạnh cửa vào. Khu nội bộ ở 2 góc trong cùng. */
// Kinh doanh (nội bộ, góc trái trong cùng)
desk(.8,1.3,2.2,.9,{mons:[.65],tint:"#5fcf9a"}); chair(1.55,2.35);
desk(.8,3.6,2.2,.9,{mons:[.65],paper:1}); chair(1.55,4.65);
plant(4.1,.5,.8); glassX(5,0,6);
// Thư viện hồ sơ mẫu
table(5.8,1.2,1.9,1,13,"#5a3720"); chair(6.3,2.25,"#7a4a2a");
desk(7.6,3.1,2,.9,{mons:[.6],top:"#4a2e1b"}); chair(8.25,4.1,"#2c2a28");
sofa(5.5,4.6,1.6,.9,"#8a5232","y"); plant(9.3,.5,.8); glassX(10,0,6);
// Phòng họp · Quy trình 4 bước (ngay sau khu trung tâm)
table(11.1,1.9,3.8,1.6,14,"#f1ece4");
[11.4,12.6,13.8].forEach(x=>chair(x,1.15,"#1f3a5c")); [11.4,14.1].forEach(x=>chair(x,3.65,"#1f3a5c"));
plant(10.5,.5,1); plant(15,.5,1); lamp(15.3,4.9);
glassX(16,0,6); glassY(6,10,16,[[12,14]]);
// Phòng hợp đồng
desk(16.9,1.6,2.2,.9,{mons:[.7],paper:1,lamp:1}); chair(17.65,2.65);
cabinet(19.8,.45,.8,.6,32,"#4a2e1b"); plant(16.5,5.1,.8); glassX(21,0,6);
// Chờ mở (nội bộ, góc phải trong cùng)
server(23.5,.9); server(24.55,.9); sheet(21.8,2.6,1.7,1,14); sheet(22,4.4,2.2,.9,18); sign(25.2,5.4,"TẠM DỪNG");
// Dự toán
desk(1.3,8,2.8,.9,{mons:[.4,1.4],tint:"#6fb8e0"}); chair(2.35,9.05);
table(4.8,10.3,1.3,.8,12,"#e9e2d6"); plant(7.2,7.3,.8); glassX(8,7,12);
// TRUNG TÂM — Phòng KTS Trần Long
desk(9.7,8,2.6,1.05,{mons:[.9],lamp:1,top:"#5a3720"}); chair(10.65,9.25,"#3b2a20");
sofa(8.35,8.2,1.0,2.4,"#1f5c4a","x"); olive(12.1,11.0); lamp(8.5,11.5);
glassX(13,7,12,[[9,11]]);
// TRUNG TÂM — Phòng tiếp khách (cửa thông sang phòng KTS)
table(14.6,8.9,1.8,1.2,12,"#ece6dc");
[14.9,15.8].forEach(x=>chair(x,8.1,"#1f5c4a")); [14.9,15.8].forEach(x=>chair(x,10.2,"#1f5c4a"));
plant(17.2,7.3,.8); lamp(17.4,11.5); glassX(18,7,12);
// Xưởng thiết kế
[18.8,21.1,23.4].forEach(x=>drafting(x,8,1.8,.95)); plant(25.4,11.3,.9);
// Cộng tác viên (cạnh cửa vào)
desk(1.3,14.4,2.8,.9,{mons:[.4,1.4],tint:"#f0a074"}); chair(2.35,15.45);
sofa(3.6,17.4,1.8,.9,"#6b2d2d","y"); plant(7.2,13.4,.8); glassX(8,13,19);
// Sảnh · Lễ tân MyMy (cửa chính ở giữa, đi thẳng vào trung tâm)
counter(11,14.6,4,.9); rec("khoi",[8.3,15.6,.85,2.4,15,"#4a2e1b"]); add(8.72+16.8,g=>{box(g,8.3,15.6,.85,2.4,15,0,"#4a2e1b","#e9e2d6")},[8.3,15.6,.85,2.4]); espresso(8.45,15.9);
sofa(15.4,15.8,2.3,.9,"#1f5c4a","y"); table(15.7,17.1,1.6,.6,8,"#ece6dc");
olive(17,13.35); plant(8.5,18.2,.9); lamp(17.4,18.4); glassX(18,13,19);
// Không gian Nhà
maquette(19.4,14.3); sofa(22.8,15,.9,2.4,"#8a5232","x"); lamp(23.6,13.5); plant(18.4,18.2,.8);

/* ---------- lớp tĩnh: sàn + tường ---------- */
const cache=document.createElement("canvas"); let cacheS=0, lastBuild=0;
function floorT(g){g.transform(16,8,-16,8,OX,OY)}
function marble(g,x0,y0,x1,y1,base,vein,seed,slab){const r=rng(seed);g.fillStyle=base;g.fillRect(x0,y0,x1-x0,y1-y0);g.save();g.beginPath();g.rect(x0,y0,x1-x0,y1-y0);g.clip();
  g.lineCap="round";const n=Math.round((x1-x0)*(y1-y0)*.7);for(let i=0;i<n;i++){const x=x0+r()*(x1-x0),y=y0+r()*(y1-y0);g.beginPath();g.moveTo(x,y);
  g.bezierCurveTo(x+r()*.8,y+r()*.3,x+r()*1.2,y+r()*.9-.2,x+.6+r()*1.2,y+.2+r()*.8);g.strokeStyle=vein;g.globalAlpha=.25+r()*.45;g.lineWidth=.012+r()*.03;g.stroke()}
  g.globalAlpha=1;g.strokeStyle="rgba(0,0,0,.08)";g.lineWidth=.02;const s=slab||2;for(let x=Math.ceil(x0/s)*s;x<x1;x+=s){g.beginPath();g.moveTo(x,y0);g.lineTo(x,y1);g.stroke()}
  for(let y=Math.ceil(y0/s)*s;y<y1;y+=s){g.beginPath();g.moveTo(x0,y);g.lineTo(x1,y);g.stroke()}g.restore()}
function wood(g,x0,y0,x1,y1,c1,c2,seed){const r=rng(seed);g.save();g.beginPath();g.rect(x0,y0,x1-x0,y1-y0);g.clip();
  for(let i=Math.floor(x0);i<x1;i++)for(let j=Math.floor(y0);j<y1;j++){const along=(i+j)%2===0;for(let k=0;k<3;k++){g.fillStyle=r()>.5?c1:c2;
    if(along)g.fillRect(i,j+k/3,1,1/3);else g.fillRect(i+k/3,j,1/3,1)}
    g.strokeStyle="rgba(0,0,0,.18)";g.lineWidth=.012;for(let k=1;k<3;k++){g.beginPath();if(along){g.moveTo(i,j+k/3);g.lineTo(i+1,j+k/3)}else{g.moveTo(i+k/3,j);g.lineTo(i+k/3,j+1)}g.stroke()}
    g.strokeRect(i,j,1,1)}g.restore()}
function rug(g,x0,y0,x1,y1,c,b){g.fillStyle=b;g.fillRect(x0,y0,x1-x0,y1-y0);g.fillStyle=c;g.fillRect(x0+.15,y0+.15,x1-x0-.3,y1-y0-.3);g.strokeStyle=b;g.lineWidth=.03;g.strokeRect(x0+.35,y0+.35,x1-x0-.7,y1-y0-.7)}
function inlay(g,y,x0,x1){g.strokeStyle=BRASS;g.lineWidth=.04;g.beginPath();g.moveTo(x0,y);g.lineTo(x1,y);g.stroke()}

function windowPane(g,u0,u1,v0,v1,seed){const r=rng(seed);g.save();g.beginPath();g.rect(u0,v0,u1-u0,v1-v0);g.clip();
  const gr=g.createLinearGradient(0,v0,0,v1);if(night){gr.addColorStop(0,"#0a1230");gr.addColorStop(1,"#26365e")}else{gr.addColorStop(0,"#a9cbe2");gr.addColorStop(1,"#eef2ef")}
  g.fillStyle=gr;g.fillRect(u0,v0,u1-u0,v1-v0);
  for(let u=u0-2;u<u1;){const bw=5+r()*9,bh=8+r()*28;g.fillStyle=night?"#070b1c":(r()>.5?"#8aa1b4":"#9fb3c2");g.fillRect(u,v1-bh,bw,bh);
    if(night)for(let wy=v1-bh+2;wy<v1-2;wy+=3)for(let wx=u+1;wx<u+bw-1;wx+=2.4)if(r()>.62){g.fillStyle="#f3c86a";g.fillRect(wx,wy,1,1.2)}u+=bw+.5}
  g.restore();g.strokeStyle="#151517";g.lineWidth=.9;const cols=3,rows=4;for(let i=1;i<cols;i++){const u=u0+(u1-u0)*i/cols;g.beginPath();g.moveTo(u,v0);g.lineTo(u,v1);g.stroke()}
  for(let i=1;i<rows;i++){const v=v0+(v1-v0)*i/rows;g.beginPath();g.moveTo(u0,v);g.lineTo(u1,v);g.stroke()}
  g.lineWidth=2;g.strokeRect(u0,v0,u1-u0,v1-v0);g.fillStyle=BRASS;g.fillRect(u0-1,v1,u1-u0+2,1.6)}
function shelf(g,u0,u1,v0,v1,seed){const r=rng(seed);g.fillStyle="#3a2416";g.fillRect(u0,v0,u1-u0,v1-v0);const rows=Math.floor((v1-v0)/13);const cols=["#7b2e2e","#2e4f6b","#c9a35b","#3b5d47","#d9cfc0","#1f1f22","#8a5232"];
  for(let k=0;k<rows;k++){const base=v0+(k+1)*(v1-v0)/rows-1.5;g.fillStyle=BRASS;g.fillRect(u0,base,u1-u0,1.2);
    for(let u=u0+1.5;u<u1-2;){const w=1.4+r()*2,h=6+r()*4.5;if(r()>.9){u+=3;continue}g.fillStyle=cols[Math.floor(r()*cols.length)];g.fillRect(u,base-h,w,h);u+=w+.25}}
  g.strokeStyle="#2a190f";g.lineWidth=1.5;g.strokeRect(u0,v0,u1-u0,v1-v0)}
function art(g,u0,u1,v0,v1,seed){const r=rng(seed);g.fillStyle="#f2ede4";g.fillRect(u0,v0,u1-u0,v1-v0);g.save();g.beginPath();g.rect(u0+2,v0+2,u1-u0-4,v1-v0-4);g.clip();
  const pal=["#1f5c4a","#c9a35b","#2b2b2e","#b4563f","#d7cdbb"];for(let i=0;i<4;i++){g.fillStyle=pal[Math.floor(r()*pal.length)];g.beginPath();g.arc(u0+r()*(u1-u0),v0+r()*(v1-v0),4+r()*9,0,7);g.fill()}
  g.restore();g.strokeStyle="#1c1c1e";g.lineWidth=1.6;g.strokeRect(u0,v0,u1-u0,v1-v0)}
function screenPanel(g,u0,u1,v0,v1,title,lines,accent){g.fillStyle="#0f1216";g.fillRect(u0,v0,u1-u0,v1-v0);g.strokeStyle="#2a2d33";g.lineWidth=1.5;g.strokeRect(u0,v0,u1-u0,v1-v0);
  g.fillStyle=accent;g.font="700 6px 'JetBrains Mono',monospace";g.textAlign="left";g.fillText(title,u0+4,v0+9);
  g.font="500 4.6px 'Be Vietnam Pro',sans-serif";lines.forEach((t,i)=>{g.fillStyle=i===0?"#ffffff":"#b9c3cc";g.fillText(t,u0+4,v0+17+i*6.2)})}

// chữ trên 2 màn hình tường (theo vai) — dùng chung cho bản 2D và 3D
function bangTuong(){return ADMIN()?{a:{title:"CEO TODAY · CEO LOG",lines:["CEO TODAY: 5 dòng việc trong ngày","CEO LOG: ghi quyết định mới (DEC)","Chỉ làm việc nối tới doanh thu"],accent:"#8fb3ff"},b:{title:"TELEGRAM · ALN ALERT",lines:["Báo lead mới ngay khi vào","Báo cáo ngày 07:30","Báo cáo tuần thứ Sáu 17:00","Gõ /baocao để xem nhanh"],accent:"#52c49a"}}
  :{a:{title:"QUY TRÌNH 4 BƯỚC",lines:["C1 Chốt việc · 10%","C2 Chốt phương án · 20%","C3 Chốt triển khai, hồ sơ kỹ thuật · 60%","C4 Nghiệm thu & bàn giao hồ sơ · 10%"],accent:"#c9a35b"},b:{title:"GIỜ LÀM VIỆC",lines:["Thứ Hai – Thứ Bảy","07:30 – 18:00","MyMy trực trên web cả ngày","KTS gọi lại từ 0909 829 696"],accent:"#52c49a"}}}
function wallA(g){g.save();g.transform(1,.5,0,1,OX,OY);const L=16*GW;
  g.fillStyle="#e6e0d6";g.fillRect(0,-WALLH,L,WALLH);
  for(let u=0;u<L;u+=32){g.fillStyle="rgba(0,0,0,.03)";g.fillRect(u,-WALLH,1,WALLH-22)}
  g.fillStyle="#5a3720";g.fillRect(0,-22,L,22);for(let u=8;u<L;u+=24){g.strokeStyle="rgba(0,0,0,.25)";g.lineWidth=.6;g.strokeRect(u,-19,18,15)}
  g.fillStyle=BRASS;g.fillRect(0,-23,L,1.4);g.fillStyle="#1d1712";g.fillRect(0,-3,L,3);
  windowPane(g,16*1,16*2.7,-80,-28,11);windowPane(g,16*3,16*4.6,-80,-28,13);shelf(g,16*5.4,16*9.6,-82,-24,12);
  {const b=bangTuong().a;screenPanel(g,16*10.6,16*15.4,-74,-32,b.title,b.lines,b.accent)}
  windowPane(g,16*16.8,16*18.6,-80,-28,22);shelf(g,16*22.2,16*25.8,-82,-24,23);
  g.restore();
  poly(g,[P(0,0,WALLH),P(GW,0,WALLH),P(GW,-.35,WALLH),P(0,-.35,WALLH)],"#2a2522");
  poly(g,[P(GW,0,0),P(GW,0,WALLH),P(GW,-.35,WALLH),P(GW,-.35,0)],"#3a332d")}
function wallB(g){g.save();g.transform(1,-.5,0,1,OX-16*GH,OY+8*GH);const L=16*GH;
  g.fillStyle="#e1dbd0";g.fillRect(0,-WALLH,L,WALLH);
  g.fillStyle="#4f301c";g.fillRect(0,-22,L,22);for(let u=4;u<L;u+=24){g.strokeStyle="rgba(0,0,0,.25)";g.lineWidth=.6;g.strokeRect(u,-19,18,15)}
  g.fillStyle=BRASS;g.fillRect(0,-23,L,1.4);g.fillStyle="#1d1712";g.fillRect(0,-3,L,3);
  const u=y=>16*(GH-y);
  // Sảnh: vách gỗ + logo đồng
  g.fillStyle="#3b2416";g.fillRect(u(18.6),-80,u(13.4)-u(18.6),58);
  g.fillStyle=BRASS;g.font="700 22px 'Playfair Display',serif";g.textAlign="center";g.fillText("ALN",(u(18.6)+u(13.4))/2,-46);
  g.font="600 5px 'JetBrains Mono',monospace";g.fillStyle="#e2c48a";g.fillText("APP LÀM NHÀ · NHÀ THẦU TƯ VẤN THIẾT KẾ",(u(18.6)+u(13.4))/2,-36);
  // Kinh doanh: màn hình Telegram
  {const b=bangTuong().b;screenPanel(g,u(11.6),u(7.4),-72,-30,b.title,b.lines,b.accent)}
  // Giám đốc
  art(g,u(5.6),u(4.1),-70,-40,31);windowPane(g,u(3.6),u(1.0),-80,-28,32);
  g.restore();
  poly(g,[P(0,0,WALLH),P(0,GH,WALLH),P(-.35,GH,WALLH),P(-.35,0,WALLH)],"#2a2522");
  poly(g,[P(0,GH,0),P(0,GH,WALLH),P(-.35,GH,WALLH),P(-.35,GH,0)],"#3a332d")}

function buildStatic(S){cacheS=S;lastBuild=performance.now();cache.width=Math.ceil(worldW*S);cache.height=Math.ceil(worldH*S);const g=cache.getContext("2d");g.setTransform(S,0,0,S,0,0);
  // bậc thềm + bệ sàn
  box(g,11,19,4,1.4,4,-4,"#d8d2c7","#ebe6dd");
  box(g,0,0,GW,GH,12,-12,"#2b2723");
  g.save();floorT(g);
  wood(g,0,0,5,6,"#b98c5e","#a87d52",1);
  wood(g,5,0,10,6,"#5d3a22","#4f311c",3); rug(g,5.4,3.6,7.6,5.7,"#6b2d2d","#c9a35b");
  marble(g,10,0,16,6,"#efebe4","#9d9488",2);
  wood(g,16,0,21,6,"#6a4126","#5c3820",11);
  g.fillStyle="#7d7a74";g.fillRect(21,0,5,6);{const r=rng(10);for(let i=0;i<220;i++){g.fillStyle=r()>.5?"rgba(255,255,255,.08)":"rgba(0,0,0,.1)";g.fillRect(21+r()*5,r()*6,.05,.05)}}
  marble(g,0,6,26,7,"#e8e3da","#a59c8f",4,1); inlay(g,6.1,0,26); inlay(g,6.9,0,26);
  wood(g,0,7,8,12,"#b98c5e","#a87d52",5);
  wood(g,8,7,13,12,"#6a4126","#5c3820",12); rug(g,8.2,7.4,12.8,11.7,"#1f5c4a","#c9a35b");
  marble(g,13,7,18,12,"#f1ede6","#a39888",13); rug(g,14.1,8.4,16.9,10.6,"#d9cfc0","#8a5232");
  wood(g,18,7,26,12,"#b98c5e","#a87d52",14);
  marble(g,0,12,26,13,"#e8e3da","#a59c8f",6,1); inlay(g,12.1,0,26); inlay(g,12.9,0,26);
  wood(g,0,13,8,19,"#b98c5e","#a87d52",8);
  marble(g,8,13,18,19,"#f1ede6","#a39888",7);
  for(let x=10;x<18;x+=2)for(let y=14;y<19;y+=2){if(x>10&&x<16&&y>15)continue;g.beginPath();g.moveTo(x,y-.28);g.lineTo(x+.28,y);g.lineTo(x,y+.28);g.lineTo(x-.28,y);g.closePath();g.fillStyle="#1f1d1c";g.fill();g.strokeStyle=BRASS;g.lineWidth=.025;g.stroke()}
  rug(g,11.6,18.2,14.4,19,"#2b2723","#c9a35b");
  wood(g,18,13,26,19,"#6a4126","#5c3820",9); rug(g,18.8,15.9,22.3,18.4,"#d9cfc0","#8a5232");
  g.restore();
  wallA(g);wallB(g);
  // cửa chính
  const a=P(11.1,19.02,0),b=P(14.9,19.02,0);line(g,a,b,BRASS,2);
}

/* ---------- lưới đi bộ ---------- */
const RES=2, GCOLS=GW*RES, GROWS=(GH+2)*RES; const grid=new Uint8Array(GCOLS*GROWS);
for(let j=0;j<GROWS;j++)for(let i=0;i<GCOLS;i++){const cx=(i+.5)/RES,cy=(j+.5)/RES;if(cy>19&&!(cx>11.1&&cx<14.9))grid[j*GCOLS+i]=1;if(cx<.3||cy<.3)grid[j*GCOLS+i]=1}
BLOCK.forEach(([x,y,w,d])=>{for(let j=0;j<GROWS;j++)for(let i=0;i<GCOLS;i++){const cx=(i+.5)/RES,cy=(j+.5)/RES;if(cx>x-.12&&cx<x+w+.12&&cy>y-.12&&cy<y+d+.12)grid[j*GCOLS+i]=1}});
const free=(i,j)=>i>=0&&j>=0&&i<GCOLS&&j<GROWS&&!grid[j*GCOLS+i];
function nearestFree(i,j){if(free(i,j))return[i,j];for(let r=1;r<8;r++)for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++)if(free(i+di,j+dj))return[i+di,j+dj];return[i,j]}
function los(ax,ay,bx,by){const d=Math.hypot(bx-ax,by-ay),n=Math.ceil(d/.2);for(let k=1;k<n;k++){const x=ax+(bx-ax)*k/n,y=ay+(by-ay)*k/n;if(!free(Math.floor(x*RES),Math.floor(y*RES)))return false}return true}
function findPath(sx,sy,tx,ty){let [si,sj]=nearestFree(Math.floor(sx*RES),Math.floor(sy*RES));const[ti,tj]=nearestFree(Math.floor(tx*RES),Math.floor(ty*RES));
  const prev=new Int32Array(GCOLS*GROWS).fill(-1);const q=[sj*GCOLS+si];prev[q[0]]=q[0];let h=0;const goal=tj*GCOLS+ti;
  const D=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  while(h<q.length){const c=q[h++];if(c===goal)break;const ci=c%GCOLS,cj=(c/GCOLS)|0;for(const[di,dj]of D){const ni=ci+di,nj=cj+dj;if(!free(ni,nj))continue;if(di&&dj&&(!free(ci+di,cj)||!free(ci,cj+dj)))continue;const n=nj*GCOLS+ni;if(prev[n]<0){prev[n]=c;q.push(n)}}}
  if(prev[goal]<0)return[[tx,ty]];const cells=[];for(let c=goal;c!==prev[c];c=prev[c])cells.push(c);cells.reverse();
  const pts=cells.map(c=>[(c%GCOLS+.5)/RES,(((c/GCOLS)|0)+.5)/RES]);pts.push([tx,ty]);
  const out=[];let cx=sx,cy=sy,k=0;while(k<pts.length){let far=k;for(let m=pts.length-1;m>k;m--){if(los(cx,cy,pts[m][0],pts[m][1])){far=m;break}}out.push(pts[far]);[cx,cy]=pts[far];k=far+1}
  return out}

/* ---------- nhân vật ----------
   name = tên với quản trị; pn = tên với chủ nhà/CTV; adminOnly = chỉ hiện ở quản trị. */
function mk(id,o){return Object.assign({id,x:o.hx,y:o.hy,path:[],res:null,say:"",sayUntil:0,busy:false,facing:!!o.fv,seed:Math.random()*6,hidden:false},o)}
const C={
 N:mk("N",{name:"Nam",pn:"KTS Trần Long",zone:"gd",hx:11.0,hy:9.65,seated:1,shirt:"#efe8dc",pants:"#2b2f3a",hair:"#1b1714",skin:"#e9bf97"}),
 L:mk("L",{name:"Linh",pn:"Chăm sóc khách",zone:"kd",hx:1.9,hy:5.0,seated:1,shirt:"#a94c4c",pants:"#2a2a30",hair:"#3a2418",skin:"#f0c8a2",long:1}),
 ML:mk("ML",{name:"Lý Mỹ Linh",pn:"Hành chính",zone:"pl",hx:18.0,hy:3.0,seated:1,shirt:"#2f3a56",pants:"#1f2228",hair:"#20160f",skin:"#f2cba6",long:1}),
 CEO:mk("CEO",{name:"CEO Agent",pn:"Trợ lý quy trình",zone:"ceo",hx:13,hy:4.45,ai:1,shirt:"#2d4f80",pants:"#1d2433",glow:"#8fb3ff"}),
 DB:mk("DB",{name:"Bộ não",pn:"Thủ thư",zone:"kho",hx:8.6,hy:4.45,ai:1,seated:1,shirt:"#5d3f78",pants:"#1d1a24",glow:"#c99bea"}),
 TP:mk("TP",{name:"Trưởng phòng",pn:"Trợ lý vận hành",zone:"kd",hx:1.9,hy:2.7,ai:1,seated:1,shirt:"#1f6b52",pants:"#1a2420",glow:"#52e0a8"}),
 DT:mk("DT",{name:"Dự toán",pn:"Dự toán",zone:"dt",hx:2.7,hy:9.4,ai:1,seated:1,shirt:"#25627d",pants:"#1a2228",glow:"#6fd0f0"}),
 KTV:mk("KTV",{name:"KTV",pn:"Kỹ thuật viên",zone:"tk",hx:19.7,hy:9.45,ghost:1,shirt:"#8a7a5c",pants:"#2a2a2a",hair:"#2a1d14",skin:"#ecc39c"}),
 KS:mk("KS",{name:"Kỹ sư KC",pn:"Kỹ sư kết cấu",zone:"tk",hx:22,hy:9.45,ghost:1,shirt:"#5f6f7d",pants:"#2a2a2a",hair:"#151210",skin:"#e2b48c"}),
 DN:mk("DN",{name:"Điện nước",pn:"Kỹ sư điện nước",zone:"tk",hx:24.3,hy:9.45,ghost:1,shirt:"#7d5f4f",pants:"#2a2a2a",hair:"#231a12",skin:"#e8bd95"}),
 MM:mk("MM",{name:"MyMy",pn:"MyMy",zone:"sanh",hx:13,hy:14.05,ai:1,fv:1,faceViewer:1,shirt:"#a24f72",pants:"#2a1d24",glow:"#ff9cc6"}),
 ADS:mk("ADS",{name:"Quảng cáo",pn:"Quảng cáo",adminOnly:1,zone:"tt",hx:2.7,hy:15.85,ai:1,seated:1,shirt:"#9a4a33",pants:"#2a1f1a",glow:"#ffaa80"}),
 BAN:mk("BAN",{name:"Bạn",pn:"Bạn",me:1,zone:"sanh",hx:13,hy:18.4,shirt:"#d9b25a",pants:"#3b3f4a",hair:"#2c2018",skin:"#e8bc93",hidden:true}),
 KH:mk("KH",{name:"Chủ nhà",pn:"Chủ nhà",zone:"sanh",hx:13,hy:20.6,shirt:"#6fa3c9",pants:"#3b3f4a",hair:"#2c2018",skin:"#e8bc93",hidden:true})
};
const CH=Object.values(C);
const atHome=c=>Math.abs(c.x-c.hx)<.05&&Math.abs(c.y-c.hy)<.05;
const cname=c=>ADMIN()?c.name:c.pn;

function drawChar(g,c){const[sx,sy]=P(c.x,c.y,0);const t=now/1000;g.save();if(c.ghost)g.globalAlpha=.5;
  const moving=c.path.length>0, seated=!moving&&c.seated&&atHome(c);
  g.fillStyle="rgba(0,0,0,.25)";g.beginPath();g.ellipse(sx,sy,7.5,3.6,0,0,7);g.fill();
  const ph=moving?Math.sin(t*13+c.seed):0, bob=moving?Math.abs(ph)*1.3:Math.sin(t*2+c.seed)*.4, lift=seated?4:0;
  if(!seated){g.fillStyle=c.pants;g.fillRect(sx-4,sy-8+(ph>0?-1.2:0),3,8);g.fillRect(sx+1,sy-8+(ph<0?-1.2:0),3,8)}
  const by=sy-7-bob+lift;rr(g,sx-6.5,by-13,13,14,4.5);g.fillStyle=c.shirt;g.fill();
  if(c.ai){g.fillStyle="rgba(255,255,255,.18)";g.fillRect(sx-1,by-11,2,9)}
  if(seated){const k=Math.sin(t*14+c.seed)>0?1:0;g.fillStyle=shade(c.shirt.startsWith("#")?c.shirt:"#666666",-.15);rr(g,sx-8.5,by-10+k,3,6.5,1.5);g.fill();rr(g,sx+5.5,by-10+(1-k),3,6.5,1.5);g.fill()}
  else if(moving){g.fillStyle=shade(c.shirt,-.15);rr(g,sx-8.5,by-11-ph,3,7,1.5);g.fill();rr(g,sx+5.5,by-11+ph,3,7,1.5);g.fill()}
  const hy=by-19;
  if(c.ai){rr(g,sx-7,hy-6.5,14,12.5,4.5);g.fillStyle="#e9edf0";g.fill();g.strokeStyle="rgba(0,0,0,.18)";g.lineWidth=.6;g.stroke();
    if(c.facing){rr(g,sx-5,hy-2.6,10,4.6,2.2);g.fillStyle="#0e1e26";g.fill();g.fillStyle=c.glow;const bl=(Math.sin(t*1.7+c.seed)>.96)?.4:1.6;g.fillRect(sx-3.4,hy-1.2,2.2,bl);g.fillRect(sx+1.2,hy-1.2,2.2,bl)}
    else{g.fillStyle="rgba(0,0,0,.08)";g.fillRect(sx-5,hy-1,10,1)}
    line(g,[sx,hy-6.5],[sx,hy-11],"#9aa4ab",.9);g.save();g.globalAlpha*=.55+.45*Math.sin(t*3+c.seed);g.beginPath();g.arc(sx,hy-12,2,0,7);g.fillStyle=c.glow;g.fill();g.restore()}
  else{g.beginPath();g.arc(sx,hy,6.5,0,7);g.fillStyle=c.skin;g.fill();
    if(c.facing){g.beginPath();g.arc(sx,hy-1.2,6.9,Math.PI*1.02,Math.PI*1.98);g.fillStyle=c.hair;g.fill();if(c.long){g.fillRect(sx-6.8,hy-1,2.4,8);g.fillRect(sx+4.4,hy-1,2.4,8)}
      g.fillStyle="#2a1d16";g.fillRect(sx-2.8,hy+.4,1.4,1.6);g.fillRect(sx+1.4,hy+.4,1.4,1.6)}
    else{g.beginPath();g.arc(sx,hy-.6,6.9,0,7);g.fillStyle=c.hair;g.fill();if(c.long){rr(g,sx-6.6,hy,13.2,9,3);g.fill()}}}
  g.restore()}

/* ---------- camera ---------- */
const cv=$("#cv"),ctx=cv.getContext("2d"),stage=$("#stage");let DPR=1,CW=0,CHh=0,zoom=1,panX=0,panY=0,tween=null,sel=null;
function fit(){const z=Math.min(CW/worldW,CHh/worldH)*.98;zoom=CW<640?Math.max(z,.58):z;const c=P(13,10,0);panX=CW/2-c[0]*zoom;panY=CHh/2-c[1]*zoom;if(zoom===z){panX=(CW-worldW*zoom)/2;panY=(CHh-worldH*zoom)/2}updZ()}
function resize(){const r=stage.getBoundingClientRect();DPR=Math.min(2,window.devicePixelRatio||1);const first=!CW;CW=r.width;CHh=r.height;cv.width=Math.round(CW*DPR);cv.height=Math.round(CHh*DPR);if(first)fit()}
new ResizeObserver(resize).observe(stage);
function updZ(){$("#zl").textContent=Math.round(zoom*100)+"%"}
function zoomAt(f,sx,sy){const nz=Math.min(3,Math.max(.3,zoom*f));panX=sx-(sx-panX)*nz/zoom;panY=sy-(sy-panY)*nz/zoom;zoom=nz;tween=null;updZ()}
function focus(id){if(V3){V3.focus(id);return}const z=ZM[id];const c=P((z.x0+z.x1)/2,(z.y0+z.y1)/2,0);const tz=Math.max(zoom,CW<640?.9:1.15);tween={z:tz,x:CW/2-c[0]*tz,y:CHh/2-c[1]*tz+30}}
const toWorld=(sx,sy)=>{const wx=(sx-panX)/zoom,wy=(sy-panY)/zoom,a=(wx-OX)/16,b=(wy-OY)/8;return[(a+b)/2,(b-a)/2]};

/* tương tác: kéo, chụm, cuộn */
const ptr=new Map();let dragMoved=0,pinch0=null;
cv.addEventListener("pointerdown",e=>{cv.setPointerCapture(e.pointerId);ptr.set(e.pointerId,[e.offsetX,e.offsetY]);dragMoved=0;tween=null;cv.classList.add("drag");
  if(ptr.size===2){const[a,b]=[...ptr.values()];pinch0={d:Math.hypot(a[0]-b[0],a[1]-b[1]),z:zoom}}});
cv.addEventListener("pointermove",e=>{if(!ptr.has(e.pointerId))return;const p=ptr.get(e.pointerId);const dx=e.offsetX-p[0],dy=e.offsetY-p[1];
  if(ptr.size===1){panX+=dx;panY+=dy;dragMoved+=Math.abs(dx)+Math.abs(dy)}ptr.set(e.pointerId,[e.offsetX,e.offsetY]);
  if(ptr.size===2&&pinch0){const[a,b]=[...ptr.values()];const d=Math.hypot(a[0]-b[0],a[1]-b[1]);const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;zoomAt(pinch0.z*d/pinch0.d/zoom,mx,my);dragMoved=99}});
function up(e){if(ptr.size===1&&dragMoved<6){const[x,y]=toWorld(e.offsetX,e.offsetY);const z=Z.find(z=>x>=z.x0&&x<z.x1&&y>=z.y0&&y<z.y1);if(z){if(!ADMIN()&&view(z).go)goRoom(z.id);else select(z.id,false)}}
  ptr.delete(e.pointerId);if(ptr.size<2)pinch0=null;if(!ptr.size)cv.classList.remove("drag")}
cv.addEventListener("pointerup",up);cv.addEventListener("pointercancel",e=>{ptr.delete(e.pointerId);pinch0=null;cv.classList.remove("drag")});
cv.addEventListener("wheel",e=>{e.preventDefault();zoomAt(Math.exp(-e.deltaY*.0015),e.offsetX,e.offsetY)},{passive:false});
$("#zin").onclick=()=>zoomAt(1.25,CW/2,CHh/2);$("#zout").onclick=()=>zoomAt(.8,CW/2,CHh/2);$("#fit").onclick=()=>{if(V3){V3.vuaKhung();return}tween=null;fit()};
let nightManual=false;
function setNight(v){night=v;if(V3)V3.dem(night);const b=$("#night");b.classList.toggle("on",night);b.textContent=night?"Ngày":"Đêm";cacheS=0}
$("#night").onclick=e=>{nightManual=true;night=!night;e.currentTarget.classList.toggle("on",night);e.currentTarget.textContent=night?"Ngày":"Đêm";cacheS=0};


/* ---------- tiện ích DOM: mọi chữ vào trang đều qua textContent ---------- */
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=String(text);return e}
function clear(n){while(n.firstChild)n.removeChild(n.firstChild);return n}

/* ---------- giờ thật (Việt Nam) ---------- */
const TZ="Asia/Ho_Chi_Minh";
function vn(d){d=d||new Date();const p={};new Intl.DateTimeFormat("en-GB",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",weekday:"short",hour12:false}).formatToParts(d).forEach(x=>p[x.type]=x.value);
  const h=+p.hour%24,m=+p.minute;return{date:`${p.year}-${p.month}-${p.day}`,h,m,min:h*60+m,dow:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(p.weekday),hm:`${String(h).padStart(2,"0")}:${p.minute}`}}
const DOWVN=["Chủ nhật","Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy"];
function tienGon(x){x=Number(x)||0;if(x>=1e9)return(Math.round(x/1e7)/100).toString().replace(".",",")+" tỷ";return Math.round(x/1e6)+" triệu"}
function soGon(x){return String(Math.round((Number(x)||0)*100)/100).replace(".",",")}
const KHUNG={sang:"Sáng (8–11h)",trua:"Trưa (11–14h)",chieu:"Chiều (14–17h)",toi:"Tối (18–20h)"}; // khớp scripts/aln-callback.js

/* ---------- nhật ký ---------- */
const EV=[];let feedFilter="all";
function log(zone,text,kind){EV.unshift({zone,text,kind:kind||"",t:vn().hm});if($("#nganHd").hidden){hdMoi++;capHuy()}if(EV.length>80)EV.pop();ZM[zone].act=text;const a=document.getElementById("act-"+zone);if(a)a.textContent=text;renderFeed()}
function renderFeed(){const box=$("#feed");if(!box)return;clear(box);const list=EV.filter(e=>feedFilter==="all"||e.kind==="can");$("#evCount").textContent=EV.length+" hoạt động";
  if(!list.length){box.appendChild(el("div","empty",feedFilter==="can"?"Chưa có việc nào cần anh xử lý.":"Văn phòng vừa mở cửa."));return}
  // gộp các dòng trùng nhau (lời chào lặp lại): giữ lần mới nhất, ghi số lần
  const gop=[],idx=new Map();list.forEach(e=>{const k=e.zone+"|"+e.text;if(idx.has(k)){idx.get(k).n++;return}const g={e,n:1};idx.set(k,g);gop.push(g)});
  gop.slice(0,40).forEach(({e,n})=>{const z=ZM[e.zone];const d=el("div","ev");const h=el("div","h");const dot=el("i");dot.style.background=z.c;h.appendChild(dot);h.appendChild(el("span","",zname(z)));
    if(n>1)h.appendChild(el("span","lap","×"+n));
    if(e.kind==="that")h.appendChild(el("span","chip real","THẬT"));if(e.kind==="can")h.appendChild(el("span","chip can","CẦN ANH"));h.appendChild(el("time","",e.t));d.appendChild(h);d.appendChild(el("p","",e.text));box.appendChild(d)})}
document.querySelectorAll(".tab").forEach(t=>t.addEventListener("click",()=>{feedFilter=t.dataset.f;document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("on",x===t));renderFeed()}));

/* ---------- hành vi ---------- */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function moveTo(c,x,y,ep){if(c.tiep&&!ep)return Promise.resolve();return new Promise(res=>{c.path=findPath(c.x,c.y,x,y);c.res=res;if(!c.path.length)res()})}
const home=c=>moveTo(c,c.hx,c.hy).then(()=>{c.facing=!!c.faceViewer});
function say(c,text,ms,kind){ms=ms||3600;c.say=text;c.sayUntil=now+ms;log(c.zone,cname(c)+": "+text,kind);return sleep(ms)}
const visible=c=>!c.hidden&&!(c.adminOnly&&!ADMIN())&&!(c.me&&ADMIN());

/* ---------- "Bạn cần gì?": chủ nhà vào trang với nhiều lý do, mỗi lý do đi thẳng tới đúng phòng ---------- */
const NHU_CAU=[["tiep","Tư vấn thiết kế",1],["gd","Tính phí thiết kế"],["ceo","Quy trình 4 bước"],["dt","Dự toán xây nhà"],["kho","Hồ sơ mẫu"],["tk","Thử mặt bằng"],["sanh","Hỏi MyMy"],["kgn","Không gian Nhà"]];
function veNhuCau(){const box=$("#canGi");if(!box)return;clear(box);const vai=document.body.dataset.vai;box.hidden=vai!=="chu-nha";if(box.hidden)return;
  box.appendChild(el("span","cg-t","Bạn cần gì?"));const ds=el("div","cg-ds");
  NHU_CAU.forEach(([id,ten,chinh])=>{const z=ZM[id];if(!z||!view(z).go)return;const b=el("button","cg"+(chinh?" chinh":""),ten);b.type="button";b.dataset.z=id;
    b.addEventListener("click",()=>{try{(window.dataLayer=window.dataLayer||[]).push({event:"aln_vp_nhu_cau",phong:id})}catch(e){}goRoom(id)});ds.appendChild(b)});
  box.appendChild(ds)}

/* ---------- ngăn kéo: Các phòng, Hoạt động (nổi trên mô hình) ---------- */
let hdMoi=0;function capHuy(){const b=$("#hdMoi");if(!b)return;b.hidden=!hdMoi;b.textContent=hdMoi>99?"99+":String(hdMoi)}
function moNgan(id,mo){const n=$("#"+id),nut=document.querySelector('[aria-controls="'+id+'"]');if(mo==null)mo=n.hidden;
  if(mo)document.querySelectorAll(".ngan").forEach(x=>{if(x.id!==id){x.hidden=true;const k=document.querySelector('[aria-controls="'+x.id+'"]');if(k)k.setAttribute("aria-expanded","false")}});
  n.hidden=!mo;if(nut)nut.setAttribute("aria-expanded",String(mo));if(mo&&id==="nganHd"){hdMoi=0;capHuy()}}
$("#nutPhong").addEventListener("click",()=>moNgan("nganPhong"));$("#nutHd").addEventListener("click",()=>moNgan("nganHd"));
document.querySelectorAll(".ngan [data-dong]").forEach(b=>b.addEventListener("click",()=>moNgan(b.closest(".ngan").id,false)));
document.addEventListener("keydown",e=>{if(e.key==="Escape")document.querySelectorAll(".ngan").forEach(x=>{if(!x.hidden)moNgan(x.id,false)})});

/* ---------- panel trái: danh sách phòng ---------- */
const zonesEl=$("#zones"),detailEl=$("#detail");
function renderZones(){clear(zonesEl);Z.forEach(z=>{const v=view(z);const b=el("button","zone"+(sel===z.id?" sel":"")+(v.st==="noi"?" noi":""));b.type="button";b.dataset.z=z.id;
  b.style.setProperty("--zc",z.c);const dot=el("span","dot");dot.style.background=z.c;b.appendChild(dot);b.appendChild(el("span","nm",v.name));const pill=el("span","pill "+v.st);pill.appendChild(el("i"));pill.appendChild(document.createTextNode(ST[v.st]));b.appendChild(pill);
  const act=el("span","act",z.act||v.who);act.id="act-"+z.id;b.appendChild(act);b.addEventListener("click",()=>{select(z.id,true);moNgan("nganPhong",false)});zonesEl.appendChild(b)})}
function select(id,move){sel=id;const z=ZM[id],v=view(z);clear(detailEl);
  const pill=el("span","pill "+v.st);pill.appendChild(el("i"));pill.appendChild(document.createTextNode(ST[v.st]));detailEl.appendChild(pill);
  detailEl.appendChild(el("h3","",v.name));detailEl.appendChild(el("div","who",v.who));
  const people=CH.filter(c=>c.zone===id&&visible(c)&&c.id!=="KH"&&!c.me).map(cname);if(people.length)detailEl.appendChild(el("div","who","Trong phòng: "+people.join(" · ")));
  if(v.items.length){const ul=el("ul");v.items.forEach(i=>ul.appendChild(el("li","",i)));detailEl.appendChild(ul)}
  if(v.go){const b=el("button","btn pri");if(!ADMIN())b.appendChild(el("span","pre","Đi tới phòng · "));b.appendChild(document.createTextNode(v.cta));b.type="button";b.addEventListener("click",()=>goRoom(id));detailEl.appendChild(b)}
  zonesEl.querySelectorAll(".zone").forEach(b=>b.classList.toggle("sel",b.dataset.z===id));if(move)focus(id)}

/* ---------- đi vào phòng: nhân vật "Bạn" đi tới, rồi mở trang thật ---------- */
const DOOR={gd:[11.6,11.2],tiep:[14.9,10.95],ceo:[13,5.4],kho:[7.4,5.6],kd:[2.5,5.6],pl:[18.4,5.2],dt:[4,11.3],tk:[21,11.2],sanh:[13,16.4],tt:[5.4,16.4],kgn:[20.6,17],cho:[23,5.6]};
const AGENT={gd:"N",tiep:"N",ceo:"CEO",kho:"DB",kd:"TP",pl:"ML",dt:"DT",tk:"KTV",sanh:"MM",tt:"BAN",kgn:"BAN"};
const CHAO={
 gd:"Đơn giá thiết kế niêm yết theo m², anh/chị tự tính được ngay.",
 tiep:"Chào anh/chị! Anh/chị gửi thông tin khu đất, tôi liên hệ tư vấn trong 24 giờ làm việc.",
 ceo:"Bốn bước, nghiệm thu bước nào trả bước đó.",
 kho:"Mời anh/chị xem hồ sơ mẫu 4 bộ môn.",
 pl:"Hợp đồng ký trực tiếp với ALN, thanh toán theo 4 bước.",
 dt:"Anh/chị nhập kích thước lô, em tính ngay.",
 tk:"Nhập kích thước lô và nhu cầu, xem thử 3 phương án.",
 sanh:"Chào anh/chị, em là MyMy! Em mở khung trò chuyện nhé.",
 tt:"Mình vào phòng Cộng tác viên.",
 kgn:"Mình vào Không gian Nhà."
};
let goingTo=null;
async function goRoom(id){const z=ZM[id],v=view(z);if(!v.go)return;
  if(ADMIN()&&v.tab){window.open(alnUrl(v.go),"_blank","noopener");log(id,"Mở "+v.name+" ở tab mới","");return}
  select(id,false);
  if(id!=="tiep"&&C.N.tiep){C.N.tiep=false;home(C.N).finally(()=>{C.N.busy=false})}
  if(!ADMIN()){const me=C.BAN;if(me.hidden){me.hidden=false;me.x=13;me.y=20.6}goingTo=id;
    const ag=C[AGENT[id]];
    // Phòng tiếp khách: KTS ra bàn tư vấn ngay khi khách bắt đầu đi tới (khách tới là KTS đã chờ sẵn)
    const ktsRa=id==="tiep"&&ag&&visible(ag)?(ag.busy=true,ag.tiep=true,moveTo(ag,14.15,9.45,true).then(()=>{ag.facing=true})):null;
    const[dx,dy]=DOOR[id];await moveTo(me,dx,dy);if(goingTo!==id)return;
    if(ktsRa)ktsRa.then(()=>{if(goingTo==="tiep"&&CHAO.tiep)say(ag,CHAO.tiep,4200)});
    else if(ag&&visible(ag)&&CHAO[id])say(ag,CHAO[id],3800);}
  openPanel(id)}

/* ---------- khung trang thật + nghe sự kiện thật trong khung ---------- */
const panel=$("#room"),frame=$("#roomFrame");let frameNeo="",watchTimer=null,dlSeen=0,curRoom=null,lastTinh=0,tinhTimer=null;
function openPanel(id){const v=view(ZM[id]);curRoom=id;$("#roomName").textContent=v.name;const full=$("#roomFull");full.href=alnUrl(v.go);
  panel.hidden=false;document.body.classList.add("co-phong");const u=alnUrl(v.go),h=u.indexOf("#");frameNeo=h>=0?u.slice(h+1):"";frame.src=h>=0?u.slice(0,h):u;$("#roomToast").hidden=true;
  document.querySelectorAll(".ngan").forEach(x=>moNgan(x.id,false));canhMoHinh();
  log(id,(ADMIN()?"Mở ":"Bạn vào ")+v.name,"")}
// Khi khung phòng mở, phần mô hình còn lộ bên trái là "cửa sổ nhìn vào phòng": dời tâm hình về đó.
function canhMoHinh(){if(!V3||!V3.lech)return;if(panel.hidden){V3.lech(0);return}
  const r=panel.getBoundingClientRect(),sr=stage.getBoundingClientRect(),con=r.left-sr.left;
  if(getComputedStyle(panel).position==="fixed"||con<160){V3.lech(0);return}
  V3.lech(sr.width/2-con/2);if(curRoom)V3.focus(curRoom)}
window.addEventListener("resize",()=>{if(!panel.hidden)canhMoHinh()});
function closePanel(){panel.hidden=true;document.body.classList.remove("co-phong");if(V3&&V3.lech)V3.lech(0);clearInterval(watchTimer);watchTimer=null;frame.src="about:blank";curRoom=null;
  if(!ADMIN()&&!C.BAN.hidden)moveTo(C.BAN,13,18.4);
  if(C.N.tiep){C.N.tiep=false;home(C.N).finally(()=>{C.N.busy=false})}}
$("#roomClose").addEventListener("click",closePanel);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!panel.hidden)closePanel()});
frame.addEventListener("load",()=>{dlSeen=0;let w=null;try{w=frame.contentWindow;dlSeen=(w&&w.dataLayer)?w.dataLayer.length:0}catch(e){w=null}
  if(w&&frameNeo){const neo=frameNeo;let lan=0;const cuon=()=>{try{const d=w.document.getElementById(neo);if(d)w.scrollTo({top:d.getBoundingClientRect().top+w.scrollY-8,behavior:"instant"})}catch(e){}if(++lan<4)setTimeout(cuon,500)};cuon()}
  if(window.innerWidth>1000)window.scrollTo(0,0);
  clearInterval(watchTimer);if(!w||frame.src==="about:blank")return;
  watchTimer=setInterval(()=>{let dl;try{dl=frame.contentWindow&&frame.contentWindow.dataLayer}catch(e){return}if(!dl)return;
    for(;dlSeen<dl.length;dlSeen++){const ev=dl[dlSeen];if(ev&&typeof ev==="object"&&typeof ev.event==="string")onFrameEvent(ev)}},400)});
function toast(who,text){const t=$("#roomToast");clear(t);t.appendChild(el("b","",who));t.appendChild(document.createTextNode(" "+text));t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>{t.hidden=true},9000)}
function phanHoi(c,text,kind){if(!ADMIN()&&c===C.TP)c=C.MM;if(!visible(c)){const tp=C.TP;c=(ADMIN()&&visible(tp))?tp:C.MM}say(c,text,5200,kind);toast(cname(c)+":",text)}
function onFrameEvent(ev){const n=ev.event;
  if(n==="aln_du_toan_tinh"){clearTimeout(tinhTimer);tinhTimer=setTimeout(baoDuToan,1300);return}
  if(n==="aln_lead_submit"||n==="aln_luu_zalo"){
    phanHoi(C.TP,ADMIN()?"Lead mới vừa vào danh bạ (chính anh vừa gửi thử).":"Đã nhận thông tin, em báo KTS Trần Long ngay.","that");
    if(!ADMIN()){setTimeout(()=>{const n2=C.N;if(visible(n2))phanHoi(n2,"Tôi sẽ gọi lại từ số 0909 829 696.","that");else phanHoi(C.TP,"KTS Trần Long sẽ gọi lại trong giờ làm việc, từ số 0909 829 696.","that")},5600);
      if(visible(C.TP)&&!C.TP.busy&&visible(C.N)){C.TP.busy=true;moveTo(C.TP,12.4,10.6).then(()=>sleep(2500)).then(()=>home(C.TP)).finally(()=>{C.TP.busy=false})}}
    return}
  if(n==="aln_khung_gio_chon"){const k=KHUNG[ev.khung_gio]||"khung giờ bạn chọn";phanHoi(visible(C.N)?C.N:C.TP,"Đã ghi lịch: gọi lại buổi "+k+".","that");if(!ADMIN())luuHen(k);return}
  if(n==="aln_otp_nho_kts"){phanHoi(visible(C.N)?C.N:C.TP,"Đã nhận yêu cầu nhờ KTS xem giúp bảng dự toán.","that");return}}
function baoDuToan(){let e=null;try{e=frame.contentWindow.__lastEstimate}catch(x){e=null}if(!e||!e.result)return;const i=e.inputs||{};
  const san=e.modelKey==="thi_biet_thu_vuon_mai_thai"?"biệt thự vườn 1 tầng":(Number(i.n)||"?")+" sàn";
  const txt=`Lô ${soGon(i.w1)} × ${soGon(i.l1)} m, ${san}: khoảng ${tienGon(e.result.totalChuaVat)} chưa VAT (phần thô).`;
  if(Date.now()-lastTinh<1500)return;lastTinh=Date.now();phanHoi(C.DT,txt,"that")}

/* lịch hẹn của chính người xem — chỉ nằm trên trình duyệt của họ */
const KEY_HEN="aln_vp_hen";
function luuHen(k){const h={k,luc:new Date().toISOString()};try{localStorage.setItem(KEY_HEN,JSON.stringify(h))}catch(e){}renderHen()}
function renderHen(){const box=$("#hen");if(!box)return;clear(box);if(ADMIN()){box.hidden=true;return}let h=null;try{h=JSON.parse(localStorage.getItem(KEY_HEN)||"null")}catch(e){h=null}
  if(!h){box.hidden=true;return}box.hidden=false;box.appendChild(el("h4","","Lịch hẹn của bạn"));
  box.appendChild(el("p","","KTS Trần Long gọi lại buổi "+h.k+", từ số 0909 829 696."));
  const d=new Date(h.luc);box.appendChild(el("p","note","Bạn chọn lúc "+vn(d).hm+" ngày "+vn(d).date.split("-").reverse().join("/")+"."))}

/* ---------- hoạt động nền (chỉ câu đúng sự thật, không có số liệu bịa) ---------- */
const AMB_PUB=[
 [["MM"],()=>say(C.MM,"Bấm vào quầy lễ tân để trò chuyện với em nhé.")],
 [["MM"],()=>say(C.MM,"Không rành điền bảng? Em điền giúp được.")],
 [["DT"],()=>say(C.DT,"Nhập kích thước lô là có số tiền ngay.")],
 [["KTV"],()=>say(C.KTV,"Đang triển khai hồ sơ kỹ thuật.")],
 [["DB"],()=>say(C.DB,"Thư viện có hồ sơ mẫu 4 bộ môn.")],
 [["CEO"],()=>say(C.CEO,"Nghiệm thu, hài lòng rồi mới trả cho bước đó.")],
 [["N"],async()=>{await moveTo(C.N,9.6,16.6);await say(C.N,"Pha cà phê trước buổi gặp chủ nhà.",2600);await home(C.N)}]
];
const AMB_ADM=[
 [["TP"],()=>say(C.TP,"Đang theo dõi lead và SLA.")],
 [["CEO"],()=>say(C.CEO,"Gõ CEO TODAY để lấy 5 dòng việc.")],
 [["MM"],()=>say(C.MM,"Đang trực web, đồng ý mới lưu số.")],
 [["KTV"],()=>say(C.KTV,"Triển khai theo phương án đã chốt.")],
 [["N"],async()=>{await moveTo(C.N,9.6,16.6);await say(C.N,"Cà phê rồi gọi khách.",2600);await home(C.N)}]
];
async function ambient(){await sleep(1500);for(;;){await sleep(3200+Math.random()*3800);if(document.hidden)continue;
  const pool=(ADMIN()?AMB_ADM:AMB_PUB).filter(([ids])=>ids.every(i=>!C[i].busy&&visible(C[i])));if(!pool.length)continue;
  const[ids,fn]=pool[Math.floor(Math.random()*pool.length)];ids.forEach(i=>C[i].busy=true);Promise.resolve(fn()).finally(()=>ids.forEach(i=>C[i].busy=false))}}

/* ---------- vẽ chữ nổi ---------- */
function bubble(g,c,sx,sy){const a=Math.min(1,(c.sayUntil-now)/300);if(a<=0)return;g.save();g.globalAlpha=a;g.font="500 11.5px 'Be Vietnam Pro',sans-serif";
  const words=c.say.split(" "),lines=[];let cur="";words.forEach(w=>{const t=cur?cur+" "+w:w;if(g.measureText(t).width>190&&cur){lines.push(cur);cur=w}else cur=t});lines.push(cur);
  const nm=cname(c);g.font="700 9px 'JetBrains Mono',monospace";const wn=g.measureText(nm.toUpperCase()).width;g.font="500 11.5px 'Be Vietnam Pro',sans-serif";
  const w=Math.max(wn+20,...lines.map(l=>g.measureText(l).width))+24,h=24+lines.length*15;const x=sx-w/2,y=sy-h-11;
  g.shadowColor="rgba(0,0,0,.45)";g.shadowBlur=14;g.shadowOffsetY=4;rr(g,x,y,w,h,10);g.fillStyle="rgba(250,246,238,.97)";g.fill();g.shadowColor="transparent";
  g.beginPath();g.moveTo(sx-6,y+h-.5);g.lineTo(sx,y+h+7);g.lineTo(sx+6,y+h-.5);g.closePath();g.fill();
  g.fillStyle=ZM[c.zone].c;rr(g,x+10,y+9,5,5,1.5);g.fill();
  g.fillStyle="#8a6a2f";g.font="700 9px 'JetBrains Mono',monospace";g.textAlign="left";g.fillText(nm.toUpperCase(),x+20,y+15);
  g.fillStyle="#1d1b17";g.font="500 11.5px 'Be Vietnam Pro',sans-serif";lines.forEach((l,i)=>g.fillText(l,x+12,y+31+i*15));g.restore()}
function tag(g,c,sx,sy){g.save();g.font="600 9.5px 'Be Vietnam Pro',sans-serif";const t=cname(c);const w=g.measureText(t).width+18;
  g.shadowColor="rgba(0,0,0,.4)";g.shadowBlur=8;g.shadowOffsetY=2;rr(g,sx-w/2,sy-17,w,16,8);g.fillStyle=c.me?"rgba(226,192,132,.97)":"rgba(14,15,18,.78)";g.fill();g.shadowColor="transparent";
  if(!c.me){g.strokeStyle="rgba(255,255,255,.12)";g.lineWidth=1;g.stroke()}
  g.beginPath();g.arc(sx-w/2+8,sy-9,2.4,0,7);g.fillStyle=c.ai?c.glow:(c.ghost?"#9b968c":"#f1c7a0");g.fill();g.fillStyle=c.me?"#1b150a":"#f3eee5";g.textAlign="left";g.fillText(t,sx-w/2+13,sy-5.5);g.restore()}
function zlabel(g,z){const[wx,wy]=P(z.x0+.35,z.y0+.35,0);nhanPhong(g,z,wx*zoom+panX,wy*zoom+panY,zoom<.55)}
function nhanPhong(g,z,sx,sy,gon){const v=view(z);g.save();g.font="600 10px 'Be Vietnam Pro',sans-serif";const chon=sel===z.id;
  const t=gon?v.name.split(" ·")[0]:v.name;const w=g.measureText(t).width+24;
  g.shadowColor="rgba(0,0,0,.45)";g.shadowBlur=10;g.shadowOffsetY=3;rr(g,sx-7,sy-9,w,19,9.5);g.fillStyle=chon?"rgba(226,192,132,.97)":"rgba(14,15,18,.74)";g.fill();g.shadowColor="transparent";
  g.strokeStyle=chon?"rgba(255,255,255,.4)":"rgba(214,179,112,.28)";g.lineWidth=1;g.stroke();
  g.beginPath();g.arc(sx+3,sy+.5,2.8,0,7);g.fillStyle=v.st==="live"?"#5fcca2":v.st==="trial"?"#e0b863":"#7c818a";g.fill();
  g.fillStyle=chon?"#1b150a":(v.st==="noi"?"#9b968c":"#f3eee5");g.textAlign="left";g.fillText(t,sx+11,sy+4);g.restore()}

/* ---------- vòng vẽ ---------- */
let last=performance.now(),lastSec=-1;
function frameLoop(t){const dt=Math.min(.05,(t-last)/1000);last=t;now=t;const sec=Math.floor(t/1000);if(sec!==lastSec){lastSec=sec;$("#clock").textContent=vn().hm}
  CH.forEach(c=>{if(!c.path.length)return;const[tx,ty]=c.path[0];const dx=tx-c.x,dy=ty-c.y,d=Math.hypot(dx,dy),st=(c.me?3.2:2.4)*dt;
    if(d<=st){c.x=tx;c.y=ty;c.path.shift();if(!c.path.length&&c.res){const r=c.res;c.res=null;r()}}else{c.x+=dx/d*st;c.y+=dy/d*st;c.facing=(dx+dy)>.05}});
  if(V3){requestAnimationFrame(frameLoop);return} // bản 3D tự vẽ (van-phong-3d.js); ở đây chỉ chạy người đi lại
  if(tween){const k=1-Math.pow(.001,dt);zoom+=(tween.z-zoom)*k;panX+=(tween.x-panX)*k;panY+=(tween.y-panY)*k;updZ();if(Math.abs(tween.x-panX)<.5&&Math.abs(tween.z-zoom)<.002)tween=null}
  const want=Math.min(3,Math.max(1,Math.round(zoom*DPR*4)/4));if(!cacheS||(want!==cacheS&&t-lastBuild>220))buildStatic(want);
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);
  ctx.setTransform(DPR*zoom,0,0,DPR*zoom,DPR*panX,DPR*panY);ctx.drawImage(cache,0,0,cache.width/cacheS,cache.height/cacheS);
  Z.forEach(z=>{if(view(z).st==="noi"){ctx.save();poly(ctx,[P(z.x0,z.y0),P(z.x1,z.y0),P(z.x1,z.y1),P(z.x0,z.y1)],"rgba(10,12,16,.38)");ctx.restore()}});
  if(sel){const z=ZM[sel];ctx.save();ctx.setLineDash([6,4]);poly(ctx,[P(z.x0,z.y0),P(z.x1,z.y0),P(z.x1,z.y1),P(z.x0,z.y1)],"rgba(201,163,91,.10)",BRASS,2/zoom);ctx.restore()}
  const items=F.slice();CH.forEach(c=>{if(visible(c))items.push({key:c.x+c.y+.08,draw:g=>drawChar(g,c)})});items.sort((a,b)=>a.key-b.key);items.forEach(i=>i.draw(ctx));
  if(visible(C.BAN)){const[x,y]=P(C.BAN.x,C.BAN.y,0);ctx.save();ctx.strokeStyle="rgba(201,163,91,"+(.5+.4*Math.sin(t/300))+")";ctx.lineWidth=1.6;ctx.beginPath();ctx.ellipse(x,y,11,5.5,0,0,7);ctx.stroke();ctx.restore()}
  if(night){ctx.fillStyle="rgba(6,10,28,.5)";ctx.fillRect(-200,-200,worldW+400,worldH+400);ctx.save();ctx.globalCompositeOperation="lighter";
    GLOW.forEach(o=>{const[x,y]=P(o.x,o.y,o.z);const gr=ctx.createRadialGradient(x,y,0,x,y,o.r);gr.addColorStop(0,"rgba("+o.c+",.38)");gr.addColorStop(1,"rgba("+o.c+",0)");ctx.fillStyle=gr;ctx.fillRect(x-o.r,y-o.r,o.r*2,o.r*2)});ctx.restore()}
  ctx.setTransform(DPR,0,0,DPR,0,0);
  Z.forEach(z=>zlabel(ctx,z));
  CH.forEach(c=>{if(!visible(c))return;const[wx,wy]=P(c.x,c.y,40);const sx=wx*zoom+panX,sy=wy*zoom+panY;if(c.sayUntil>now)bubble(ctx,c,sx,sy);else if(zoom>.8||c.me)tag(ctx,c,sx,sy)});
  requestAnimationFrame(frameLoop)}

/* ---------- giờ làm việc thật: ai có mặt ---------- */
const HUMANS=["N","L","ML","KTV","KS","DN"];
function shouldBeIn(id,t){if(t.dow===0)return false;if(["KTV","KS","DN"].includes(id))return t.dow<=5&&t.min>=8*60&&t.min<17*60;return t.min>=7*60+30&&t.min<18*60}
function dayState(t){if(t.dow===0)return"Chủ nhật · MyMy và các trợ lý vẫn trực";if(t.min<7*60+30)return"Trước giờ làm · MyMy vẫn trực";if(t.min>=18*60)return"Ngoài giờ · MyMy vẫn trực";if(t.min>=12*60&&t.min<13*60)return"Nghỉ trưa";return DOWVN[t.dow]+" · giờ làm việc"}
function presence(initial){const t=vn();HUMANS.forEach(id=>{const c=C[id];const want=shouldBeIn(id,t);
    if(initial){c.hidden=!want;c.x=c.hx;c.y=c.hy;return}
    if(c.busy)return;
    if(want&&c.hidden){c.hidden=false;c.x=13;c.y=20.6;c.busy=true;home(c).finally(()=>{c.busy=false})}
    else if(!want&&!c.hidden){c.busy=true;moveTo(c,13,20.8).then(()=>{c.hidden=true;c.x=c.hx;c.y=c.hy}).finally(()=>{c.busy=false})}});
  $("#dayState").textContent=dayState(t);
  if(!nightManual){const n=t.min>=18*60||t.min<6*60;if(n!==night)setNight(n)}}

/* ---------- quản trị: dữ liệu thật ----------
   houses trước C1: onSnapshot (tức thời) — khách lưu dự toán, chọn giờ gọi.
   contacts: segmentContacts (callable, Founder) mỗi 60 giây — khách mới, đã gọi, đổi giai đoạn. */
const LIVE={fb:null,houses:{},housesReady:false,contacts:{},contactsReady:false,unsub:null,poll:null};
const duoi4=p=>{p=String(p||"").replace(/\D/g,"");return p?"••"+p.slice(-4):"••??"};
async function startAdmin(){setGate("Đang kiểm tra đăng nhập…");
  try{LIVE.fb=await import("../firebase-config.js")}catch(e){setGate("Không tải được Firebase. Tải lại trang.");return}
  const fb=LIVE.fb;
  fb.onAuthStateChanged(fb.auth,async u=>{if(MODE!=="quan-tri")return;
    if(!u){setGate("Cần đăng nhập tài khoản Founder.",true);return}
    let role=null;try{const s=await fb.getDoc(fb.doc(fb.db,"users",u.uid));role=s.exists()?s.data().role:null}catch(e){role=null}
    if(role!=="founder"){setGate("Tài khoản này không có quyền quản trị.",true);return}
    setGate(null);listenHouses();pollContacts();LIVE.poll=setInterval(()=>{if(!document.hidden)pollContacts()},60000)})}
function stopAdmin(){if(LIVE.unsub){LIVE.unsub();LIVE.unsub=null}clearInterval(LIVE.poll);LIVE.poll=null;LIVE.housesReady=false;LIVE.contactsReady=false;LIVE.houses={};LIVE.contacts={}}
function setGate(msg,login){const g=$("#gate");if(!msg){g.hidden=true;return}g.hidden=false;clear(g);g.appendChild(el("p","",msg));
  if(login){const a=el("a","btn pri","Đăng nhập Founder");a.href="/login.html";g.appendChild(a);g.appendChild(el("p","note","Đăng nhập xong, quay lại trang này và chọn lại vai Quản trị."))}}
function listenHouses(){const fb=LIVE.fb;if(LIVE.unsub)return;
  const q=fb.query(fb.collection(fb.db,"houses"),fb.where("trang_thai","==","truoc_c1"));
  LIVE.unsub=fb.onSnapshot(q,snap=>{const first=!LIVE.housesReady;
    snap.docChanges().forEach(ch=>{const id=ch.doc.id,h=ch.doc.data()||{},old=LIVE.houses[id];LIVE.houses[id]=h;if(first)return;
      if(ch.type==="added")suKien("dt",C.DT,"Chủ nhà "+khachCua(h)+" vừa lưu dự toán.");
      else if(ch.type==="modified"&&h.khung_gio_goi&&(!old||old.khung_gio_goi!==h.khung_gio_goi))suKien("gd",C.TP,"Chủ nhà "+khachCua(h)+" hẹn gọi buổi "+(KHUNG[h.khung_gio_goi]||h.khung_gio_goi)+".",true)});
    LIVE.housesReady=true;renderHenAdmin()},err=>{log("dt","Không đọc được hồ sơ dự toán: "+(err&&err.code||"lỗi"),"")})}
let repollT=null;function repollSoon(){if(repollT)return;repollT=setTimeout(()=>{repollT=null;pollContacts()},3000)}
function khachCua(h){if(h&&h.contact_id&&!LIVE.contacts[h.contact_id]&&LIVE.contactsReady)repollSoon();const c=h&&h.contact_id&&LIVE.contacts[h.contact_id];return c?duoi4(c.phone_normalized):"(chưa rõ số)"}
async function pollContacts(){const fb=LIVE.fb;let items=[];
  try{const m=await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js");const fn=m.httpsCallable(m.getFunctions(fb.app,"asia-southeast1"),"segmentContacts");
    const r=await fn({loai_lien_he:"khach_hang"});items=(r.data&&r.data.items||[]).filter(it=>!it.la_test)}catch(e){log("kd","Không tải được danh bạ: "+(e&&e.message||"lỗi"),"");return}
  const first=!LIVE.contactsReady;const homNay=vn().date;let moi=0,choGoi=0;
  items.forEach(it=>{const old=LIVE.contacts[it.id];LIVE.contacts[it.id]=it;
    const dau=(it.lich_su_nguon||[]).reduce((m,h)=>Math.min(m,h.thoi_gian||Infinity),Infinity);if(dau!==Infinity&&vn(new Date(dau)).date===homNay)moi++;
    if(!it.phan_hoi_dau_luc&&(!it.giai_doan||it.giai_doan==="lead"))choGoi++;
    if(first)return;
    if(!old){khachMoi(it);return}
    if((it.phan_hoi_gan_nhat_luc||0)>(old.phan_hoi_gan_nhat_luc||0))suKien("gd",C.N,"Đã gọi "+duoi4(it.phone_normalized)+(it.phan_hoi_gan_nhat_ket_qua?" · "+it.phan_hoi_gan_nhat_ket_qua:"")+".");
    if(it.giai_doan!==old.giai_doan)suKien("kd",C.TP,duoi4(it.phone_normalized)+" chuyển sang giai đoạn "+(it.giai_doan||"chưa gán")+".")});
  LIVE.contactsReady=true;$("#kMoi").textContent=moi;$("#kCho").textContent=choGoi;renderHenAdmin();
  if(first)log("kd","Đã đọc danh bạ thật: "+items.length+" khách, "+choGoi+" đang chờ gọi.","that")}
function suKien(zone,c,text,can){if(visible(c))say(c,text,5200,can?"can":"that");else log(zone,text,can?"can":"that")}
async function khachMoi(it){const nguon=it.nguon||"không rõ nguồn";const K=C.KH;suKien("kd",C.TP,"Khách mới "+duoi4(it.phone_normalized)+" từ "+nguon+". Anh gọi sớm nhé.",true);
  if(K.busy)return;K.busy=true;K.hidden=false;K.x=13;K.y=20.6;try{await moveTo(K,13,16.4);await sleep(2500);await moveTo(K,13,20.8)}finally{K.hidden=true;K.busy=false}}
function renderHenAdmin(){const box=$("#hen");if(!ADMIN()||!box)return;clear(box);
  const list=Object.entries(LIVE.houses).filter(([,h])=>h.khung_gio_goi).map(([id,h])=>({id,h,at:h.khung_gio_goi_at&&h.khung_gio_goi_at.toMillis?h.khung_gio_goi_at.toMillis():0})).sort((a,b)=>b.at-a.at).slice(0,8);
  box.hidden=false;box.appendChild(el("h4","","Lịch hẹn gọi (chủ nhà tự chọn)"));
  if(!list.length){box.appendChild(el("p","note",LIVE.housesReady?"Chưa có chủ nhà nào chọn giờ.":"Đang tải…"));return}
  const ul=el("ul","hen-list");list.forEach(x=>{const li=el("li");li.appendChild(el("b","",KHUNG[x.h.khung_gio_goi]||x.h.khung_gio_goi));li.appendChild(el("span","",khachCua(x.h)));
    if(x.at){const d=vn(new Date(x.at));li.appendChild(el("time","",d.hm+" "+d.date.slice(8)+"/"+d.date.slice(5,7)))}ul.appendChild(li)});box.appendChild(ul)}

/* ---------- vai ---------- */
const KEY_VAI="aln_vp_vai";
function setMode(m,initial){if(!["chu-nha","ctv","quan-tri"].includes(m))m="chu-nha";const was=MODE;MODE=m;try{localStorage.setItem(KEY_VAI,m)}catch(e){}
  document.body.dataset.vai=m;setTimeout(veNhuCau,0);$("#vaiTen").textContent={"chu-nha":"Chủ nhà","ctv":"Cộng tác viên","quan-tri":"Quản trị"}[m];
  $("#adminKpis").hidden=m!=="quan-tri";$("#tabCan").hidden=m!=="quan-tri";if(m!=="quan-tri"&&feedFilter==="can"){feedFilter="all";document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("on",x.dataset.f==="all"))}
  cacheS=0;if(V3)V3.capNhatVai();if(!panel.hidden)closePanel();
  if(was==="quan-tri"&&m!=="quan-tri"){stopAdmin();setGate(null)}
  if(m==="quan-tri")startAdmin();else{C.BAN.hidden=true;C.BAN.x=13;C.BAN.y=20.6}
  renderZones();select(m==="ctv"?"tt":m==="quan-tri"?"kd":"sanh",!initial);renderHen();renderFeed();
  $("#picker").hidden=true;
  if(m==="ctv"&&!initial)goRoom("tt");}
document.querySelectorAll("[data-vai]").forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.vai,false)));
$("#doiVai").addEventListener("click",()=>{$("#picker").hidden=false});
$("#pickerClose").addEventListener("click",()=>{$("#picker").hidden=true});

/* ---------- phối cảnh 3D ----------
   van-phong-3d.js nạp khi cần (three.js từ jsDelivr, importmap trong index.html).
   Không có WebGL hoặc tải lỗi → giữ bản 2D. Nhớ lựa chọn ở localStorage aln_vp_3d. */
let V3=null, dang3D=null;
const KEY_3D="aln_vp_3d";
function coWebGL(){try{const c=document.createElement("canvas");return!!(c.getContext("webgl2")||c.getContext("webgl"))}catch(e){return false}}
function muon3D(){let v=null;try{v=localStorage.getItem(KEY_3D)}catch(e){v=null}const q=new URLSearchParams(location.search).get("che");if(q==="2d")return false;if(q==="3d")return coWebGL();return v!=="0"&&coWebGL()}
function chonPhong(id){const z=ZM[id];if(!ADMIN()&&view(z).go)goRoom(id);else select(id,false)}
const API3={Z,ZM,C,CH,L3,DOOR,view,visible,cname,atHome,chonPhong,bubble,tag,nhanPhong,bangTuong,
  phongMo:()=>!panel.hidden,get now(){return now},get night(){return night},get sel(){return sel}};
function hienGoiY(){const h=$("#hint");h.classList.remove("an");clearTimeout(hienGoiY._t);hienGoiY._t=setTimeout(()=>h.classList.add("an"),8000)}
function nut3D(){const b=$("#nut3d");b.textContent=V3?"Xem 2D":"Xem 3D";b.classList.toggle("on",!!V3);stage.classList.toggle("che-3d",!!V3);
  hienGoiY();$("#hint").textContent=V3?"Kéo để xoay, cuộn hoặc chụm hai ngón để phóng to. Bấm vào một phòng để đi tới.":"Bấm vào một phòng: nhân vật của bạn đi tới và mở công cụ thật của phòng đó."}
async function bat3D(on){
  if(!on){if(V3){V3.dong();V3=null}cv.hidden=false;try{localStorage.setItem(KEY_3D,"0")}catch(e){}cacheS=0;nut3D();return}
  if(V3||dang3D)return;const b=$("#nut3d");b.disabled=true;b.textContent="Đang dựng 3D…";
  dang3D=(async()=>{try{const m=await import("./van-phong-3d.js?v=5");V3=await m.mo(stage,API3);cv.hidden=true;try{localStorage.setItem(KEY_3D,"1")}catch(e){}}
    catch(e){V3=null;cv.hidden=false;log("sanh","Máy này chưa mở được bản 3D, đang xem bản 2D.","")}finally{dang3D=null;b.disabled=false;nut3D()}})();return dang3D}
/* ---------- hoạt động thật, ẩn danh (hoatDongVanPhong) + lộ trình tới C4 ---------- */
const URL_HD="https://asia-southeast1-aln-platform.cloudfunctions.net/hoatDongVanPhong";
const HD={muc:[],i:0,t:null,daLog:new Set()};
function truoc(ms){const p=Math.max(0,Math.round((Date.now()-ms)/60000));if(p<10)return"vừa xong";if(p<60)return p+" phút trước";const g=Math.round(p/60);if(g<24)return g+" giờ trước";const n=Math.round(g/24);return n===1?"hôm qua":n+" ngày trước"}
async function taiHoatDong(){if(ADMIN())return;let r=null;
  try{const res=await fetch(URL_HD,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({data:{}})});if(res.ok)r=(await res.json()).result}catch(e){r=null}
  if(!r||!Array.isArray(r.muc))return;HD.muc=r.muc.filter(m=>m&&ZM[m.phong]&&typeof m.cau==="string");HD.i=0;
  HD.muc.slice().reverse().forEach(m=>{const k=m.luc_ms+m.cau;if(HD.daLog.has(k))return;HD.daLog.add(k);EV.unshift({zone:m.phong,text:m.cau+" · "+truoc(m.luc_ms),kind:"that",t:vn(new Date(m.luc_ms)).hm})});
  if(EV.length>80)EV.length=80;renderFeed();veTuan(r.tuan);veDangDien()}
function veTuan(t){const b=$("#ddTuan");if(!b)return;const a=t&&t.du_toan>=3?t.du_toan+" lượt tính dự toán":"",c=t&&t.nho_kts>=3?t.nho_kts+" chủ nhà nhờ KTS":"";
  b.textContent=a||c?"7 ngày qua: "+[a,c].filter(Boolean).join(" · "):"";b.hidden=!(a||c)}
function veDangDien(){const box=$("#dangDien");if(!box)return;clearTimeout(HD.t);
  if(!HD.muc.length||ADMIN()){box.hidden=true;return}box.hidden=false;const m=HD.muc[HD.i%HD.muc.length];
  const nd=$("#ddNd");nd.classList.remove("hien");void nd.offsetWidth;$("#ddCau").textContent=m.cau;$("#ddLuc").textContent=truoc(m.luc_ms);nd.dataset.z=m.phong;nd.classList.add("hien");
  HD.i++;HD.t=setTimeout(veDangDien,6500)}
$("#ddNd").addEventListener("click",e=>{const z=e.currentTarget.dataset.z;if(z){select(z,true)}});
document.querySelectorAll("#loTrinh [data-z]").forEach(b=>b.addEventListener("click",()=>{try{(window.dataLayer=window.dataLayer||[]).push({event:"aln_vp_lo_trinh",buoc:b.dataset.buoc})}catch(e){}goRoom(b.dataset.z)}));
$("#nut3d").addEventListener("click",()=>bat3D(!V3));
window.ALNVanPhong={bat3D,get V3(){return V3},C,ZM};

/* ---------- khởi động ---------- */
function start(){resize();presence(true);
  let vai=null;try{vai=localStorage.getItem(KEY_VAI)}catch(e){vai=null}
  const q=new URLSearchParams(location.search).get("vai");if(q)vai=q;
  setMode(vai||"chu-nha",true);
  hienGoiY();log("sanh","Văn phòng mở cửa · "+dayState(vn()),"");requestAnimationFrame(frameLoop);ambient();setInterval(presence,20000);
  if(muon3D())bat3D(true);taiHoatDong();setInterval(()=>{if(!document.hidden)taiHoatDong()},180000)}
(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(start,start);
