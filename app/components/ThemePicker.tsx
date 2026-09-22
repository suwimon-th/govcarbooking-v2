'use client';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor, Palette, X } from 'lucide-react';
import { DEFAULT_COLORS, safeColor, applyColors, type ThemeColors } from '@/lib/theme-colors';
import InlineColorPicker from './InlineColorPicker';
import s from './ThemePicker.module.css';
type Theme = 'light' | 'dark' | 'system';
const valid = (value: string | null): Theme => value === 'dark' || value === 'light' ? value : 'system';
export default function ThemePicker() {
  const [colors, setColors] = useState<ThemeColors>(DEFAULT_COLORS);
  const [theme, setTheme] = useState<Theme>('system'); const [open, setOpen] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      let value: Theme = 'system'; try { value = valid(localStorage.getItem('govcar-theme')); } catch {}
      let saved = DEFAULT_COLORS;
      try { const stored = JSON.parse(localStorage.getItem('govcar-colors') || '{}'); saved = { sidebar: safeColor(stored.sidebar, DEFAULT_COLORS.sidebar), accent: safeColor(stored.accent, DEFAULT_COLORS.accent) }; } catch {}
      setColors(saved); applyColors(saved);
      setTheme(value); document.documentElement.setAttribute('data-theme', value === 'system' ? media.matches ? 'dark' : 'light' : value);
    };
    apply(); media.addEventListener('change', apply); window.addEventListener('storage', apply);
    return () => { media.removeEventListener('change', apply); window.removeEventListener('storage', apply); };
  }, []);
  function changeColors(next: ThemeColors) {
    setColors(next); applyColors(next);
    try { localStorage.setItem('govcar-colors', JSON.stringify(next)); } catch {}
  }
  function choose(value: Theme) {
    setTheme(value); try { localStorage.setItem('govcar-theme', value); } catch {}
    document.documentElement.setAttribute('data-theme', value === 'system' ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' : value);
  }
  return <div className={s.root} onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}>
    {open && <section className={s.panel} aria-label="ตั้งค่าธีม"><div className={s.heading}><strong>รูปแบบหน้าจอ</strong><button aria-label="ปิดตั้งค่าธีม" onClick={() => setOpen(false)}><X size={18}/></button></div><div className={s.options}>{([{value:'light',label:'สว่าง',Icon:Sun},{value:'dark',label:'มืด',Icon:Moon},{value:'system',label:'ตามระบบ',Icon:Monitor}] as const).map(({value,label,Icon}) => <button key={value} aria-pressed={theme === value} onClick={() => choose(value)} className={theme === value ? s.selected : ''}><Icon size={20}/>{label}</button>)}</div><div className={s.colorSection}><strong>สีที่ชอบ</strong><div className={s.presets}>{[{name:'น้ำเงิน',sidebar:'#1e40af',accent:'#2456d9'},{name:'เขียว',sidebar:'#164e43',accent:'#087f5b'},{name:'ม่วง',sidebar:'#4c1d95',accent:'#7c3aed'},{name:'กรมท่า',sidebar:'#172b4d',accent:'#0369a1'},{name:'เทา',sidebar:'#27272a',accent:'#52525b'}].map(p => <button key={p.name} title={p.name} aria-label={`ชุดสี${p.name}`} aria-pressed={colors.sidebar === p.sidebar && colors.accent === p.accent} onClick={() => changeColors({ sidebar:p.sidebar,accent:p.accent })} style={{background:p.sidebar}} />)}</div>{([{key:'sidebar',label:'สีแถบ Sidebar'},{key:'accent',label:'สีปุ่มหลักและแท็บ'}] as const).map(item => <InlineColorPicker key={item.key} label={item.label} value={colors[item.key]} onChange={value => changeColors({...colors,[item.key]:value})} />)}<button className={s.reset} onClick={() => { changeColors(DEFAULT_COLORS); choose('system'); }}>คืนค่าเริ่มต้น</button></div><p>จำการตั้งค่าไว้ในเบราว์เซอร์นี้</p></section>}
    <button className={s.trigger} aria-expanded={open} aria-label="เปลี่ยนธีม" title="เปลี่ยนธีม" onClick={() => setOpen(!open)}><Palette size={20}/><span>ธีม</span></button>
  </div>;
}
