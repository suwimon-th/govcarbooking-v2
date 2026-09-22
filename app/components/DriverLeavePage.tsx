'use client';
import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, AlertTriangle, ArrowRight, Plus, UserRound, RefreshCw } from 'lucide-react';
import s from './Operations.module.css';
type Leave = { full_day?: boolean; id: string; driver_id: string; start_at: string; end_at: string; remark: string; cancelled_at: string | null };
type Data = { local?: boolean; leaves: Leave[]; drivers: { id: string; full_name: string }[]; conflicts: { id: string; request_code: string }[] };
export default function DriverLeavePage({ admin = false, demo = false }: { admin?: boolean; demo?: boolean }) {
  const [data, setData] = useState<Data>({ leaves: [], drivers: [], conflicts: [] });
  const [token, setToken] = useState<string | null>(admin || demo ? '' : null);
  const [view, setView] = useState('active'); const [search, setSearch] = useState('');
  const [success, setSuccess] = useState(''); const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [driver, setDriver] = useState(''); const [fullDay, setFullDay] = useState(true);
  const [start, setStart] = useState(''); const [end, setEnd] = useState(''); const [remark, setRemark] = useState('');
  const endpoint = demo ? '/api/driver/leaves/demo' : admin ? '/api/admin/driver-leaves' : '/api/driver/leaves';
  useEffect(() => {
    if (admin || demo) return;
    (async () => {
      const { default: liff } = await import('@line/liff');
      if (window.location.protocol !== 'https:') {
        throw new Error('LINE จริงต้องเปิดผ่าน URL ทดสอบ HTTPS ที่ตั้งเป็น Endpoint ของ LIFF ก่อน ลิงก์ localhost นี้ยังใช้ LINE Login ไม่ได้');
      }
      const id = (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_LINE_LIFF_ID_DRIVER_TEST) || process.env.NEXT_PUBLIC_LINE_LIFF_ID_DRIVER;
      if (!id) throw new Error('ยังไม่ได้ตั้งค่า LINE สำหรับคนขับ');
      await liff.init({ liffId: id });
      if (!liff.isLoggedIn()) { liff.login({ redirectUri: window.location.href }); return; }
      setToken(liff.getAccessToken());
    })().catch(e => setError(e.message));
  }, [admin, demo]);
  const load = useCallback(async (body?: object) => {
    if (token === null) return;
    setBusy(true); setError(''); if (body) setSuccess('');
    try {
      const res = await fetch(endpoint, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, cache: 'no-store', ...(body ? { body: JSON.stringify(body) } : {}) });
      const json = await res.json(); if (!res.ok) throw new Error(json.error);
      setData(json); setLoaded(true); if (body) setSuccess('บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว'); return true;
    } catch (e) { setError(e instanceof Error ? e.message : 'ดำเนินการไม่สำเร็จ'); return false; }
    finally { setBusy(false); }
  }, [endpoint, token]);
  useEffect(() => { void load(); }, [load]);
  function period() {
    if (!fullDay) return { full_day: false, start_at: `${start}:00+07:00`, end_at: `${end}:00+07:00` };
    const next = new Date(`${end}T00:00:00+07:00`); next.setUTCDate(next.getUTCDate() + 1);
    return { full_day: true, start_at: `${start}T00:00:00+07:00`, end_at: next.toISOString() };
  }
  const format = (value: string) => new Date(value).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' });
  // Older local records lack a flag; midnight-to-midnight Bangkok intervals were full-day leaves.
  const isFullDay = (l: Leave) => l.full_day ?? [l.start_at, l.end_at].every(value => {
    const date = new Date(Date.parse(value) + 7 * 3600000);
    return date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
  });
  const dateOnly = (value: string | number) => new Date(value).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric' });
  const now = Date.now();
  const state = (l: Leave) => l.cancelled_at ? 'cancelled' : Date.parse(l.end_at) <= now ? 'past' : Date.parse(l.start_at) <= now ? 'today' : 'upcoming';
  const name = (id: string) => data.drivers.find(d => d.id === id)?.full_name || 'คนขับ';
  const active = data.leaves.filter(l => ['today', 'upcoming'].includes(state(l)));
  const visible = data.leaves.filter(l => (view === 'all' || (view === 'active' ? ['today', 'upcoming'].includes(state(l)) : view === 'history' ? ['past', 'cancelled'].includes(state(l)) : state(l) === view)) && `${name(l.driver_id)} ${l.remark}`.toLowerCase().includes(search.toLowerCase())).sort((a,b) => view === 'history' ? Date.parse(b.start_at)-Date.parse(a.start_at) : Date.parse(a.start_at)-Date.parse(b.start_at));
  const labels: Record<string,string> = { today:'กำลังลา', upcoming:'ลาล่วงหน้า', past:'สิ้นสุดแล้ว', cancelled:'ยกเลิกแล้ว' };
  return <main className={s.page}>
    <header className={s.header}><div><h1 className={s.title}><CalendarDays size={28} color="#2456d9" />{admin ? 'วันลาคนขับ' : 'วันลาของฉัน'}</h1><p className={s.muted}>วางแผนวันลาและตรวจงานที่ต้องจัดคนขับแทน · เวลาประเทศไทย</p></div><button className={s.button} disabled={busy || token === null} onClick={() => void load()}><RefreshCw size={16}/>รีเฟรช</button></header>
    {demo && <p className={s.notice}>โหมดทดลอง: ทดสอบ ขับรถ · ไม่ต้องผูก LINE · บันทึกวันลาเฉพาะบนเครื่อง</p>}
    {error && <p role="alert" className={s.error}>{error}</p>}
    {success && <p role="status" className={s.success}>{success}</p>}
    <div className={s.stats}>
      {[{key:'today', label:'กำลังลา', count:data.leaves.filter(l => state(l) === 'today').length}, {key:'upcoming',label:'ลาล่วงหน้า',count:data.leaves.filter(l => state(l) === 'upcoming').length}, {key:'active',label:'วันลาที่ยังมีผล',count:active.length}, {key:'history',label:'ประวัติวันลา',count:data.leaves.length-active.length}].map(v => <button key={v.key} className={`${s.stat} ${view === v.key ? s.selected : ''}`} aria-pressed={view === v.key} onClick={() => setView(v.key)}><span>{v.label}</span><strong>{loaded ? v.count : '—'}</strong><span className={s.muted}>รายการลา</span></button>)}
    </div>
    {data.conflicts.length > 0 && <aside className={s.conflictNotice} aria-label="งานชนวันลา">
      <div className={s.conflictContext}>
        <span className={s.conflictIcon}><AlertTriangle size={19} aria-hidden="true" /></span>
        <div><h2>งานชนวันลา <span className={s.conflictCount}>{data.conflicts.length} งาน</span></h2>
          <p>{admin ? 'เลือกงานเพื่อจัดคนขับแทน' : 'กรุณาประสานแอดมินเพื่อจัดคนขับแทน'}</p>
        </div>
      </div>
      <div className={s.conflictActions}>
        {data.conflicts.map(b => admin ? <a key={b.id} className={s.button} href={`/admin/requests?conflict_ids=${encodeURIComponent(b.id)}`} aria-label={`จัดการคำขอ ${b.request_code || 'ไม่มีเลขคำขอ'}`}>
          {data.conflicts.length === 1 ? 'จัดการ ' : ''}{b.request_code || 'ไม่มีเลขคำขอ'}<ArrowRight size={14} aria-hidden="true" />
        </a> : <span key={b.id} className={s.badge}>{b.request_code || 'ไม่มีเลขคำขอ'}</span>)}
        {admin && data.conflicts.length > 1 && <a className={s.primary} href={`/admin/requests?conflict_ids=${encodeURIComponent(data.conflicts.map(b => b.id).join(','))}`}>จัดการทุกงาน<ArrowRight size={15} aria-hidden="true" /></a>}
      </div>
    </aside>}
    <div className={s.split}>
    <section className={s.panel}><div className={s.panelHead}><h2><Plus size={18} style={{display:'inline'}}/> เพิ่มวันลา</h2><span className={s.badge}>มีผลทันที</span></div>
    <form className={s.form} onSubmit={async e => { e.preventDefault(); try { if (await load({ driver_id: driver || data.drivers[0]?.id, ...period(), remark })) { setRemark(''); setStart(''); setEnd(''); setView('active'); } } catch { setError('กรุณาระบุวันลาให้ครบ'); } }}>
      {admin ? <label>คนขับ<select required value={driver} onChange={e => setDriver(e.target.value)}><option value="">เลือกคนขับ</option>{data.drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}</select></label> : <div className={s.person}><span className={s.avatar}><UserRound size={20}/></span>{data.drivers[0]?.full_name || 'กำลังตรวจสอบบัญชี LINE…'}</div>}
      <div><p style={{fontWeight:600,marginBottom:10}}>รูปแบบการลา</p><div className={s.tabs}>{[{value:true,label:'เต็มวัน'},{value:false,label:'ระบุช่วงเวลา'}].map(v => <button type="button" key={v.label} aria-pressed={fullDay === v.value} className={`${s.tab} ${fullDay === v.value ? s.selected : ''}`} onClick={() => { setFullDay(v.value); setStart(''); setEnd(''); }}>{v.label}</button>)}</div></div>
      <div className={s.fields}><label>เริ่มลา<input required type={fullDay ? 'date' : 'datetime-local'} value={start} onChange={e => { setStart(e.target.value); if (!end || end < e.target.value) setEnd(e.target.value); }} /></label><label>{fullDay ? 'วันสุดท้ายที่ลา' : 'สิ้นสุดลา'}<input required min={start} type={fullDay ? 'date' : 'datetime-local'} value={end} onChange={e => setEnd(e.target.value)} /></label></div>
      <p className={s.muted}>{fullDay ? 'ลาเต็มวันรวมวันสุดท้ายที่เลือก กลับมารับงานได้ในวันถัดไป' : 'คนขับจะไม่อยู่ในรายชื่อมอบหมายเฉพาะช่วงเวลาที่ลา'}</p>
      <label>หมายเหตุ <span className={s.muted}>ไม่บังคับ</span><textarea placeholder="รายละเอียดเพิ่มเติมสำหรับการจัดคิว" maxLength={500} value={remark} onChange={e => setRemark(e.target.value)} /></label>
      <button disabled={busy || token === null || !loaded} className={s.primary}>{busy ? 'กำลังดำเนินการ…' : 'บันทึกวันลา'}</button>
      <p className={s.muted}>หากต้องเปลี่ยนวันลา ให้ยกเลิกรายการเดิมแล้วเพิ่มใหม่</p>
    </form></section>
    <section className={s.panel}><div className={s.panelHead}><h2>รายการวันลา</h2><span className={s.badge}>{visible.length} รายการ</span></div><div className={s.toolbar}><label className={s.search}><span className={s.muted}>ค้นหารายการลา</span><input placeholder="ชื่อคนขับ หรือหมายเหตุ" value={search} onChange={e => setSearch(e.target.value)}/></label><label>แสดง<select value={view} onChange={e => setView(e.target.value)}><option value="active">วันที่ยังมีผล</option><option value="today">กำลังลา</option><option value="upcoming">ลาล่วงหน้า</option><option value="history">ประวัติ</option><option value="all">ทั้งหมด</option></select></label></div>
    {!loaded ? <div role="status" className={s.empty}>{error ? 'ยังโหลดรายการไม่ได้ กรุณาลองรีเฟรช' : 'กำลังโหลดวันลา…'}</div> : !visible.length ? <div className={s.empty}><CalendarDays size={32} style={{margin:'0 auto 12px'}}/><strong>ไม่มีรายการลาในหมวดนี้</strong><p>เพิ่มวันลาใหม่ หรือเลือกดูหมวดอื่น</p></div> : visible.map(l => <article key={l.id} className={s.leave}><div className={s.row}><div className={s.person}><span className={s.avatar}><UserRound size={20}/></span>{name(l.driver_id)}</div><span className={`${s.badge} ${state(l) === 'today' ? s.warning : ['past','cancelled'].includes(state(l)) ? s.neutral : ''}`}>{labels[state(l)]}</span></div><div className={s.period}><div><small>เริ่มลา</small>{isFullDay(l) ? dateOnly(l.start_at) : format(l.start_at)}</div><ArrowRight size={16}/><div><small>{isFullDay(l) ? 'วันสุดท้ายที่ลา' : 'กลับมารับงานได้'}</small>{isFullDay(l) ? dateOnly(Date.parse(l.end_at) - 1) : format(l.end_at)}</div></div>{l.remark && <p className={s.muted} style={{overflowWrap:'anywhere'}}>{l.remark}</p>}{!l.cancelled_at && Date.parse(l.end_at) > now && (admin || Date.parse(l.start_at) > now) && <div className={s.row}><span className={s.muted}>งดมอบหมายงานในช่วงเวลานี้</span><button className={s.danger} disabled={busy} onClick={() => { if (window.confirm(`ยืนยันยกเลิกวันลาของ ${name(l.driver_id)}?`)) void load({ id:l.id, driver_id:l.driver_id }); }}>ยกเลิกวันลา</button></div>}</article>)}
    </section></div><p className={s.muted} style={{marginTop:20}}>{data.local ? 'รุ่นทดลอง · ข้อมูลวันลาเก็บบนเครื่อง local' : 'ข้อมูลวันลาของระบบ'}</p>
  </main>;
}
