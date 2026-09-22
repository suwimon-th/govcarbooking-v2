"use client";
import styles from "./permissions.module.css";
import { useEffect, useState } from "react";
import { ShieldCheck, Search, Save, RotateCcw } from "lucide-react";
import { defaultPermissions, PERMISSION_SECTIONS, PERMISSION_MODULES, PERMISSION_VERSION, FIXED_ACCESS_MODULES, type PermissionKey } from "@/lib/permissions";

type Person = { id: string; full_name: string | null; username: string | null; role: string; permissions: PermissionKey[]; custom: boolean };
export default function PermissionsPage() {
  const [users, setUsers] = useState<Person[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<PermissionKey[]>([]);
  const [moduleSearch, setModuleSearch] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [storageReady, setStorageReady] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const selected = users.find(u => u.id === selectedId);
  const dirty = !!selected && [...draft].sort().join() !== [...selected.permissions].sort().join();
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/permissions", { cache: "no-store", signal: controller.signal })
      .then(async res => { const data = await res.json(); if (!res.ok) throw new Error(data.error || "โหลดข้อมูลไม่สำเร็จ"); return data; })
      .then(data => { setUsers(data.users); setStorageReady(data.storage_ready !== false); setError(""); })
      .catch(err => { if (err.name !== "AbortError") setError(err.message || "เชื่อมต่อไม่ได้"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function select(user: Person) {
    if (saving || (dirty && !window.confirm("มีการเปลี่ยนแปลงที่ยังไม่บันทึก ต้องการเปลี่ยนผู้ใช้และทิ้งการแก้ไขหรือไม่?"))) return;
    setSelectedId(user.id); setDraft([...user.permissions]); setError(""); setMessage("");
  }
  async function save() {
    if (!selected || selected.role === "ADMIN" || saving || !storageReady) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const res = await fetch("/api/admin/permissions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: selected.id, permissions: draft, permission_version: PERMISSION_VERSION }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      setUsers(current => current.map(u => u.id === selected.id ? { ...u, permissions: data.permissions, custom: true } : u));
      setDraft(data.permissions);
      setMessage(`บันทึกสิทธิ์ของ ${selected.full_name || selected.username} แล้ว มีผลเมื่อเปิดหน้าหรือเรียกใช้งานครั้งถัดไป`);
    } catch (err) { setError(err instanceof Error ? err.message : "เชื่อมต่อไม่ได้ กรุณาลองใหม่"); }
    finally { setSaving(false); }
  }
  const filtered = users.filter(u => `${u.full_name || ""} ${u.username || ""}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="mx-auto max-w-6xl p-4 md:p-8">
    <div className="mb-6 flex items-start gap-3"><ShieldCheck className="mt-1 h-8 w-8 text-blue-700" /><div><h1 className="text-2xl font-bold text-gray-900">จัดการสิทธิ์การเข้าถึง</h1><p className="mt-1 text-sm text-gray-600">เลือกผู้ใช้ แล้วกำหนดหน้าหลักและหน้าย่อยที่อนุญาตให้ใช้งาน</p></div></div>
    <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">เลือกทั้งโมดูล หรือเลือกเฉพาะหน้าย่อยได้อย่างอิสระ สิทธิ์แต่ละหน้ารวมการทำงานเดิมทั้งหมด ผู้ดูแลระบบเข้าถึงได้ทุกส่วนและเป็นผู้จัดการบัญชีและสิทธิ์เท่านั้น<p className="mt-1">ครอบคลุมหน้าภายในระบบ ส่วนปฏิทินและแบบฟอร์มสาธารณะ รวมถึงลิงก์งานคนขับจาก LINE ใช้การเข้าถึงเดิม</p></div>
    {!storageReady && <div role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">เชื่อมต่อ Supabase จริงแล้ว แต่ยังไม่มีตารางเก็บสิทธิ์ ขณะนี้แสดงสิทธิ์เดิมและยังบันทึกไม่ได้ กรุณาติดตั้งตารางจาก scripts/expand_user_access_permissions.sql แล้วรีเฟรชหน้านี้</div>}
    {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}{users.length === 0 && <button className="ml-3 underline" onClick={() => { setLoading(true); setReload(n => n + 1); }}>ลองใหม่</button>}</div>}
    {message && <div role="status" className="mb-4 rounded-xl bg-green-50 p-4 text-green-800">{message}</div>}
    <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"><label htmlFor="permission-search" className="mb-2 block text-sm font-semibold">ผู้ใช้งาน ({users.length})</label><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><input id="permission-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อหรือชื่อผู้ใช้" className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-sm" /></div>
        <div className="mt-3 max-h-[560px] space-y-2 overflow-y-auto">{loading ? <p role="status" className="p-4 text-sm text-gray-500">กำลังโหลดผู้ใช้...</p> : filtered.length === 0 ? <p className="p-4 text-sm text-gray-500">ไม่พบผู้ใช้</p> : filtered.map(u => <button key={u.id} disabled={saving} onClick={() => select(u)} aria-pressed={selectedId === u.id} className={`w-full rounded-xl border p-3 text-left transition-colors disabled:opacity-60 ${selectedId === u.id ? "border-blue-500 bg-blue-50" : "border-gray-100 hover:bg-gray-50"}`}><span className="block font-semibold text-gray-900">{u.full_name || u.username || "ไม่ระบุชื่อ"}</span><span className="mt-1 block text-xs text-gray-500">{u.role} · {u.role === "ADMIN" ? "ทุกส่วน" : `${u.permissions.length} หน้า`}{u.role !== "ADMIN" && !u.custom ? " · ค่าเริ่มต้น" : ""}</span></button>)}</div>
      </aside>
      <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">{!selected ? <div className="flex min-h-64 items-center justify-center text-gray-500">เลือกผู้ใช้เพื่อดูและแก้ไขสิทธิ์</div> : <>
        <h2 className="text-lg font-bold text-gray-900">{selected.full_name || selected.username}</h2><p className="mt-1 text-sm text-gray-500">{selected.username || "ไม่มีชื่อผู้ใช้"} · {selected.role}</p>
        {selected.role === "ADMIN" && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">บัญชีผู้ดูแลระบบเข้าถึงทุกส่วนเสมอ ไม่สามารถปิดสิทธิ์จากหน้านี้</p>}
        <label htmlFor="permission-module-search" className="mb-2 mt-5 block text-sm font-semibold">ค้นหาโมดูลหรือหน้า</label>
        <input id="permission-module-search" value={moduleSearch} onChange={e => setModuleSearch(e.target.value)} placeholder="ค้นหาชื่อ เช่น รายงาน หรือตรวจสภาพรถ" className="mb-4 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" />
        <fieldset disabled={saving || !storageReady || selected.role === "ADMIN"} className={`${styles.fields} space-y-6`}>
          {["งานส่วนตัว", "งานจัดการ"].map(group => {
            const modules = PERMISSION_MODULES.filter(module => module.group === group &&
              `${module.label} ${module.pages.map(key => { const page = PERMISSION_SECTIONS.find(p => p.key === key)!; return `${page.label} ${page.href}`; }).join(" ")}`.toLowerCase().includes(moduleSearch.trim().toLowerCase()));
            if (!modules.length) return null;
            return <div key={group}><h3 className="mb-3 text-base font-bold text-gray-800">{group}</h3><div className="grid min-w-0 grid-cols-1 gap-4">{modules.map(module => {
              const checkedCount = module.pages.filter(key => draft.includes(key)).length;
              const allChecked = checkedCount === module.pages.length;
              return <section key={module.key} className={`overflow-hidden rounded-xl border ${checkedCount ? "border-blue-200" : "border-gray-200"}`}>
                <label className={`${styles.moduleHeader} cursor-pointer bg-gray-50 font-semibold`}>
                  <input type="checkbox" aria-label={`เลือกทุกหน้าใน${module.label}`} checked={allChecked} ref={node => { if (node) node.indeterminate = checkedCount > 0 && !allChecked; }} onChange={e => setDraft(current => e.target.checked ? [...new Set([...current, ...module.pages])] : current.filter(key => !module.pages.includes(key)))} className={styles.checkbox} />
                  <span>{module.label}</span><span className="whitespace-nowrap text-sm font-normal text-gray-600">{checkedCount}/{module.pages.length} หน้า</span>
                </label>
                <div className="space-y-1 border-t border-gray-100 p-2">{module.pages.map(key => {
                  const page = PERMISSION_SECTIONS.find(p => p.key === key)!;
                  return <label key={key} className={`${styles.pageRow} cursor-pointer rounded-lg ${draft.includes(key) ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                    <input type="checkbox" checked={draft.includes(key)} onChange={e => setDraft(current => e.target.checked ? [...new Set([...current, key])] : current.filter(k => k !== key))} className={styles.checkbox} />
                    <span>{page.label}</span>
                  </label>;
                })}</div>
              </section>;
            })}</div></div>;
          })}
          {moduleSearch && !PERMISSION_MODULES.some(module => `${module.label} ${module.pages.map(key => { const page = PERMISSION_SECTIONS.find(p => p.key === key)!; return `${page.label} ${page.href}`; }).join(" ")}`.toLowerCase().includes(moduleSearch.trim().toLowerCase())) && <p className="py-4 text-center text-sm text-gray-500">ไม่พบโมดูลหรือหน้าที่ค้นหา</p>}
        </fieldset>
        {selected.role !== "ADMIN" && <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5"><div className="flex flex-wrap gap-3"><button disabled={saving} onClick={() => setDraft(defaultPermissions(selected.role))} className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-700 disabled:opacity-50"><RotateCcw className="h-4 w-4" />ใช้ค่าเริ่มต้น</button><button disabled={saving} onClick={() => setDraft([])} className="text-sm text-gray-600 disabled:opacity-50">ปิดทุกส่วน</button></div><button onClick={save} disabled={saving || !dirty || !storageReady} className="flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"><Save className="h-4 w-4" />{saving ? "กำลังบันทึก..." : "บันทึกสิทธิ์"}</button>{dirty && <p className="w-full text-sm text-amber-700">มีการเปลี่ยนแปลงที่ยังไม่บันทึก</p>}</div>}
      </>}</section>
    </div>
    <details className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
      <summary className="cursor-pointer text-sm font-semibold text-gray-700">โมดูลอื่นและขอบเขตสิทธิ์ที่คงไว้</summary>
      <p className="mt-3 text-sm text-gray-500">หน้าด้านล่างแสดงเพื่อให้เห็นภาพรวมครบ โดยไม่เปลี่ยนการเข้าถึงเดิมของหน้าสาธารณะ งานคนขับ และหน้าที่สงวนให้ ADMIN</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{FIXED_ACCESS_MODULES.map(module => <section key={module.label} className="rounded-xl bg-gray-50 p-4"><h3 className="text-sm font-semibold">{module.label}</h3><p className="mt-1 text-xs text-blue-700">{module.access}</p><ul className="mt-2 space-y-1">{module.pages.map(page => <li key={page} className="break-words text-xs leading-5 text-gray-500">{page}</li>)}</ul></section>)}</div>
    </details>
  </div>;
}
