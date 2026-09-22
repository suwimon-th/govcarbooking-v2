'use client';
import { useCallback, useEffect, useState } from 'react';
import { Gauge, RefreshCw, ArrowRight, Search } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getStatusLabel } from '@/lib/statusHelper';
import { useAccess } from '@/lib/use-access';
import s from '@/app/components/Operations.module.css';
type Booking = { id: string; request_code: string; requester_name: string; status: string; start_mileage: number | null; end_mileage: number | null; start_at: string | null };
const needsMileage = (b: Booking) => ['IN_PROGRESS', 'COMPLETED'].includes(b.status) && (b.start_mileage === null || (b.status === 'COMPLETED' && b.end_mileage === null));
const number = (n: number | null) => n === null ? 'ยังไม่บันทึก' : n.toLocaleString('th-TH');
export default function DashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [search, setSearch] = useState(''); const [filter, setFilter] = useState('all'); const [page, setPage] = useState(1);
  const [updated, setUpdated] = useState('');
  const { can } = useAccess();
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data, error } = await supabase.from('bookings').select('id,request_code,requester_name,status,start_mileage,end_mileage,start_at').order('start_at', { ascending: false }).limit(1000);
      if (error) throw error;
      setBookings(data || []); setUpdated(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));
    } catch { setError('โหลดรายการงานไม่สำเร็จ กรุณาลองอีกครั้ง'); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void load();
    const channel = supabase.channel('bookings-mileage').on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => { void load(); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);
  const matches = (b: Booking) => filter === 'all' || (filter === 'active' ? ['ASSIGNED','ACCEPTED','IN_PROGRESS'].includes(b.status) : filter === 'missing' ? needsMileage(b) : b.status === 'COMPLETED');
  const filtered = bookings.filter(b => matches(b) && `${b.request_code} ${b.requester_name}`.toLowerCase().includes(search.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 20)); const current = Math.min(page, pages); const visible = filtered.slice((current - 1) * 20, current * 20);
  const stats = [{ key:'all', label:'งานทั้งหมด', count:bookings.length }, { key:'active', label:'งานระหว่างดำเนินการ', count:bookings.filter(b => ['ASSIGNED','ACCEPTED','IN_PROGRESS'].includes(b.status)).length }, { key:'missing', label:'รอบันทึกเลขไมล์', count:bookings.filter(needsMileage).length }, { key:'completed', label:'เสร็จสิ้นแล้ว', count:bookings.filter(b => b.status === 'COMPLETED').length }];
  const distance = (b: Booking) => b.start_mileage !== null && b.end_mileage !== null ? b.end_mileage >= b.start_mileage ? `${(b.end_mileage - b.start_mileage).toLocaleString('th-TH')} กม.` : 'ตรวจสอบเลขไมล์' : '—';
  const badge = (b: Booking) => `${s.badge} ${b.status === 'COMPLETED' ? s.good : ['CANCELLED','REJECTED'].includes(b.status) ? s.neutral : s.warning}`;
  return <main className={s.page}>
    <header className={s.header}><div><h1 className={s.title}><Gauge size={28} color="#2456d9" />สถานะงานและเลขไมล์</h1><p className={s.muted}>ติดตามการเดินทางและตรวจรายการที่ยังบันทึกเลขไมล์ไม่ครบ</p></div><button className={s.button} disabled={loading} onClick={() => void load()}><RefreshCw size={16} />{loading ? 'กำลังโหลด…' : 'รีเฟรชข้อมูล'}</button></header>
    {error && <div role="alert" className={s.error}>{error}</div>}
    <div className={s.stats}>{stats.map(stat => <button key={stat.key} aria-pressed={filter === stat.key} className={`${s.stat} ${filter === stat.key ? s.selected : ''}`} onClick={() => { setFilter(stat.key); setPage(1); }}><span>{stat.label}</span><strong>{loading && !updated ? '—' : stat.count.toLocaleString('th-TH')}</strong><span className={s.muted}>ดูรายการ <ArrowRight size={13} style={{ display:'inline' }} /></span></button>)}</div>
    <section className={s.panel}><div className={s.panelHead}><div><h2>{stats.find(v => v.key === filter)?.label}</h2><p className={s.muted}>ข้อมูลล่าสุดสูงสุด 1,000 งาน · {updated ? `อัปเดต ${updated} น.` : 'กำลังโหลดข้อมูล'}</p></div><span className={s.badge}>{filtered.length} รายการ</span></div>
      <div className={s.toolbar}><label className={s.search}><span className={s.muted}><Search size={14} style={{ display:'inline' }} /> ค้นหางาน</span><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="เลขคำขอ หรือชื่อผู้ขอใช้รถ" /></label><label>แสดงรายการ<select value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>{stats.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}</select></label></div>
      {loading && !updated ? <div role="status" className={s.empty}>กำลังโหลดรายการงาน…</div> : !visible.length ? <div className={s.empty}>ไม่พบงานในรายการนี้<p>ลองเปลี่ยนตัวกรองหรือคำค้นหา</p></div> : <>
      <div className={`${s.tableWrap} ${s.desktop}`}><table className={s.table}><thead><tr><th>งาน / ผู้ขอใช้รถ</th><th>สถานะ</th><th>เลขไมล์ออก</th><th>เลขไมล์กลับ</th><th>ระยะทาง</th></tr></thead><tbody>{visible.map(b => <tr key={b.id}><td><strong>{b.request_code || 'ไม่มีเลขคำขอ'}</strong><p className={s.muted}>{b.requester_name}</p>{b.start_at && <p className={s.muted}>{new Date(b.start_at).toLocaleDateString('th-TH', { timeZone:'Asia/Bangkok', day:'numeric', month:'short', year:'numeric' })}</p>}</td><td><span className={badge(b)}>{getStatusLabel(b.status,b.request_code)}</span>{needsMileage(b) && <p className={s.muted}>รอบันทึกเลขไมล์ให้ครบ</p>}</td><td className={s.number}>{number(b.start_mileage)}</td><td className={s.number}>{number(b.end_mileage)}</td><td className={s.number}>{distance(b)}</td></tr>)}</tbody></table></div>
      <div className={s.mobile}>{visible.map(b => <article className={s.leave} key={b.id}><div className={s.row}><strong>{b.request_code || 'ไม่มีเลขคำขอ'}</strong><span className={badge(b)}>{getStatusLabel(b.status,b.request_code)}</span></div><p className={s.muted}>{b.requester_name}</p><div className={s.period}><div><small>เลขไมล์ออก</small>{number(b.start_mileage)}</div><ArrowRight size={16}/><div><small>เลขไมล์กลับ</small>{number(b.end_mileage)}</div></div><p className={s.muted}>ระยะทาง {distance(b)}{needsMileage(b) ? ' · รอบันทึกเลขไมล์ให้ครบ' : ''}</p></article>)}</div></>}
      <footer className={s.footer}><span className={s.muted}>หน้า {current} / {pages} · {filtered.length} รายการ</span><div className={s.tabs}><button className={s.button} disabled={current <= 1} onClick={() => setPage(current - 1)}>ก่อนหน้า</button><button className={s.button} disabled={current >= pages} onClick={() => setPage(current + 1)}>ถัดไป</button></div></footer>
    </section>{can('requests') && <p className={s.muted} style={{ marginTop:16 }}>ต้องการเปลี่ยนข้อมูลหรือมอบหมายคนขับ? <a href="/admin/requests" style={{ color:'#2456d9', textDecoration:'underline' }}>ไปจัดการคำขอ</a></p>}
  </main>;
}
