'use client';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor, Palette, X, ChevronDown, RotateCcw, Check } from 'lucide-react';
import { DEFAULT_COLORS, safeColor, applyColors, type ThemeColors } from '@/lib/theme-colors';

type Theme = 'light' | 'dark' | 'system';
const valid = (v: string | null): Theme => v === 'dark' || v === 'light' ? v : 'system';

// ─── Preset Palettes ──────────────────────────────────────────────────────────
const PRESETS = [
  { name: 'น้ำเงินราชการ', sidebar: '#1e40af', accent: '#2456d9', tag: 'default' },
  { name: 'กรมท่า', sidebar: '#172b4d', accent: '#0369a1' },
  { name: 'เขียวขจี', sidebar: '#14532d', accent: '#16a34a' },
  { name: 'ฟ้าน้ำทะเล', sidebar: '#0c4a6e', accent: '#0284c7' },
  { name: 'ม่วงราชวัง', sidebar: '#4c1d95', accent: '#7c3aed' },
  { name: 'แดงราชการ', sidebar: '#7f1d1d', accent: '#dc2626' },
  { name: 'ส้มทอง', sidebar: '#7c2d12', accent: '#ea580c' },
  { name: 'ชมพูบานเย็น', sidebar: '#831843', accent: '#db2777' },
  { name: 'เทาดำ', sidebar: '#18181b', accent: '#52525b' },
  { name: 'เทาอ่อน', sidebar: '#334155', accent: '#475569' },
  { name: 'น้ำตาลดิน', sidebar: '#44260e', accent: '#92400e' },
  { name: 'เขียวมะกอก', sidebar: '#1a2e05', accent: '#4d7c0f' },
];

// ─── Font Presets ─────────────────────────────────────────────────────────────
const FONTS = [
  { name: 'Prompt (ราชการ)', value: 'Prompt' },
  { name: 'Sarabun (สบายตา)', value: 'Sarabun' },
  { name: 'Noto Sans Thai', value: 'Noto Sans Thai' },
  { name: 'IBM Plex Sans Thai', value: 'IBM Plex Sans Thai' },
];

function colorText(hex: string): '#111827' | '#ffffff' {
  const vals = [1, 3, 5].map(i => { const n = parseInt(hex.slice(i, i + 2), 16) / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; });
  const L = vals[0] * .2126 + vals[1] * .7152 + vals[2] * .0722;
  return (L + .05) / .05 > 1.05 / (L + .05) ? '#111827' : '#ffffff';
}

function hexToRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('');
}

// Mini inline color picker with R/G/B sliders + hex input
function MiniColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(value.toUpperCase());
  const rgb = hexToRgb(value);

  useEffect(() => { setHex(value.toUpperCase()); }, [value]);

  const update = (next: string) => { onChange(next); setHex(next.toUpperCase()); };
  const channelLabels = ['R', 'G', 'B'];
  const channelColors = ['#ef4444', '#22c55e', '#3b82f6'];

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium opacity-80">{label}</span>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[var(--theme-border,#dbe3ef)] hover:bg-black/5 transition-colors text-xs font-mono"
        >
          <span className="w-5 h-5 rounded-md border border-black/20 shrink-0" style={{ background: value }} />
          {value.toUpperCase()}
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="mt-2 p-3 rounded-xl border border-[var(--theme-border,#dbe3ef)] bg-[var(--card-bg)] space-y-2">
          {/* Color preview */}
          <div className="h-10 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: value, color: colorText(value) }}>
            {value.toUpperCase()}
          </div>
          {/* RGB sliders */}
          {channelLabels.map((ch, i) => (
            <label key={ch} className="flex items-center gap-2 text-xs">
              <span className="w-4 font-bold" style={{ color: channelColors[i] }}>{ch}</span>
              <input type="range" min={0} max={255} value={rgb[i]} className="flex-1 h-1.5 rounded-full cursor-pointer accent-current"
                style={{ accentColor: channelColors[i] }}
                onChange={e => { const next = [...rgb]; next[i] = Number(e.target.value); update(rgbToHex(next[0], next[1], next[2])); }} />
              <output className="w-8 text-right tabular-nums opacity-70">{rgb[i]}</output>
            </label>
          ))}
          {/* Hex input */}
          <label className="block text-xs">
            <span className="opacity-60">Hex #</span>
            <input type="text" value={hex} maxLength={7} spellCheck={false}
              className="mt-1 w-full px-2 py-1.5 border border-[var(--theme-border,#dbe3ef)] rounded-lg text-xs font-mono bg-[var(--card-bg)] text-[var(--foreground)]"
              onChange={e => { const v = e.target.value; setHex(v); if (/^#[0-9a-f]{6}$/i.test(v)) update(v); }}
              onBlur={() => setHex(value.toUpperCase())} />
          </label>
          <button type="button" onClick={() => setOpen(false)} className="w-full py-1.5 rounded-lg text-xs font-semibold bg-[var(--theme-selected,#e7eeff)] text-[var(--theme-accent,#1d4ed8)]">
            ✓ เสร็จสิ้น
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main ThemePicker ─────────────────────────────────────────────────────────
export default function ThemePicker() {
  const [colors, setColors] = useState<ThemeColors>(DEFAULT_COLORS);
  const [theme, setTheme] = useState<Theme>('system');
  const [font, setFont] = useState('Prompt');
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'theme' | 'color' | 'font'>('theme');

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      let value: Theme = 'system';
      try { value = valid(localStorage.getItem('govcar-theme')); } catch {}
      let saved = DEFAULT_COLORS;
      try {
        const stored = JSON.parse(localStorage.getItem('govcar-colors') || '{}');
        saved = { sidebar: safeColor(stored.sidebar, DEFAULT_COLORS.sidebar), accent: safeColor(stored.accent, DEFAULT_COLORS.accent) };
      } catch {}
      let savedFont = 'Prompt';
      try { savedFont = localStorage.getItem('govcar-font') || 'Prompt'; } catch {}
      setColors(saved); applyColors(saved);
      setTheme(value); setFont(savedFont);
      applyFont(savedFont);
      document.documentElement.setAttribute('data-theme', value === 'system' ? media.matches ? 'dark' : 'light' : value);
    };
    apply();
    media.addEventListener('change', apply);
    window.addEventListener('storage', apply);
    return () => { media.removeEventListener('change', apply); window.removeEventListener('storage', apply); };
  }, []);

  function applyFont(f: string) {
    document.documentElement.style.setProperty('--font-override', `'${f}', 'Sarabun', sans-serif`);
    document.documentElement.setAttribute('data-font', f);
  }

  function changeColors(next: ThemeColors) {
    setColors(next); applyColors(next);
    try { localStorage.setItem('govcar-colors', JSON.stringify(next)); } catch {}
  }

  function changeFont(f: string) {
    setFont(f); applyFont(f);
    try { localStorage.setItem('govcar-font', f); } catch {}
  }

  function choose(value: Theme) {
    setTheme(value);
    try { localStorage.setItem('govcar-theme', value); } catch {}
    document.documentElement.setAttribute('data-theme',
      value === 'system' ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' : value
    );
  }

  function reset() {
    changeColors(DEFAULT_COLORS);
    changeFont('Prompt');
    choose('system');
  }

  const isDark = theme === 'dark' || (theme === 'system' &&
    (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches));

  return (
    <div
      className="fixed right-4 bottom-4 z-[45] select-none"
      style={{ color: 'var(--foreground)' }}
      onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
    >
      {/* Panel */}
      {open && (
        <div className="mb-2 w-[300px] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-80px)] overflow-y-auto rounded-2xl border bg-[var(--card-bg)] shadow-2xl"
          style={{ borderColor: 'var(--theme-border, #dbe3ef)' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--theme-border, #dbe3ef)' }}>
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-blue-500" />
              <strong className="text-sm font-bold">ตั้งค่าธีม</strong>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"><X className="w-4 h-4" /></button>
          </div>

          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: 'var(--theme-border, #dbe3ef)' }}>
            {([['theme', 'โหมด'], ['color', 'สีธีม'], ['font', 'ฟอนต์']] as const).map(([t, l]) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 ${tab === t ? 'border-blue-500 text-blue-600' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                {l}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-4">
            {/* ─── Tab: Theme Mode ─── */}
            {tab === 'theme' && (
              <div className="space-y-3">
                <p className="text-xs opacity-60">เลือกโหมดการแสดงผล</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'light', label: 'สว่าง', Icon: Sun, desc: 'Light' },
                    { value: 'dark', label: 'มืด', Icon: Moon, desc: 'Dark' },
                    { value: 'system', label: 'ตามระบบ', Icon: Monitor, desc: 'Auto' },
                  ] as const).map(({ value, label, Icon, desc }) => (
                    <button key={value} onClick={() => choose(value)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${theme === value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-[var(--theme-border,#dbe3ef)] hover:border-blue-300 opacity-70 hover:opacity-100'
                      }`}>
                      <Icon className="w-5 h-5" />
                      <span>{label}</span>
                      {theme === value && <Check className="w-3 h-3 text-blue-500" />}
                    </button>
                  ))}
                </div>

                {/* Dark mode info */}
                <div className="p-3 rounded-xl text-xs space-y-1" style={{ background: 'var(--theme-selected, #e7eeff)' }}>
                  <div className="font-semibold opacity-80">📖 เกี่ยวกับโหมดมืด</div>
                  <div className="opacity-60">โหมดมืดปรับสีพื้นหลังและข้อความอัตโนมัติ เหมาะกับการใช้งานในที่มีแสงน้อย</div>
                </div>
              </div>
            )}

            {/* ─── Tab: Color ─── */}
            {tab === 'color' && (
              <div className="space-y-4">
                <p className="text-xs opacity-60">เลือกชุดสีสำหรับ Sidebar และปุ่มหลัก</p>

                {/* Preset grid */}
                <div>
                  <div className="text-xs font-semibold opacity-60 mb-2">ชุดสีสำเร็จรูป</div>
                  <div className="grid grid-cols-4 gap-2">
                    {PRESETS.map(p => {
                      const isSelected = colors.sidebar === p.sidebar && colors.accent === p.accent;
                      return (
                        <button key={p.name} title={p.name} onClick={() => changeColors({ sidebar: p.sidebar, accent: p.accent })}
                          className={`relative group flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${isSelected ? 'border-white shadow-lg scale-105' : 'border-transparent hover:scale-105'}`}
                          style={{ background: p.sidebar }}>
                          <div className="w-6 h-6 rounded-full border-2 border-white/40" style={{ background: p.accent }} />
                          {isSelected && <Check className="absolute top-1 right-1 w-3 h-3 text-white" />}
                          <span className="text-[9px] font-bold truncate w-full text-center" style={{ color: colorText(p.sidebar) }}>
                            {p.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom pickers */}
                <div className="border-t pt-4 space-y-3" style={{ borderColor: 'var(--theme-border, #dbe3ef)' }}>
                  <div className="text-xs font-semibold opacity-60">ปรับสีเอง</div>
                  <MiniColorPicker
                    label="สี Sidebar"
                    value={colors.sidebar}
                    onChange={v => changeColors({ ...colors, sidebar: v })}
                  />
                  <MiniColorPicker
                    label="สีปุ่มหลัก / Accent"
                    value={colors.accent}
                    onChange={v => changeColors({ ...colors, accent: v })}
                  />
                </div>

                {/* Preview */}
                <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--theme-border, #dbe3ef)' }}>
                  <div className="px-3 py-2 text-[10px] font-semibold" style={{ background: colors.sidebar, color: colorText(colors.sidebar) }}>
                    ตัวอย่าง Sidebar
                  </div>
                  <div className="p-3 flex gap-2">
                    <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: colors.accent }}>
                      ปุ่มหลัก
                    </button>
                    <button className="px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: colors.accent, color: colors.accent }}>
                      ปุ่มรอง
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Tab: Font ─── */}
            {tab === 'font' && (
              <div className="space-y-3">
                <p className="text-xs opacity-60">เลือกฟอนต์สำหรับการแสดงผล</p>
                <div className="space-y-2">
                  {FONTS.map(f => (
                    <button key={f.value} onClick={() => changeFont(f.value)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm transition-all ${font === f.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-[var(--theme-border,#dbe3ef)] hover:border-blue-300 opacity-70 hover:opacity-100'
                      }`}
                      style={{ fontFamily: `'${f.value}', sans-serif` }}>
                      <span>{f.name}</span>
                      {font === f.value && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
                <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--theme-selected, #e7eeff)', fontFamily: `'${font}', sans-serif` }}>
                  <div className="font-bold opacity-80">ตัวอย่างข้อความภาษาไทย</div>
                  <div className="opacity-60 text-xs mt-1">ระบบบริหารการใช้รถราชการ สำนักงานเขตจอมทอง</div>
                </div>
              </div>
            )}

            {/* Reset */}
            <button onClick={reset} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-semibold opacity-60 hover:opacity-100 transition-all"
              style={{ borderColor: 'var(--theme-border, #dbe3ef)' }}>
              <RotateCcw className="w-3.5 h-3.5" />
              คืนค่าเริ่มต้นทั้งหมด
            </button>

            <p className="text-center text-[10px] opacity-40">การตั้งค่าบันทึกในเบราว์เซอร์นี้เท่านั้น</p>
          </div>
        </div>
      )}

      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="เปลี่ยนธีม"
        title="เปลี่ยนธีม"
        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--theme-border, #dbe3ef)',
          color: 'var(--foreground)',
          boxShadow: '0 4px 20px rgba(16,32,68,0.14)',
        }}
      >
        {isDark ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
        <Palette className="w-4 h-4 opacity-60" />
        <span className="hidden sm:inline">ธีม</span>
      </button>
    </div>
  );
}
