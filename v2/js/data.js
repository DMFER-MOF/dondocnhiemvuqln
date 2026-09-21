export const DEMO_AS_OF = "21/09/2026";
export const PUBLISH_START = "15/08/2026";
export const WARN_DAYS = 5;

const leaders = ["Lãnh đạo Bộ A","Lãnh đạo Bộ B","Lãnh đạo Bộ C"];
const rooms = ["Phòng minh họa A","Phòng minh họa B","Chưa cập nhật phân công"];
const titles = [
  "Rà soát nội dung phục vụ báo cáo",
  "Chuẩn bị tài liệu phục vụ cuộc họp",
  "Tổng hợp ý kiến đối với dự thảo văn bản",
  "Báo cáo tiến độ thực hiện nhiệm vụ",
  "Đề xuất phương án xử lý nội dung liên quan",
  "Tổng hợp số liệu phục vụ công tác điều hành"
];

function pad(n){ return String(n).padStart(3,"0"); }

function makeTask(n, vbdhStatus, mgmtStatus, due, month, room){
  return {
    task_id: "VBDH-DEMO-" + pad(n),
    source_system: "VBDH Bộ",
    source_id: "DEMO/" + pad(n) + "/2026",
    snapshot_date: DEMO_AS_OF,
    minister_leader: leaders[n % leaders.length],
    created_date: month === "2026-09" ? "15/09/2026" : "15/08/2026",
    directive_date: month === "2026-09" ? "16/09/2026" : "16/08/2026",
    parent_title: "Nhóm nhiệm vụ minh họa",
    title: titles[n % titles.length] + " #" + pad(n),
    lead_vbdh: "Cục QLN&KTĐN (minh họa)",
    coordination_vbdh: "",
    due_date: due,
    vbdh_status: vbdhStatus,
    management_status: mgmtStatus,
    quarter: "2026-Q3",
    month: month,
    department_name: room || rooms[n % rooms.length],
    bureau_leader: "",
    room_leader: "",
    assignee: "",
    progress: "",
    detail: "",
    product: "",
    data_quality: "DEMO",
    updated_at: DEMO_AS_OF
  };
}

export function buildDemoTasks(){
  return [
    makeTask(1,"Chưa hoàn thành","Quá hạn","19/09/2026","2026-09",rooms[0]),
    makeTask(2,"Chưa hoàn thành","Sắp đến hạn","23/09/2026","2026-09",rooms[1]),
    makeTask(3,"Chưa hoàn thành","Sắp đến hạn","25/09/2026","2026-09",rooms[2]),
    makeTask(4,"Chưa hoàn thành","Chưa đến hạn","05/10/2026","2026-09",rooms[2]),
    makeTask(5,"Chưa hoàn thành","Chưa có hạn","","2026-09",rooms[2]),
    makeTask(6,"Hoàn thành","Hoàn thành","18/09/2026","2026-09",rooms[0]),
    makeTask(7,"Hoàn thành","Hoàn thành","10/09/2026","2026-09",rooms[1]),
    makeTask(8,"Hoàn thành","Hoàn thành","28/08/2026","2026-08",rooms[0]),
    makeTask(9,"Hoàn thành","Hoàn thành","20/08/2026","2026-08",rooms[1]),
    makeTask(10,"Chưa hoàn thành","Chưa có hạn","","2026-08",rooms[2]),
  ];
}

export async function loadTasks(){
  // Bản public chỉ dùng dữ liệu minh họa giả.
  // Dữ liệu thật phải đi qua lớp dữ liệu nội bộ/private và không commit vào repo public.
  return buildDemoTasks();
}