/** Keys the autoclicker can press or use as hotkey: shown name, Windows key code, Electron accelerator name. */
export interface KeyDef {
  name: string
  vk: number
  accel: string
}

const letters: KeyDef[] = Array.from({ length: 26 }, (_, i) => {
  const c = String.fromCharCode(65 + i)
  return { name: c, vk: 0x41 + i, accel: c }
})
const digits: KeyDef[] = Array.from({ length: 10 }, (_, i) => ({ name: String(i), vk: 0x30 + i, accel: String(i) }))
const fkeys: KeyDef[] = Array.from({ length: 24 }, (_, i) => ({ name: `F${i + 1}`, vk: 0x70 + i, accel: `F${i + 1}` }))
const numpad: KeyDef[] = Array.from({ length: 10 }, (_, i) => ({ name: `Num ${i}`, vk: 0x60 + i, accel: `num${i}` }))

export const KEYS: KeyDef[] = [
  { name: 'Space', vk: 0x20, accel: 'Space' },
  { name: 'Enter', vk: 0x0d, accel: 'Enter' },
  { name: 'Tab', vk: 0x09, accel: 'Tab' },
  { name: 'Rücktaste', vk: 0x08, accel: 'Backspace' },
  { name: 'Entf', vk: 0x2e, accel: 'Delete' },
  { name: 'Einfg', vk: 0x2d, accel: 'Insert' },
  { name: 'Pos1', vk: 0x24, accel: 'Home' },
  { name: 'Ende', vk: 0x23, accel: 'End' },
  { name: 'Bild ↑', vk: 0x21, accel: 'PageUp' },
  { name: 'Bild ↓', vk: 0x22, accel: 'PageDown' },
  { name: 'Pfeil ↑', vk: 0x26, accel: 'Up' },
  { name: 'Pfeil ↓', vk: 0x28, accel: 'Down' },
  { name: 'Pfeil ←', vk: 0x25, accel: 'Left' },
  { name: 'Pfeil →', vk: 0x27, accel: 'Right' },
  ...letters,
  ...digits,
  ...fkeys,
  ...numpad
]

export const MODS = [
  { bit: 1, name: 'Strg', accel: 'Control' },
  { bit: 2, name: 'Alt', accel: 'Alt' },
  { bit: 4, name: 'Shift', accel: 'Shift' },
  { bit: 8, name: 'Win', accel: 'Super' }
]

export function keyByName(name: string): KeyDef | undefined {
  return KEYS.find((k) => k.name === name || k.accel === name)
}

export function comboLabel(mods: number, key: string): string {
  return [...MODS.filter((m) => mods & m.bit).map((m) => m.name), key].filter(Boolean).join(' + ')
}

export function accelerator(mods: number, key: string): string {
  const k = keyByName(key)
  if (!k) return ''
  return [...MODS.filter((m) => mods & m.bit).map((m) => m.accel), k.accel].join('+')
}
