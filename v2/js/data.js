export const DATA_AS_OF = "21/09/2026";
export const PUBLISH_START = "15/08/2026";
export const WARN_DAYS = 5;
export const DATA_FILE = "./data/current-1508-2109.json";
export const POLICY_DATA_FILE = "./data/policy-2026-h2.json";

export async function loadTasks(){
  const response = await fetch(DATA_FILE, { cache: "no-store" });
  if(!response.ok) throw new Error("Không tải được dữ liệu VBDH đã publish.");
  const tasks = await response.json();
  if(!Array.isArray(tasks)) throw new Error("Dữ liệu VBDH không đúng định dạng.");
  return tasks;
}

export async function loadPolicies(){
  const response = await fetch(POLICY_DATA_FILE, { cache: "no-store" });
  if(!response.ok) throw new Error("Không tải được danh mục cơ chế, chính sách.");
  const policies = await response.json();
  if(!Array.isArray(policies)) throw new Error("Dữ liệu cơ chế, chính sách không đúng định dạng.");
  return policies;
}
