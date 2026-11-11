/** 1,859 € : toujours 3 décimales, virgule française. */
export function formatPrice(p: number): string {
  return `${p.toFixed(3).replace('.', ',')} €`;
}

export function formatPrice3(p: number): string {
  return p.toFixed(3).replace('.', ',');
}

export function formatPrice2(p: number): string {
  return p.toFixed(2).replace('.', ',');
}

/** « il y a 3 j », « il y a 5 h », « il y a 12 min » à partir de secondes Unix. */
export function formatAge(unixSeconds: number, nowMs = Date.now()): string {
  const s = Math.max(0, Math.round(nowMs / 1000 - unixSeconds));
  if (s < 90) return "à l'instant";
  const min = Math.round(s / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

export function formatAgeMs(iso: string, nowMs = Date.now()): string {
  return formatAge(new Date(iso).getTime() / 1000, nowMs);
}

export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[-'’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
