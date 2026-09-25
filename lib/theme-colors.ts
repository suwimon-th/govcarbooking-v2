export const DEFAULT_COLORS = { sidebar: '#1e40af', accent: '#2456d9', text: '' };
export type ThemeColors = typeof DEFAULT_COLORS;
export function safeColor(value: unknown, fallback: string) { return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback; }
export function colorText(hex: string) {
  const values = [1,3,5].map(i => { const n = parseInt(hex.slice(i,i+2),16)/255; return n <= .04045 ? n/12.92 : ((n+.055)/1.055)**2.4; });
  const luminance = values[0]*.2126 + values[1]*.7152 + values[2]*.0722;
  return (luminance+.05)/.05 > 1.05/(luminance+.05) ? '#111827' : '#ffffff';
}
export function applyColors(colors: ThemeColors) {
  const style = document.documentElement.style;
  style.setProperty('--sidebar-bg', colors.sidebar);
  style.setProperty('--sidebar-fg', colorText(colors.sidebar));
  style.setProperty('--action-bg', colors.accent);
  style.setProperty('--action-fg', colorText(colors.accent));
  
  if (colors.text) {
    style.setProperty('--custom-text-color', colors.text);
    document.documentElement.setAttribute('data-custom-text', 'true');
  } else {
    style.removeProperty('--custom-text-color');
    document.documentElement.removeAttribute('data-custom-text');
  }
  
  document.documentElement.setAttribute('data-custom-colors', 'true');
}
