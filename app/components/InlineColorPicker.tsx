'use client';
import { useState } from 'react';
import s from './ThemePicker.module.css';
function channels(value: string) { return [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16)); }
export default function InlineColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value.toUpperCase());
  const rgb = channels(value);
  function update(hex: string) { setDraft(hex.toUpperCase()); onChange(hex); }
  return <div className={s.colorControl}>
    <div className={s.colorRow}><span>{label}<small>{value.toUpperCase()}</small></span><button type="button" className={s.swatch} style={{ backgroundColor: value }} aria-label={`เลือก${label}`} aria-expanded={open} onClick={() => { setDraft(value.toUpperCase()); setOpen(!open); }} /></div>
    {open && <div className={s.inlinePicker} role="group" aria-label={`ปรับ${label}`}>
      {['แดง', 'เขียว', 'น้ำเงิน'].map((channel, index) => <label className={s.sliderRow} key={channel}><span>{channel}</span><input type="range" min="0" max="255" value={rgb[index]} aria-label={`${label} ช่อง${channel}`} onChange={e => { const next = [...rgb]; next[index] = Number(e.target.value); update('#' + next.map(n => n.toString(16).padStart(2, '0')).join('')); }} /><output>{rgb[index]}</output></label>)}
      <label className={s.hexRow}>รหัสสี HEX<input type="text" value={draft} maxLength={7} spellCheck={false} aria-label={`รหัส${label}`} onChange={e => { const next = e.target.value; setDraft(next); if (/^#[0-9a-f]{6}$/i.test(next)) onChange(next); }} onBlur={() => setDraft(value.toUpperCase())} /></label>
      <button type="button" className={s.reset} onClick={() => setOpen(false)}>เสร็จสิ้น</button>
    </div>}
  </div>;
}
