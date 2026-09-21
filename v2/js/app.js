import { loadTasks, DEMO_AS_OF } from "./data.js";

const state={tasks:[],view:"overview",query:"",department:"",status:"",vbdhStatus:""};
const $=(id)=>document.getElementById(id);

function esc(v){
  return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
function statusClass(s){
  if(s==="Quá hạn") return "overdue";
  if(s==="Sắp đến hạn") return "upcoming";
  if(s==="Chưa có hạn") return "nodue";
  if(s==="Hoàn thành") return "done";
  return "notdue";
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
function renderDate(){
  $("todayLabel").textContent=new Date().toLocaleDateString("vi-VN",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"});
}
function renderKPIs(){
  const c=counts(state.tasks);
  const items=[
    ["Tổng nhiệm vụ",c.total,"Tất cả record trong snapshot",""],
    ["Hoàn thành",c.done,"Trạng thái xác nhận từ VBDH","done"],
    ["Chưa hoàn thành",c.open,"Ưu tiên vận hành","open"],
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
    '<td><div class="cell-title">'+esc(t.title)+'</div><div class="cell-sub">Snapshot: '+esc(t.snapshot_date)+'</div></td>'+
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
  $("taskCount").textContent=list.length+" nhiệm vụ phù hợp · demo snapshot "+DEMO_AS_OF;
  $("tasksBody").innerHTML=list.map(t=>taskRow(t,false)).join("");
  $("emptyState").classList.toggle("hidden",list.length>0);
  wireRows($("tasksBody"));
}
function metricHtml(c){
  return '<div><strong>'+c.total+'</strong><span>Tổng</span></div><div><strong>'+c.done+'</strong><span>Hoàn thành</span></div><div><strong>'+c.open+'</strong><span>Chưa hoàn thành</span></div><div><strong>'+c.overdue+'</strong><span>Quá hạn</span></div>';
}
function renderReports(){
  $("q3Metrics").innerHTML=metricHtml(counts(state.tasks.filter(t=>t.quarter==="2026-Q3")));
  $("sepMetrics").innerHTML=metricHtml(counts(state.tasks.filter(t=>t.month==="2026-09")));
}
function detail(label,value,wide){
  return '<div class="detail '+(wide?"wide":"")+'"><div class="detail-label">'+esc(label)+'</div><div class="detail-value">'+esc(value||"—")+'</div></div>';
}
function openDrawer(t){
  $("drawerTitle").textContent=t.title;
  $("drawerBody").innerHTML='<div class="detail-grid">'+
    detail("Mã nhiệm vụ",t.source_id)+detail("Nguồn",t.source_system)+
    detail("Ngày tạo",t.created_date)+detail("Ngày chỉ đạo",t.directive_date)+
    detail("Lãnh đạo Bộ",t.minister_leader)+detail("Phòng xử lý",t.department_name||"Chưa cập nhật")+
    detail("Hạn xử lý",t.due_date||"Chưa có hạn")+detail("Trạng thái VBDH",t.vbdh_status)+
    detail("Phân loại quản trị",t.management_status)+detail("Snapshot",t.snapshot_date)+
    detail("Nhiệm vụ cha",t.parent_title,true)+detail("Chủ trì VBDH",t.lead_vbdh,true)+
    '</div><div class="drawer-section">Phân công nội bộ</div><div class="detail-grid">'+
    detail("Lãnh đạo Cục",t.bureau_leader)+detail("Lãnh đạo Phòng",t.room_leader)+
    detail("Chuyên viên",t.assignee)+detail("Tiến độ",t.progress)+
    detail("Tình hình xử lý",t.detail,true)+detail("Sản phẩm",t.product,true)+'</div>';
  $("drawerBackdrop").classList.remove("hidden");
  $("taskDrawer").classList.add("open");
  $("taskDrawer").setAttribute("aria-hidden","false");
}
function closeDrawer(){
  $("drawerBackdrop").classList.add("hidden"); $("taskDrawer").classList.remove("open"); $("taskDrawer").setAttribute("aria-hidden","true");
}
function setView(view){
  state.view=view;
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  ["overviewView","tasksView","reportsView"].forEach(id=>$(id).classList.add("hidden"));
  if(view==="overview"){
    $("pageTitle").textContent="Tổng quan nhiệm vụ"; $("overviewView").classList.remove("hidden");
  }else if(view==="reports"){
    $("pageTitle").textContent="Báo cáo nhiệm vụ"; $("reportsView").classList.remove("hidden"); renderReports();
  }else{
    $("tasksView").classList.remove("hidden");
    $("pageTitle").textContent=view==="vbdh"?"Nhiệm vụ VBDH":"Tra cứu nhiệm vụ";
    $("taskTableTitle").textContent=view==="vbdh"?"Danh sách nhiệm vụ VBDH":"Tra cứu toàn bộ nhiệm vụ";
    if(view==="vbdh"){ state.vbdhStatus="Chưa hoàn thành"; $("vbdhStatusFilter").value="Chưa hoàn thành"; }
    else { state.vbdhStatus=""; $("vbdhStatusFilter").value=""; setTimeout(()=>$("searchInput").focus(),50); }
    renderTaskTable();
  }
}
function bind(){
  document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>setView(btn.dataset.view)));
  $("openAllTasks").addEventListener("click",()=>setView("vbdh"));
  $("showAllUrgent").addEventListener("click",()=>{setView("vbdh");state.status="Sắp đến hạn";$("statusFilter").value="Sắp đến hạn";renderTaskTable();});
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
}
async function init(){
  renderDate(); state.tasks=await loadTasks(); populateDepartments(); renderKPIs(); renderStatusChart(); renderUrgent(); renderRecent(); renderReports(); bind(); setView("overview");
}
init().catch(err=>{document.body.innerHTML='<div style="padding:40px;font-family:Arial">Không tải được V2: '+esc(err.message)+'</div>';});