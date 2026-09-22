'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Layers, Users, Car, LayoutDashboard, FileText, Fuel, Wrench, ClipboardCheck, Star, CalendarDays, SprayCan } from 'lucide-react';
import { PERMISSION_MODULES, PERMISSION_SECTIONS } from '@/lib/permissions';
import { useAccess } from '@/lib/use-access';
import styles from './ModuleNavigation.module.css';
export function modulePages(key: string) {
  return (PERMISSION_MODULES.find(m => m.key === key)?.pages || []).map(key => PERMISSION_SECTIONS.find(s => s.key === key)!).filter(s => !s.href.includes('['));
}
const icons = { drivers: Users, vehicles: Car, dashboard: LayoutDashboard, requests: FileText, fuel: Fuel, maintenance: Wrench, inspections: ClipboardCheck, evaluations: Star, reports: FileText, fogging: SprayCan, duty: CalendarDays };
export default function ModuleNavigation({ keys, compact = false, onNavigate }: { keys?: string[]; compact?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname(); const { canVisit } = useAccess();
  const link = (p: ReturnType<typeof modulePages>[number], child = false) => {
    const Icon = p.key === 'drivers.leave' ? CalendarDays : icons[p.key.split('.')[0] as keyof typeof icons] || Layers;
    return <Link key={p.key} href={p.href} title={p.label} onClick={onNavigate} aria-current={pathname === p.href ? 'page' : undefined} className={`${styles.link} ${child ? styles.child : ''} ${pathname === p.href ? styles.active : ''}`}>
      {child ? <span className={styles.dot} aria-hidden="true"/> : <span className={styles.icon}><Icon size={18} aria-hidden="true"/></span>}<span className={styles.label}>{p.label}</span>
    </Link>;
  };
  return <div className={styles.navigation}>{PERMISSION_MODULES.filter(m => m.group === 'งานจัดการ' && (!keys || keys.includes(m.key))).map(m => {
    const Icon = icons[m.key as keyof typeof icons] || Layers;
    const pages = modulePages(m.key).filter(p => canVisit(p.href)); if (!pages.length) return null;
    const active = pages.some(p => p.href === pathname);
    if (compact) return <Link key={m.key} href={pages[0].href} title={m.label} aria-label={m.label} onClick={onNavigate} className={`${styles.link} ${styles.compact} ${active ? styles.active : ''}`}><span className={styles.icon}><Icon size={19} aria-hidden="true"/></span></Link>;
    if (pages.length === 1 && modulePages(m.key).length === 1) return link(pages[0]);
    return <details key={`${m.key}:${pathname}`} open={active} className={`${styles.group} ${active ? styles.currentGroup : ''}`}><summary className={styles.summary}><span className={styles.icon}><Icon size={18} aria-hidden="true"/></span><span className={styles.label}>{m.label}</span><ChevronDown size={15} className={styles.chevron} aria-hidden="true"/></summary><div className={styles.children}>{pages.map(p => link(p, true))}</div></details>;
  })}</div>;
}

export function ModuleTabs({ moduleKey }: { moduleKey: string }) {
  const pathname = usePathname(); const { canVisit } = useAccess();
  return <nav aria-label="หน้าย่อย" className={styles.tabBar}><div className={styles.tabTrack}>{modulePages(moduleKey).filter(p => canVisit(p.href)).map(p => {
    const Icon = p.key === 'drivers.leave' ? CalendarDays : icons[moduleKey as keyof typeof icons] || Layers;
    return <Link key={p.key} href={p.href} aria-current={pathname === p.href ? 'page' : undefined} className={`${styles.tab} ${pathname === p.href ? styles.tabActive : ''}`}><Icon size={18} aria-hidden="true"/>{p.label}</Link>;
  })}</div></nav>;
}
