'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, X, ArrowRight } from 'lucide-react';
import { useAccess } from '@/lib/use-access';
import { PERMISSION_MODULES, PERMISSION_SECTIONS } from '@/lib/permissions';
import s from './SidebarSearch.module.css';
export type SearchMenu = { href: string; label: string };
export default function SidebarSearch({ value, onChange, compact, onExpand, onNavigate, extras = [] }: { value: string; onChange: (value: string) => void; compact?: boolean; onExpand?: () => void; onNavigate?: () => void; extras?: SearchMenu[] }) {
  const { canVisit } = useAccess(); const pathname = usePathname();
  const query = value.trim().toLocaleLowerCase();
  const entries = [...PERMISSION_SECTIONS.filter(p => !p.href.includes('[')), ...extras];
  const seen = new Set<string>();
  const results = entries.filter(p => {
    if (seen.has(p.href) || !canVisit(p.href)) return false;
    seen.add(p.href);
    const parent = PERMISSION_MODULES.find(m => m.pages.some(key => PERMISSION_SECTIONS.find(s => s.key === key)?.href === p.href));
    return `${p.label} ${parent?.label || ''} ${p.href}`.toLocaleLowerCase().includes(query);
  });
  if (compact) return <button type="button" className={s.expand} aria-label="ขยาย sidebar เพื่อค้นหาเมนู" title="ค้นหาเมนู" onClick={onExpand}><Search size={19}/></button>;
  return <div className={s.root}><div className={s.field}><Search size={16} aria-hidden="true"/><input aria-label="ค้นหาเมนู" placeholder="ค้นหาเมนู…" value={value} onChange={e => onChange(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') onChange(''); }} />{value && <button type="button" aria-label="ล้างคำค้นหา" onClick={() => onChange('')}><X size={15}/></button>}</div>
    {query && <div className={s.results}><p role="status" className={s.count}>{results.length ? `พบ ${results.length} เมนู` : 'ไม่พบเมนูที่ค้นหา'}</p>{results.map(p => <Link key={p.href} href={p.href} className={`${s.result} ${pathname === p.href ? s.active : ''}`} aria-current={pathname === p.href ? 'page' : undefined} onClick={() => { onChange(''); onNavigate?.(); }}><span>{p.label}</span><ArrowRight size={14}/></Link>)}{!results.length && <p className={s.hint}>ลองคำว่า วันลา คนขับ หรือรายงาน</p>}</div>}
  </div>;
}
