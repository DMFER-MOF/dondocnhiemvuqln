import { loadTasks, loadPolicies, DATA_AS_OF, PUBLISH_START } from "./data.js";

const state={
  tasks:[],policies:[],view:"overview",
  query:"",department:"",status:"",vbdhStatus:"",
  policyQuery:"",policyType:"",policyDepartment:"",policyStatus:""
};
const $=(id)=>document.getElementById(id);

function esc(v){
  return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
function liveTrackingDate(){
  return new Date().toLocaleDateString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric"});
}
function renderLiveTrackingDates(){
  document.querySelectorAll("[data-live-track-date]").forEach(el=>{el.textContent=liveTrackingDate();});
}
function statusClass(s){
  if(s==="Quá hạn") return "overdue";
  if(s==="Sắp đến hạn") return "upcoming";
  if(s==="Chưa có hạn") return "nodue";
  if(s==="Hoàn thành") return "done";
  return "notdue";
}
function policyStatusClass(s){
  if(s==="Không tiếp tục xây dựng") return "stopped";
  if(s==="Đã chuyển Vụ Pháp chế tổng hợp") return "transferred";
  return "open";
}
function counts(tasks){
  const o={total:tasks.length,done:0,open:0,overdue:0,upcoming:0,notDue:0,noDue:0};
  tasks.forEach(t=>{
    if(t.vbdh_status==="Hoàn thành") o.done++; else o.open++;
    if(t.management_status==="Quá hạn") o.overdue++;
    else if(t.management_status==="Sắp đến hạn") o.upcoming++;
    else if(t.management_status==="Chưa đến hạn") o.notDue++;
    else if(t.management_status==="Chưa có hạn") o.noDue++;
  });
  return o;
}
function policyCounts(list){
  return {
    total:list.length,
    circular:list.filter(p=>p.category==="Thông tư").length,
    agreement:list.filter(p=>p.category==="Thỏa thuận Chính phủ").length,
    decree:list.filter(p=>p.category==="Nghị định").length,
    sepOct:list.filter(p=>p.deadline==="09/2026"||p.deadline==="10/2026").length,
    special:list.filter(p=>p.tracking_status!=="Chưa ban hành").length,
    pending:list.filter(p=>p.tracking_status==="Chưa ban hành").length
  };
}
function renderDate(){
  $("todayLabel").textContent=new Date().toLocaleDateString("vi-VN",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"});
}
function renderKPIs(){
  const c=counts(state.tasks);
  const items=[
    ["Tổng nhiệm vụ",c.total,"Nhiệm vụ trích xuất từ VBDH",""],
    ["Hoàn thành",c.done,"Đã hoàn thành trên hệ thống VBDH","done"],
    ["Chưa hoàn thành",c.open,"Đang xử lý, đã phân về Phòng","open"],
    ["Cần chú ý",c.overdue+c.upcoming,"Quá hạn + sắp đến hạn","upcoming"]
  ];
  $("kpiGrid").innerHTML=items.map(x=>'<article class="kpi '+x[3]+'"><div class="kpi-label">'+esc(x[0])+'</div><div class="kpi-value">'+x[1]+'</div><div class="kpi-note">'+esc(x[2])+'</div></article>').join("");
}
function renderStatusChart(){
  const c=counts(state.tasks.filter(t=>t.vbdh_status==="Chưa hoàn thành"));
  const items=[["Quá hạn",c.overdue,"overdue"],["Sắp đến hạn",c.upcoming,"upcoming"],["Chưa đến hạn",c.notDue,"notdue"],["Chưa có hạn",c.noDue,"nodue"]];
  const max=Math.max(...items.map(x=>x[1]),1);
  $("statusChart").innerHTML=items.map(x=>'<div class="status-row"><div class="status-label">'+x[0]+'</div><div class="status-track"><div class="status-bar '+x[2]+'" style="width:'+((x[1]/max)*100)+'%"></div></div><strong>'+x[1]+'</strong></div>').join("");
}
function taskRow(t,compact){
  return '<tr data-task-id="'+esc(t.task_id)+'">'+
    '<td><strong>'+esc(t.source_id)+'</strong><div class="cell-sub">'+esc(t.source_system)+'</div></td>'+
    (compact?'':'<td>'+esc(t.directive_date)+'</td>')+
    '<td><div class="cell-title">'+esc(t.title)+'</div><div class="cell-sub">Ngày theo dõi: '+esc(liveTrackingDate())+'</div></td>'+
    '<td>'+esc(t.minister_leader)+'</td>'+
    '<td>'+esc(t.department_name||"Chưa cập nhật")+'</td>'+
    '<td>'+esc(t.due_date||"—")+'</td>'+
    (compact?'':'<td><span class="status-pill '+(t.vbdh_status==="Hoàn thành"?"done":"open")+'">'+esc(t.vbdh_status)+'</span></td>')+
    '<td><span class="status-pill '+statusClass(t.management_status)+'">'+esc(t.management_status)+'</span></td>'+
    '</tr>';
}
function wireRows(root){
  root.querySelectorAll("tr[data-task-id]").forEach(row=>row.addEventListener("click",()=>{
    const t=state.tasks.find(x=>x.task_id===row.dataset.taskId); if(t) openDrawer(t);
  }));
}
function renderRecent(){
  const open=state.tasks.filter(t=>t.vbdh_status==="Chưa hoàn thành").sort((a,b)=>{
    const o={"Quá hạn":0,"Sắp đến hạn":1,"Chưa đến hạn":2,"Chưa có hạn":3};
    return o[a.management_status]-o[b.management_status];
  }).slice(0,8);
  $("recentTasksBody").innerHTML=open.map(t=>taskRow(t,true)).join("");
  wireRows($("recentTasksBody"));
}
function renderUrgent(){
  const list=state.tasks.filter(t=>t.vbdh_status==="Chưa hoàn thành"&&(t.management_status==="Quá hạn"||t.management_status==="Sắp đến hạn"));
  $("urgentList").innerHTML=list.slice(0,6).map(t=>'<div class="urgent-item '+statusClass(t.management_status)+'" data-task-id="'+esc(t.task_id)+'"><div class="urgent-top"><div><div class="urgent-code">'+esc(t.source_id)+'</div><div class="urgent-title">'+esc(t.title)+'</div></div><span class="status-pill '+statusClass(t.management_status)+'">'+esc(t.management_status)+'</span></div><div class="urgent-meta">'+esc(t.department_name||"Chưa cập nhật")+' · Hạn '+esc(t.due_date||"—")+'</div></div>').join("");
  $("urgentList").querySelectorAll("[data-task-id]").forEach(el=>el.addEventListener("click",()=>{
    const t=state.tasks.find(x=>x.task_id===el.dataset.taskId); if(t) openDrawer(t);
  }));
}
function populateDepartments(){
  const ds=[...new Set(state.tasks.map(t=>t.department_name).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"vi"));
  $("departmentFilter").innerHTML='<option value="">Tất cả phòng</option>'+ds.map(d=>'<option value="'+esc(d)+'">'+esc(d)+'</option>').join("");
}
function filteredTasks(){
  const q=state.query.trim().toLowerCase();
  return state.tasks.filter(t=>{
    if(state.department&&t.department_name!==state.department) return false;
    if(state.status&&t.management_status!==state.status) return false;
    if(state.vbdhStatus&&t.vbdh_status!==state.vbdhStatus) return false;
    if(!q) return true;
    return [t.source_id,t.title,t.minister_leader,t.department_name,t.bureau_leader,t.room_leader,t.assignee].join(" ").toLowerCase().includes(q);
  });
}
function renderTaskTable(){
  const list=filteredTasks();
  $("taskCount").textContent=list.length+" nhiệm vụ phù hợp · phạm vi "+PUBLISH_START+"–"+DATA_AS_OF;
  $("tasksBody").innerHTML=list.map(t=>taskRow(t,false)).join("");
  $("emptyState").classList.toggle("hidden",list.length>0);
  wireRows($("tasksBody"));
}

function renderPolicyOverview(){
  const c=policyCounts(state.policies);
  const items=[
    ["Tổng danh mục",c.total,"Cơ chế, chính sách"],
    ["Thông tư",c.circular,"Trong chương trình"],
    ["Mốc 9–10/2026",c.sepOct,"02 tháng 9 · 01 tháng 10"],
    ["Xử lý đặc thù",c.special,"Theo ghi chú trong danh mục"]
  ];
  $("policyOverviewKpis").innerHTML=items.map(x=>'<div class="policy-mini-kpi"><span>'+esc(x[0])+'</span><strong>'+x[1]+'</strong><small>'+esc(x[2])+'</small></div>').join("");

  const roomCounts=[...new Set(state.policies.map(p=>p.department))].map(department=>({
    department,count:state.policies.filter(p=>p.department===department).length
  })).sort((a,b)=>b.count-a.count||a.department.localeCompare(b.department,"vi"));
  const max=Math.max(...roomCounts.map(x=>x.count),1);
  $("policyRoomBars").innerHTML=roomCounts.map(x=>'<div class="policy-room-row"><span>'+esc(x.department.replace("Phòng ",""))+'</span><div class="policy-room-track"><i style="width:'+((x.count/max)*100)+'%"></i></div><strong>'+x.count+'</strong></div>').join("");

  const milestones=[
    ["08/2026",state.policies.filter(p=>p.deadline==="08/2026").length,"Không tiếp tục xây dựng"],
    ["09/2026",state.policies.filter(p=>p.deadline==="09/2026").length,""],
    ["10/2026",state.policies.filter(p=>p.deadline==="10/2026").length,""],
    ["12/2026",state.policies.filter(p=>p.deadline==="12/2026").length,""],
    ["12/2026–01/2027",state.policies.filter(p=>p.deadline.startsWith("12/2026 hoặc 1/2027")).length,""],
    ["Phụ thuộc Luật NSNN",state.policies.filter(p=>p.deadline.startsWith("Tuỳ thuộc")).length,""]
  ].filter(x=>x[1]>0);
  $("policyMilestones").innerHTML=milestones.map(x=>'<span class="policy-milestone"><strong>'+esc(x[0])+'</strong> · '+x[1]+(x[2]?' <em>'+esc(x[2])+'</em>':'')+'</span>').join("");
}
function populatePolicyFilters(){
  const types=[...new Set(state.policies.map(p=>p.category))];
  const rooms=[...new Set(state.policies.map(p=>p.department))].sort((a,b)=>a.localeCompare(b,"vi"));
  const statuses=[...new Set(state.policies.map(p=>p.tracking_status))];
  $("policyTypeFilter").innerHTML='<option value="">Tất cả loại văn bản</option>'+types.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("");
  $("policyDepartmentFilter").innerHTML='<option value="">Tất cả phòng đầu mối</option>'+rooms.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("");
  $("policyStatusFilter").innerHTML='<option value="">Tất cả trạng thái</option>'+statuses.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("");
}
function filteredPolicies(){
  const q=state.policyQuery.trim().toLowerCase();
  return state.policies.filter(p=>{
    if(state.policyType&&p.category!==state.policyType) return false;
    if(state.policyDepartment&&p.department!==state.policyDepartment) return false;
    if(state.policyStatus&&p.tracking_status!==state.policyStatus) return false;
    if(!q) return true;
    return [p.title,p.category,p.bureau_leader,p.room_leader,p.assignee,p.department,p.note].join(" ").toLowerCase().includes(q);
  });
}
function policyRow(p){
  return '<tr data-policy-id="'+esc(p.policy_id)+'">'+
    '<td><span class="policy-type-pill">'+esc(p.category)+'</span></td>'+
    '<td><div class="cell-title">'+esc(p.title)+'</div>'+(p.note?'<div class="cell-sub policy-note-preview">'+esc(p.note)+'</div>':'')+'</td>'+
    '<td class="policy-deadline">'+esc(p.deadline)+'</td>'+
    '<td><span class="status-pill '+policyStatusClass(p.tracking_status)+'">'+esc(p.tracking_status)+'</span></td>'+
    '<td>'+esc(p.bureau_leader)+'</td>'+
    '<td>'+esc(p.department)+'</td>'+
    '<td>'+esc(p.assignee)+'</td>'+
    '</tr>';
}
function renderPolicyKpis(){
  const c=policyCounts(state.policies);
  const items=[
    ["Tổng danh mục",c.total,"6 tháng cuối năm 2026",""],
    ["Thông tư",c.circular,"Cùng 02 Thỏa thuận + 01 Nghị định","done"],
    ["Mốc 9–10/2026",c.sepOct,"Mốc ban hành gần trong chương trình","open"],
    ["Xử lý đặc thù",c.special,"Theo ghi chú của danh mục","upcoming"]
  ];
  $("policyKpiGrid").innerHTML=items.map(x=>'<article class="kpi '+x[3]+'"><div class="kpi-label">'+esc(x[0])+'</div><div class="kpi-value">'+x[1]+'</div><div class="kpi-note">'+esc(x[2])+'</div></article>').join("");
}
function renderPolicyTable(){
  const list=filteredPolicies();
  $("policyCount").textContent=list.length+" / "+state.policies.length+" văn bản trong chương trình 6 tháng cuối năm 2026";
  $("policyBody").innerHTML=list.map(policyRow).join("");
  $("policyEmptyState").classList.toggle("hidden",list.length>0);
  $("policyBody").querySelectorAll("tr[data-policy-id]").forEach(row=>row.addEventListener("click",()=>{
    const p=state.policies.find(x=>x.policy_id===row.dataset.policyId); if(p) openPolicyDrawer(p);
  }));
}

function metricHtml(c){
  return '<div><strong>'+c.total+'</strong><span>Tổng</span></div><div><strong>'+c.done+'</strong><span>Hoàn thành</span></div><div><strong>'+c.open+'</strong><span>Chưa hoàn thành</span></div><div><strong>'+c.overdue+'</strong><span>Quá hạn</span></div>';
}
function policyMetricHtml(c){
  return '<div><strong>'+c.total+'</strong><span>Tổng danh mục</span></div><div><strong>'+c.circular+'</strong><span>Thông tư</span></div><div><strong>'+c.sepOct+'</strong><span>Mốc 9–10/2026</span></div><div><strong>'+c.special+'</strong><span>Xử lý đặc thù</span></div>';
}
function renderReports(){
  $("publishMetrics").innerHTML=metricHtml(counts(state.tasks));
  $("sepMetrics").innerHTML=metricHtml(counts(state.tasks.filter(t=>t.month==="2026-09")));
  $("policyReportMetrics").innerHTML=policyMetricHtml(policyCounts(state.policies));
  renderLiveTrackingDates();
}
function detail(label,value,wide){
  return '<div class="detail '+(wide?"wide":"")+'"><div class="detail-label">'+esc(label)+'</div><div class="detail-value">'+esc(value||"—")+'</div></div>';
}
function openDrawer(t){
  $("drawerKicker").textContent="CHI TIẾT NHIỆM VỤ";
  $("drawerTitle").textContent=t.title;
  $("drawerBody").innerHTML='<div class="detail-grid">'+
    detail("Mã nhiệm vụ",t.source_id)+detail("Nguồn",t.source_system)+
    detail("Ngày tạo",t.created_date)+detail("Ngày chỉ đạo",t.directive_date)+
    detail("Lãnh đạo Bộ",t.minister_leader)+detail("Phòng xử lý",t.department_name||"Chưa cập nhật")+
    detail("Hạn xử lý",t.due_date||"Chưa có hạn")+detail("Trạng thái VBDH",t.vbdh_status)+
    detail("Phân loại quản trị",t.management_status)+detail("Ngày theo dõi",liveTrackingDate())+
    detail("Nhiệm vụ cha",t.parent_title,true)+detail("Chủ trì VBDH",t.lead_vbdh,true)+
    '</div><div class="drawer-section">Phân công nội bộ</div><div class="detail-grid">'+
    detail("Lãnh đạo Cục",t.bureau_leader)+detail("Lãnh đạo Phòng",t.room_leader)+
    detail("Chuyên viên",t.assignee)+detail("Tiến độ",t.progress)+
    detail("Tình hình xử lý",t.detail,true)+detail("Sản phẩm",t.product,true)+'</div>';
  openDrawerShell();
}
function openPolicyDrawer(p){
  $("drawerKicker").textContent="CHI TIẾT CƠ CHẾ, CHÍNH SÁCH";
  $("drawerTitle").textContent=p.title;
  $("drawerBody").innerHTML='<div class="detail-grid">'+
    detail("Loại văn bản",p.category)+detail("Thời hạn ban hành",p.deadline)+
    detail("Tình trạng trong danh mục",p.source_status)+detail("Trạng thái theo dõi",p.tracking_status)+
    detail("Lãnh đạo Cục phụ trách",p.bureau_leader)+detail("Lãnh đạo Phòng phụ trách",p.room_leader)+
    detail("Công chức/chuyên viên",p.assignee)+detail("Đầu mối",p.department)+
    detail("Ghi chú",p.note||"Không có",true)+'</div>';
  openDrawerShell();
}
function openDrawerShell(){
  $("drawerBackdrop").classList.remove("hidden");
  $("taskDrawer").classList.add("open");
  $("taskDrawer").setAttribute("aria-hidden","false");
}
function closeDrawer(){
  $("drawerBackdrop").classList.add("hidden"); $("taskDrawer").classList.remove("open"); $("taskDrawer").setAttribute("aria-hidden","true");
}
function setPageCopy(view){
  if(view==="overview"){
    $("pageTitle").textContent="Tổng quan tình hình thực hiện nhiệm vụ";
    $("pageSubtitle").textContent="Theo dõi nhiệm vụ VBDH, thời hạn và trạng thái xử lý";
  }else if(view==="vbdh"){
    $("pageTitle").textContent="Nhiệm vụ VBDH";
    $("pageSubtitle").textContent="Theo dõi nhiệm vụ VBDH, thời hạn và trạng thái xử lý";
  }else if(view==="policy"){
    $("pageTitle").textContent="Cơ chế, chính sách";
    $("pageSubtitle").textContent="Theo dõi danh mục cơ chế, chính sách ban hành trong 6 tháng cuối năm 2026";
  }else if(view==="reports"){
    $("pageTitle").textContent="Báo cáo nhiệm vụ";
    $("pageSubtitle").textContent="Tổng hợp nhiệm vụ VBDH và chương trình cơ chế, chính sách";
  }else{
    $("pageTitle").textContent="Tra cứu nhiệm vụ";
    $("pageSubtitle").textContent="Tìm kiếm và tra cứu nhiệm vụ VBDH";
  }
}
function setTrackingBanner(view){
  if(view==="policy"){
    $("trackingBanner").innerHTML="<strong>Chương trình theo dõi:</strong> Danh mục cơ chế, chính sách ban hành trong 6 tháng cuối năm 2026";
  }else{
    $("trackingBanner").innerHTML="<strong>Kỳ theo dõi đánh giá:</strong> Từ ngày 15/8/2026 - 22/9/2026";
  }
}
function setView(view){
  state.view=view;
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  ["overviewView","tasksView","policiesView","reportsView"].forEach(id=>$(id).classList.add("hidden"));
  setPageCopy(view);
  setTrackingBanner(view);

  if(view==="overview"){
    $("overviewView").classList.remove("hidden");
  }else if(view==="policy"){
    $("policiesView").classList.remove("hidden");
    renderPolicyTable();
  }else if(view==="reports"){
    $("reportsView").classList.remove("hidden"); renderReports();
  }else{
    $("tasksView").classList.remove("hidden");
    $("taskTableTitle").textContent=view==="vbdh"?"Danh sách nhiệm vụ VBDH":"Tra cứu toàn bộ nhiệm vụ";
    if(view==="vbdh"){ state.vbdhStatus="Chưa hoàn thành"; $("vbdhStatusFilter").value="Chưa hoàn thành"; }
    else { state.vbdhStatus=""; $("vbdhStatusFilter").value=""; setTimeout(()=>$("searchInput").focus(),50); }
    renderTaskTable();
  }
}
function bind(){
  document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>setView(btn.dataset.view)));
  $("openAllTasks").addEventListener("click",()=>setView("vbdh"));
  $("openPolicies").addEventListener("click",()=>setView("policy"));
  $("showAllUrgent").addEventListener("click",()=>{setView("vbdh");state.status="";$("statusFilter").value="";renderTaskTable();});
  $("closeDrawer").addEventListener("click",closeDrawer);
  $("drawerBackdrop").addEventListener("click",closeDrawer);
  document.addEventListener("keydown",e=>{if(e.key==="Escape") closeDrawer();});

  $("searchInput").addEventListener("input",e=>{state.query=e.target.value;renderTaskTable();});
  $("departmentFilter").addEventListener("change",e=>{state.department=e.target.value;renderTaskTable();});
  $("statusFilter").addEventListener("change",e=>{state.status=e.target.value;renderTaskTable();});
  $("vbdhStatusFilter").addEventListener("change",e=>{state.vbdhStatus=e.target.value;renderTaskTable();});
  $("resetFilters").addEventListener("click",()=>{
    state.query="";state.department="";state.status="";state.vbdhStatus=state.view==="vbdh"?"Chưa hoàn thành":"";
    $("searchInput").value="";$("departmentFilter").value="";$("statusFilter").value="";$("vbdhStatusFilter").value=state.vbdhStatus;renderTaskTable();
  });

  $("policySearchInput").addEventListener("input",e=>{state.policyQuery=e.target.value;renderPolicyTable();});
  $("policyTypeFilter").addEventListener("change",e=>{state.policyType=e.target.value;renderPolicyTable();});
  $("policyDepartmentFilter").addEventListener("change",e=>{state.policyDepartment=e.target.value;renderPolicyTable();});
  $("policyStatusFilter").addEventListener("change",e=>{state.policyStatus=e.target.value;renderPolicyTable();});
  $("resetPolicyFilters").addEventListener("click",()=>{
    state.policyQuery="";state.policyType="";state.policyDepartment="";state.policyStatus="";
    $("policySearchInput").value="";$("policyTypeFilter").value="";$("policyDepartmentFilter").value="";$("policyStatusFilter").value="";
    renderPolicyTable();
  });
}
async function init(){
  renderDate(); renderLiveTrackingDates();
  const [tasks,policies]=await Promise.all([loadTasks(),loadPolicies()]);
  state.tasks=tasks; state.policies=policies;
  populateDepartments(); populatePolicyFilters();
  renderKPIs(); renderStatusChart(); renderUrgent(); renderRecent();
  renderPolicyOverview(); renderPolicyKpis(); renderPolicyTable(); renderReports();
  bind(); setView("overview");
}
init().catch(err=>{document.body.innerHTML='<div style="padding:40px;font-family:Arial">Không tải được V2: '+esc(err.message)+'</div>';});
