export const DEMO_AS_OF = "21/09/2026";

export const DEPARTMENT_AGGREGATES = [
  { code:"DPH", name:"Phòng Đa phương", overdue:3, upcoming:0, notDue:1 },
  { code:"CUC", name:"Cục Quản lý nợ và Kinh tế đối ngoại", overdue:0, upcoming:18, notDue:20 },
  { code:"KHRR", name:"Phòng Kế hoạch và Quản lý rủi ro", overdue:0, upcoming:0, notDue:3 },
  { code:"LCP", name:"Phòng Hợp tác với Lào và Campuchia", overdue:0, upcoming:0, notDue:1 },
  { code:"DADP", name:"Phòng Quản lý dự án địa phương", overdue:0, upcoming:0, notDue:1 }
];

const demoTitles = [
  "Báo cáo tiến độ thực hiện nhiệm vụ được giao",
  "Rà soát nội dung phục vụ báo cáo Lãnh đạo Bộ",
  "Tổng hợp tình hình xử lý kiến nghị của đơn vị",
  "Chuẩn bị tài liệu phục vụ cuộc họp chuyên đề",
  "Rà soát và hoàn thiện dự thảo văn bản trả lời",
  "Báo cáo kết quả thực hiện nhiệm vụ theo yêu cầu",
  "Tổng hợp số liệu phục vụ công tác điều hành",
  "Đề xuất phương án xử lý nội dung liên quan",
  "Phối hợp tham gia ý kiến đối với dự thảo văn bản",
  "Cập nhật tiến độ thực hiện nhiệm vụ trọng tâm"
];

function pad(n){ return String(n).padStart(3,"0"); }

function dueFor(status, i){
  if(status==="Quá hạn") return i%3===0 ? "16/09/2026" : (i%3===1 ? "18/09/2026" : "20/09/2026");
  if(status==="Sắp đến hạn") return i%3===0 ? "22/09/2026" : (i%3===1 ? "24/09/2026" : "26/09/2026");
  return i%3===0 ? "30/09/2026" : (i%3===1 ? "05/10/2026" : "15/10/2026");
}

function makeTask(index, dept, status){
  const n=index+1;
  const progress = status==="Quá hạn" ? 72+(n%18) : status==="Sắp đến hạn" ? 55+(n%31) : 20+(n%55);
  return {
    task_id:`VBDH-DEMO-${pad(n)}`,
    source_system:"VBDH Bộ",
    source_id:`DEMO-${20260000+n}`,
    document_no:`${1000+n}/BTC-DEMO`,
    document_date:"15/09/2026",
    received_date:"16/09/2026",
    sender:"Hệ thống VBDH Bộ (dữ liệu mẫu)",
    title:`${demoTitles[index%demoTitles.length]} #${pad(n)}`,
    department_code:dept.code,
    department_name:dept.name,
    bureau_leader:index%4===0 ? "Lãnh đạo Cục A" : index%4===1 ? "Lãnh đạo Cục B" : index%4===2 ? "Lãnh đạo Cục C" : "Lãnh đạo Cục D",
    room_leader:index%3===0 ? "Lãnh đạo phòng A" : index%3===1 ? "Lãnh đạo phòng B" : "Lãnh đạo phòng C",
    assignee:`Chuyên viên ${String.fromCharCode(65+(index%8))}`,
    due_date:dueFor(status,index),
    status,
    progress:Math.min(progress,96),
    detail:status==="Quá hạn"
      ? "Đang hoàn thiện nội dung, cần đôn đốc xử lý do đã quá thời hạn trên VBDH."
      : status==="Sắp đến hạn"
        ? "Đang tổng hợp ý kiến và hoàn thiện sản phẩm trước thời hạn."
        : "Đang xử lý theo kế hoạch; hiện chưa phát sinh vướng mắc lớn.",
    product:"",
    secrecy:"Thường",
    updated_at:"21/09/2026 15:55"
  };
}

export function buildDemoTasks(){
  const tasks=[];
  let idx=0;
  for(const dept of DEPARTMENT_AGGREGATES){
    for(let i=0;i<dept.overdue;i++) tasks.push(makeTask(idx++,dept,"Quá hạn"));
    for(let i=0;i<dept.upcoming;i++) tasks.push(makeTask(idx++,dept,"Sắp đến hạn"));
    for(let i=0;i<dept.notDue;i++) tasks.push(makeTask(idx++,dept,"Chưa đến hạn"));
  }
  return tasks;
}

export async function loadTasks(){
  // V2 prototype đang dùng dữ liệu demo an toàn.
  // Khi có export VBDH thật, thay phần này bằng fetch("./data/vbdh.json")
  // hoặc endpoint nội bộ phù hợp.
  return buildDemoTasks();
}
