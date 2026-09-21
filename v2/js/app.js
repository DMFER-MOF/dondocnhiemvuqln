import { loadTasks, DEPARTMENT_AGGREGATES, DEMO_AS_OF } from "./data.js";

const state = {
  tasks: [],
  view: "overview",
  query: "",
  department: "",
  status: "",
  source: ""
};

const $ = (id)=>document.getElementById(id);

function esc(value){
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function statusClass(status){
  if(status==="Quá hạn") return "overdue";
  if(status==="Sắp đến hạn") return "upcoming";
  if(status==="Đã hoàn thành") return "done";
  return "notdue";
}

function countByStatus(tasks){
  return tasks.reduce((acc,t)=>{
    acc.total++;
    if(t.status==="Quá hạn") acc.overdue++;
    else if(t.status==="Sắp đến hạn") acc.upcoming++;
    else if(t.status==="Đã hoàn thành") acc.done++;
    else acc.notDue++;
    return acc;
  },{total:0,overdue:0,upcoming:0,notDue:0,done:0});
}

function renderDate(){
  const now=new Date();
  $("todayLabel").textContent = now.toLocaleDateString("vi-VN",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"});
}

function renderKPIs(){
  const c=countByStatus(state.tasks);
  const items=[
    ["Tổng nhiệm vụ",c.total,"Đang hiển thị từ nguồn VBDH demo",""],
    ["Quá hạn",c.overdue,"Cần ưu tiên đôn đốc","overdue"],
    ["Sắp đến hạn",c.upcoming,"Cần theo dõi sát","upcoming"],
    ["Chưa đến hạn",c.notDue,"Đang trong thời gian xử lý","notdue"]
  ];
  $("kpiGrid").innerHTML=items.map(([label,val,note,cls])=>`
    <article class="kpi ${cls}">
      <div class="kpi-label">${esc(label)}</div>
      <div class="kpi-value">${val}</div>
      <div class="kpi-note">${esc(note)}</div>
    </article>`).join("");
}

function renderChart(){
  const max=Math.max(...DEPARTMENT_AGGREGATES.map(d=>d.overdue+d.upcoming+d.notDue),1);
  $("deptChart").innerHTML=DEPARTMENT_AGGREGATES.map(d=>{
    const total=d.overdue+d.upcoming+d.notDue;
    const seg=(value,cls)=> value ? `<span class="chart-seg ${cls}" style="width:${value/max*100}%">${value}</span>` : "";
    return `
      <div class="chart-row">
        <div class="chart-label">${esc(d.name)} (${total})</div>
        <div class="chart-track">
          ${seg(d.overdue,"overdue")}
          ${seg(d.upcoming,"upcoming")}
          ${seg(d.notDue,"notdue")}
        </div>
        <div class="chart-total">${total}</div>
      </div>`;
  }).join("");
}

function taskRow(t, compact=false){
  const progress=compact ? "" : `
    <td>
      <div class="progress">
        <div class="progress-track"><div class="progress-bar" style="width:${Number(t.progress)||0}%"></div></div>
        <div class="progress-text">${Number(t.progress)||0}%</div>
      </div>
    </td>`;
  return `
    <tr data-task-id="${esc(t.task_id)}">
      <td><strong>${esc(t.task_id)}</strong><div class="cell-sub">${esc(t.source_system)}</div></td>
      <td>${esc(t.document_no)}</td>
      <td><div class="cell-title">${esc(t.title)}</div><div class="cell-sub">Cập nhật: ${esc(t.updated_at)}</div></td>
      <td>${esc(t.department_name)}</td>
      ${compact ? "" : `<td>${esc(t.assignee)}</td>`}
      <td>${esc(t.due_date)}</td>
      <td><span class="status-pill ${statusClass(t.status)}">${esc(t.status)}</span></td>
      ${progress}
    </tr>`;
}

function wireRows(root){
  root.querySelectorAll("tr[data-task-id]").forEach(row=>{
    row.addEventListener("click",()=>{
      const task=state.tasks.find(t=>t.task_id===row.dataset.taskId);
      if(task) openDrawer(task);
    });
  });
}

function renderRecent(){
  const urgent=[...state.tasks].sort((a,b)=>{
    const order={"Quá hạn":0,"Sắp đến hạn":1,"Chưa đến hạn":2,"Đã hoàn thành":3};
    return order[a.status]-order[b.status];
  }).slice(0,8);
  $("recentTasksBody").innerHTML=urgent.map(t=>taskRow(t,true)).join("");
  wireRows($("recentTasksBody"));
}

function renderUrgent(){
  const urgent=state.tasks.filter(t=>t.status==="Quá hạn"||t.status==="Sắp đến hạn").slice(0,6);
  $("urgentList").innerHTML=urgent.map(t=>`
    <div class="urgent-item ${statusClass(t.status)}" data-task-id="${esc(t.task_id)}">
      <div class="urgent-top">
        <div>
          <div class="urgent-code">${esc(t.task_id)} · ${esc(t.document_no)}</div>
          <div class="urgent-title">${esc(t.title)}</div>
        </div>
        <span class="status-pill ${statusClass(t.status)}">${esc(t.status)}</span>
      </div>
      <div class="urgent-meta">${esc(t.department_name)} · Hạn ${esc(t.due_date)} · ${esc(t.assignee)}</div>
    </div>`).join("");
  $("urgentList").querySelectorAll("[data-task-id]").forEach(el=>el.addEventListener("click",()=>{
    const task=state.tasks.find(t=>t.task_id===el.dataset.taskId);
    if(task) openDrawer(task);
  }));
}

function populateDepartments(){
  const departments=[...new Set(state.tasks.map(t=>t.department_name))].sort((a,b)=>a.localeCompare(b,"vi"));
  $("departmentFilter").innerHTML='<option value="">Tất cả đơn vị</option>'+departments.map(d=>`<option value="${esc(d)}">${esc(d)}</option>`).join("");
}

function filteredTasks(){
  const q=state.query.trim().toLowerCase();
  return state.tasks.filter(t=>{
    if(state.department && t.department_name!==state.department) return false;
    if(state.status && t.status!==state.status) return false;
    if(state.source && t.source_system!==state.source) return false;
    if(!q) return true;
    const hay=[t.task_id,t.document_no,t.title,t.department_name,t.assignee,t.bureau_leader,t.room_leader].join(" ").toLowerCase();
    return hay.includes(q);
  });
}

function renderTaskTable(){
  const list=filteredTasks();
  $("taskCount").textContent=`${list.length} nhiệm vụ phù hợp · nguồn demo cập nhật ${DEMO_AS_OF}`;
  $("tasksBody").innerHTML=list.map(t=>taskRow(t,false)).join("");
  $("emptyState").classList.toggle("hidden",list.length>0);
  wireRows($("tasksBody"));
}

function detail(label,value,wide=false,normal=false){
  return `<div class="detail ${wide?"wide":""}"><div class="detail-label">${esc(label)}</div><div class="detail-value ${normal?"normal":""}">${esc(value||"—")}</div></div>`;
}

function openDrawer(t){
  $("drawerTitle").textContent=t.title;
  $("drawerBody").innerHTML=`
    <div class="detail-grid">
      ${detail("Mã nhiệm vụ",t.task_id)}
      ${detail("Nguồn dữ liệu",t.source_system)}
      ${detail("Số văn bản",t.document_no)}
      ${detail("Ngày văn bản",t.document_date)}
      ${detail("Ngày nhận",t.received_date)}
      ${detail("Nơi gửi",t.sender)}
      ${detail("Đơn vị xử lý",t.department_name,true)}
    </div>

    <div class="drawer-section">Phân công nội bộ</div>
    <div class="detail-grid">
      ${detail("Lãnh đạo Cục",t.bureau_leader)}
      ${detail("Lãnh đạo Phòng",t.room_leader)}
      ${detail("Chuyên viên",t.assignee)}
      ${detail("Tiến độ",`${t.progress}%`)}
    </div>

    <div class="drawer-section">Tiến độ và thời hạn</div>
    <div class="detail-grid">
      ${detail("Thời hạn VBDH",t.due_date)}
      ${detail("Trạng thái",t.status)}
      ${detail("Tình hình xử lý",t.detail,true,true)}
      ${detail("Sản phẩm đầu ra",t.product||"Chưa cập nhật",true,true)}
      ${detail("Cập nhật gần nhất",t.updated_at)}
      ${detail("Độ mật",t.secrecy)}
    </div>`;
  $("drawerBackdrop").classList.remove("hidden");
  $("taskDrawer").classList.add("open");
  $("taskDrawer").setAttribute("aria-hidden","false");
}

function closeDrawer(){
  $("drawerBackdrop").classList.add("hidden");
  $("taskDrawer").classList.remove("open");
  $("taskDrawer").setAttribute("aria-hidden","true");
}

function setView(view){
  state.view=view;
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  $("overviewView").classList.add("hidden");
  $("tasksView").classList.add("hidden");
  $("internalView").classList.add("hidden");

  if(view==="overview"){
    $("pageTitle").textContent="Tổng quan nhiệm vụ";
    $("overviewView").classList.remove("hidden");
  }else if(view==="internal"){
    $("pageTitle").textContent="Nhiệm vụ nội bộ Cục";
    $("internalView").classList.remove("hidden");
  }else{
    $("tasksView").classList.remove("hidden");
    if(view==="vbdh"){
      $("pageTitle").textContent="Nhiệm vụ VBDH";
      state.source="VBDH Bộ";
      $("sourceFilter").value=state.source;
      $("taskTableTitle").textContent="Danh sách nhiệm vụ VBDH";
    }else{
      $("pageTitle").textContent="Tra cứu nhiệm vụ";
      state.source="";
      $("sourceFilter").value="";
      $("taskTableTitle").textContent="Tra cứu toàn bộ nhiệm vụ";
      setTimeout(()=>$("searchInput").focus(),50);
    }
    renderTaskTable();
  }
}

function bind(){
  document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>setView(btn.dataset.view)));
  $("openAllTasks").addEventListener("click",()=>setView("vbdh"));
  $("showAllUrgent").addEventListener("click",()=>{
    setView("vbdh");
    state.status="Quá hạn";
    $("statusFilter").value="Quá hạn";
    renderTaskTable();
  });
  $("backOverview").addEventListener("click",()=>setView("overview"));
  $("closeDrawer").addEventListener("click",closeDrawer);
  $("drawerBackdrop").addEventListener("click",closeDrawer);
  document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeDrawer(); });

  $("searchInput").addEventListener("input",e=>{state.query=e.target.value;renderTaskTable();});
  $("departmentFilter").addEventListener("change",e=>{state.department=e.target.value;renderTaskTable();});
  $("statusFilter").addEventListener("change",e=>{state.status=e.target.value;renderTaskTable();});
  $("sourceFilter").addEventListener("change",e=>{state.source=e.target.value;renderTaskTable();});
  $("resetFilters").addEventListener("click",()=>{
    state.query="";state.department="";state.status="";state.source=state.view==="vbdh"?"VBDH Bộ":"";
    $("searchInput").value="";
    $("departmentFilter").value="";
    $("statusFilter").value="";
    $("sourceFilter").value=state.source;
    renderTaskTable();
  });
}

async function init(){
  renderDate();
  state.tasks=await loadTasks();
  populateDepartments();
  renderKPIs();
  renderChart();
  renderUrgent();
  renderRecent();
  bind();
  setView("overview");
}

init().catch(err=>{
  document.body.innerHTML=`<div style="padding:40px;font-family:Arial">Không tải được V2: ${esc(err.message)}</div>`;
});
