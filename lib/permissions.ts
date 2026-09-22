// Page-level grants. Each page includes its existing operations; no CRUD permissions.
export const PERMISSION_VERSION = 2;
export const PERMISSION_SECTIONS = [
  { key: "drivers.leave", label: "วันลาคนขับ", href: "/admin/drivers/leaves", group: "งานจัดการ" },
  { key: "booking", label: "ขอใช้รถ", href: "/user/request", group: "งานส่วนตัว" },
  { key: "my_requests", label: "ประวัติคำขอ", href: "/user/my-requests", group: "งานส่วนตัว" },
  { key: "dashboard", label: "แผงควบคุม", href: "/admin", group: "งานจัดการ" },
  { key: "requests", label: "จัดการคำขอและมอบหมายคนขับ", href: "/admin/requests", group: "งานจัดการ" },
  { key: "vehicles", label: "จัดการข้อมูลรถ", href: "/admin/vehicles", group: "งานจัดการ" },
  { key: "drivers", label: "ข้อมูลคนขับและคิว", href: "/admin/drivers", group: "งานจัดการ" },
  { key: "fuel", label: "จัดการเบิกน้ำมัน", href: "/admin/fuel", group: "งานจัดการ" },
  { key: "maintenance", label: "จัดการปัญหาและซ่อมบำรุง", href: "/admin/maintenance", group: "งานจัดการ" },
  { key: "inspections", label: "จัดการรายงานตรวจสภาพรถ", href: "/admin/inspections", group: "งานจัดการ" },
  { key: "evaluations", label: "ดูผลประเมินและออกเอกสาร", href: "/admin/evaluations", group: "งานจัดการ" },
  { key: "reports", label: "รายงานการใช้รถรายเดือน", href: "/admin/reports/monthly", group: "งานจัดการ" },
  { key: "fogging", label: "จัดการเครื่องพ่นหมอกควัน", href: "/admin/fogging", group: "งานจัดการ" },
  { key: "duty", label: "ตั้งค่าเวรรถตู้", href: "/admin/duty-settings", group: "งานจัดการ" },
  { key: "my_requests.evaluate", label: "แบบประเมินบริการรายคำขอ", href: "/user/evaluations", group: "งานส่วนตัว" },
  { key: "dashboard.trips", label: "สรุปสถานะงานและเลขไมล์", href: "/admin/dashboard", group: "งานจัดการ" },
  { key: "requests.print", label: "หน้าพิมพ์ใบขอใช้รถ", href: "/admin/print-request/[id]", group: "งานจัดการ" },
  { key: "inspections.config", label: "ตั้งค่าหัวข้อการตรวจสภาพ", href: "/admin/inspections/config", group: "งานจัดการ" },
  { key: "reports.fuel", label: "รายงานการใช้น้ำมันรายเดือน", href: "/admin/reports/fuel", group: "งานจัดการ" },
  { key: "reports.annual", label: "รายงานรถยนต์ส่วนกลางรายปี", href: "/admin/reports/annual", group: "งานจัดการ" },
  { key: "profile", label: "ข้อมูลส่วนตัวและเชื่อมบัญชี LINE", href: "/user/profile", group: "บัญชีส่วนตัว" },
  { key: "change_password", label: "เปลี่ยนรหัสผ่านของฉัน", href: "/user/change-password", group: "บัญชีส่วนตัว" },
] as const;
export type PermissionKey = typeof PERMISSION_SECTIONS[number]["key"];
export type AccessProfile = { id: string; role: string; permissions: PermissionKey[] };
export type SingleRequirement = PermissionKey | "admin" | "signed_in";
export type Requirement = SingleRequirement | SingleRequirement[];
export const VALID_ROLES = ["ADMIN", "USER", "TESTER", "DRIVER"];
export function isPermissionKey(value: unknown): value is PermissionKey {
  return PERMISSION_SECTIONS.some(s => s.key === value);
}
export const PERMISSION_MODULES: { key: string; label: string; group: string; pages: PermissionKey[] }[] = [
  { key: "booking", label: "ขอใช้รถ", group: "งานส่วนตัว", pages: ["booking"] },
  { key: "history", label: "คำขอของฉัน", group: "งานส่วนตัว", pages: ["my_requests", "my_requests.evaluate"] },
  { key: "account", label: "บัญชีส่วนตัว", group: "งานส่วนตัว", pages: ["profile", "change_password"] },
  { key: "dashboard", label: "แผงควบคุม", group: "งานจัดการ", pages: ["dashboard", "dashboard.trips"] },
  { key: "requests", label: "จัดการคำขอ", group: "งานจัดการ", pages: ["requests", "requests.print"] },
  { key: "vehicles", label: "ข้อมูลรถ", group: "งานจัดการ", pages: ["vehicles"] },
  { key: "drivers", label: "คนขับรถ", group: "งานจัดการ", pages: ["drivers", "drivers.leave"] },
  { key: "fuel", label: "เบิกน้ำมัน", group: "งานจัดการ", pages: ["fuel"] },
  { key: "maintenance", label: "ปัญหาและซ่อมบำรุง", group: "งานจัดการ", pages: ["maintenance"] },
  { key: "inspections", label: "ตรวจสภาพรถ", group: "งานจัดการ", pages: ["inspections", "inspections.config"] },
  { key: "evaluations", label: "ผลการประเมิน", group: "งานจัดการ", pages: ["evaluations"] },
  { key: "reports", label: "รายงาน", group: "งานจัดการ", pages: ["reports", "reports.fuel", "reports.annual"] },
  { key: "fogging", label: "เครื่องพ่นหมอกควัน", group: "งานจัดการ", pages: ["fogging"] },
  { key: "duty", label: "เวรรถตู้", group: "งานจัดการ", pages: ["duty"] },
];

export const FIXED_ACCESS_MODULES = [
  { label: "จัดการบัญชีและสิทธิ์", access: "เฉพาะ ADMIN", pages: ["ผู้ใช้งาน /admin/users", "รายชื่อผู้ใช้เดิม /admin/user", "จัดการสิทธิ์ /admin/permissions"] },
  { label: "หน้าหลักและทางเข้าระบบ", access: "ใช้การเข้าถึงเดิม", pages: ["หน้าหลัก /", "หน้าแรกผู้ใช้ /user (ต้องเข้าสู่ระบบ)", "เข้าสู่ระบบ /login", "ลงทะเบียน /register", "ลืมรหัสผ่าน /forgot-password", "คู่มือ /manual", "แจ้งไม่มีสิทธิ์ /access-denied"] },
  { label: "ปฏิทินและข้อมูลสาธารณะ", access: "เปิดสาธารณะ", pages: ["ปฏิทิน /calendar", "ทางลัดปฏิทิน /user/calendar (ต้องเข้าสู่ระบบ)", "ข้อมูลรถ /vehicle-info", "เบิกน้ำมัน /fuel", "แจ้งปัญหา /report", "ประเมินบริการ /quality", "ตรวจสภาพ /vehicle-inspection", "พิมพ์ใบตรวจสภาพ /print/inspection/[id]"] },
  { label: "งานคนขับผ่าน LINE", access: "ใช้การเข้าถึงเดิม", pages: ["งานที่รับผิดชอบ /driver/active-tasks", "รายละเอียดงาน /driver/tasks/[id]", "เลขไมล์เริ่มต้น /driver/start-mileage", "เลขไมล์สิ้นสุด /driver/end-mileage", "รายงานรถ /driver/car-reports", "เชื่อมบัญชี /driver/link", "ลงทะเบียน /driver/register", "แบบฟอร์มลงทะเบียน /driver/register-form"] },
  { label: "หน้าทดสอบ", access: "ใช้การเข้าถึงเดิม", pages: ["ทดสอบเลขไมล์ /test-mileage"] },
];

// Expand only version-1 grants: checking a parent in v2 never silently grants a child.
export function expandLegacyPermissions(values: unknown): PermissionKey[] {
  const keys = new Set<PermissionKey>(Array.isArray(values) ? values.filter(isPermissionKey) : []);
  const descendants: [PermissionKey, PermissionKey[]][] = [
    ["my_requests", ["my_requests.evaluate"]], ["dashboard", ["dashboard.trips"]],
    ["requests", ["requests.print"]], ["inspections", ["inspections.config"]],
    ["reports", ["reports.fuel", "reports.annual"]],
  ];
  for (const [parent, children] of descendants) if (keys.has(parent)) children.forEach(key => keys.add(key));
  // These pages were previously available to every signed-in account.
  keys.add("profile"); keys.add("change_password");
  return [...keys];
}
export function storedPermissions(values: unknown, version: number | undefined): PermissionKey[] {
  return version === PERMISSION_VERSION ? (Array.isArray(values) ? [...new Set(values.filter(isPermissionKey))] : []) : expandLegacyPermissions(values);
}
export function defaultPermissions(role: string): PermissionKey[] {
  return role === "ADMIN" ? PERMISSION_SECTIONS.map(s => s.key)
    : role === "USER" || role === "TESTER" ? ["booking", "my_requests", "my_requests.evaluate", "profile", "change_password"]
    : role === "DRIVER" ? ["profile", "change_password"] : [];
}
export function hasAccess(profile: AccessProfile, requirement: Requirement): boolean {
  if (!VALID_ROLES.includes(profile.role)) return false;
  if (Array.isArray(requirement)) return requirement.some(r => hasAccess(profile, r));
  return profile.role === "ADMIN" || requirement === "signed_in" ||
    (requirement !== "admin" && profile.permissions.includes(requirement));
}
const under = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);
export function pageRequirement(href: string): Requirement | null {
  const [path, query] = href.split("?");
  if (under(path, "/admin/drivers/leaves")) return "drivers.leave";
  if (under(path, "/admin/permissions") || under(path, "/admin/users") || under(path, "/admin/user")) return "admin";
  if (under(path, "/admin/print-request")) return "requests.print";
  if (under(path, "/admin/dashboard")) return "dashboard.trips";
  if (under(path, "/admin/inspections/config")) return "inspections.config";
  if (under(path, "/user/evaluate")) return "my_requests.evaluate";
  if (path === "/admin/reports") {
    const tab = new URLSearchParams(query).get("tab");
    if (tab === "MONTHLY") return "reports";
    if (tab === "FUEL") return "reports.fuel";
    if (tab === "ANNUAL") return "reports.annual";
    return ["reports", "reports.fuel", "reports.annual"];
  }
  for (const s of PERMISSION_SECTIONS) {
    if (s.href !== "/admin" && !s.href.includes("?") && !s.href.includes("[") && under(path, s.href)) return s.key;
  }
  if (path === "/admin") return "dashboard";
  if (under(path, "/admin")) return "admin";
  if (under(path, "/user")) return "signed_in";
  return null;
}
// Unknown admin APIs remain admin-only.
export function apiRequirement(path: string, method = "GET"): Requirement | null {
  if (path === "/api/admin/driver-leaves") return "drivers.leave";
  if (path === "/api/admin/driver-availability") return ["requests", "booking"];
  if (path === "/api/admin/reports/fuel") return "reports.fuel";
  if (path === "/api/admin/reports/annual") return "reports.annual";
  if (path === "/api/user/evaluation-requests") return "my_requests.evaluate";
  if (path === "/api/user/evaluate" || under(path, "/api/user/get-evaluation")) return "my_requests.evaluate";
  if (["/api/user/update-profile", "/api/user/link-line", "/api/user/unlink-line"].includes(path)) return "profile";
  if (path === "/api/user/change-password") return "change_password";
  if (under(path, "/api/admin/permissions")) return "admin";
  if (["driver-status", "get-next-queue", "set-next-queue", "renumber-queue", "settings"].some(p => path === `/api/admin/${p}`)) return ["requests", "drivers"];
  if (path === "/api/admin/sync-line-pictures") return "admin";
  const groups: [Requirement, string[]][] = [
    ["dashboard", ["dashboard-stats", "reports-summary", "monthly-summary"]],
    ["requests", ["update-booking", "assign-next-driver", "assign-manual-driver", "notify-no-drivers", "resequence-codes"]],
    ["drivers", ["delete-driver", "driver-status", "renumber-queue", "fix-queue-order", "get-next-queue", "set-next-queue", "settings"]],
    ["reports", ["reports"]], ["evaluations", ["evaluation-word"]],
    ["maintenance", ["issues"]], ["fogging", ["fogging"]], ["duty", ["duty-mileage"]],
  ];
  for (const [permission, paths] of groups) {
    if (paths.some(p => under(path, `/api/admin/${p}`))) return permission;
  }
  if (under(path, "/api/admin") || path === "/api/reset-password") return "admin";
  if (path === "/api/user/create-booking") return ["booking", "requests"];
  if (["my-requests", "update-booking", "update-purpose", "cancel-request", "evaluate", "get-evaluation"].some(p => under(path, `/api/user/${p}`))) return "my_requests";
  if (path === "/api/user/get-vehicles" && method === "GET") return null;
  if (path === "/api/user/find-user") return "admin";
  if (under(path, "/api/user") || path === "/api/permissions/me") return "signed_in";
  if (path === "/api/duty-settings" && method !== "GET") return "duty";
  if (under(path, "/api/vehicle-inspections/config") && method !== "GET") return "inspections.config";
  if (path === "/api/vehicle-inspections" && method === "DELETE") return "inspections";
  return null;
}
