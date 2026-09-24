export type SceneKind = 'lake' | 'beach' | 'mountains' | 'city'

export interface ScenePalette {
  name: string
  kind: SceneKind
  night: boolean
  skyTop: string
  skyBot: string
  sun: string
  far: string
  mid: string
  near: string
  lake: string // water (lake / sea / river)
  ground: string // sand, street, meadow
  trees: string // darkest foreground silhouettes
  light: string // lit windows, reflections
}

const s = (p: ScenePalette): ScenePalette => p

/** Drawn backgrounds; used when no photos are downloaded or when picked on purpose. */
export const PALETTES: ScenePalette[] = [
  s({ name: 'Bergsee', kind: 'lake', night: false, skyTop: '#3E5C86', skyBot: '#F2B58A', sun: '#FFD9A0', far: '#6E7FA3', mid: '#3F4F73', near: '#2C3A57', lake: '#4A6388', ground: '#1E2A3E', trees: '#121A26', light: '#FFD9A0' }),
  s({ name: 'Wald', kind: 'lake', night: false, skyTop: '#7FA9BD', skyBot: '#E3EAD6', sun: '#FFF6D8', far: '#7FA58F', mid: '#4E7A62', near: '#35594A', lake: '#5F8A7B', ground: '#23402F', trees: '#15291C', light: '#FFF6D8' }),
  s({ name: 'Nebel', kind: 'lake', night: false, skyTop: '#9AA3AB', skyBot: '#DDE1E3', sun: '#F4F5F2', far: '#AEB6BB', mid: '#7F8A90', near: '#66727A', lake: '#9CA6AC', ground: '#4E585F', trees: '#3A4247', light: '#F4F5F2' }),
  s({ name: 'Herbst', kind: 'lake', night: false, skyTop: '#6C8FB0', skyBot: '#F0D6A8', sun: '#FFE6B0', far: '#B77A45', mid: '#8A4A2A', near: '#6B3620', lake: '#5C7A94', ground: '#4A2616', trees: '#3A1C0E', light: '#FFE6B0' }),
  s({ name: 'Fjord', kind: 'lake', night: false, skyTop: '#5B7F9A', skyBot: '#C9DCE4', sun: '#F4F8FA', far: '#6D8796', mid: '#3D5566', near: '#2C4250', lake: '#2F4A5C', ground: '#1D2F3A', trees: '#14222B', light: '#F4F8FA' }),
  s({ name: 'Polarlicht', kind: 'lake', night: true, skyTop: '#0B2A2E', skyBot: '#2E8C74', sun: '#D8FFF0', far: '#1D4A4F', mid: '#123236', near: '#0D2629', lake: '#163E42', ground: '#081A1C', trees: '#051214', light: '#9CFFD9' }),
  s({ name: 'Nacht', kind: 'lake', night: true, skyTop: '#0E1A33', skyBot: '#33456E', sun: '#E8ECF5', far: '#2A3960', mid: '#1C2748', near: '#141D38', lake: '#1E2E52', ground: '#0C1326', trees: '#070B16', light: '#E8ECF5' }),

  s({ name: 'Strand', kind: 'beach', night: false, skyTop: '#4F9BD9', skyBot: '#CDE9F6', sun: '#FFF7D6', far: '#7FB3C9', mid: '#2F8FB0', near: '#1F7896', lake: '#3AA3C4', ground: '#EBD5A8', trees: '#2E3B2C', light: '#FFFFFF' }),
  s({ name: 'Strand am Abend', kind: 'beach', night: false, skyTop: '#3B3F7A', skyBot: '#FF9F6B', sun: '#FFD27A', far: '#6B5E8F', mid: '#5A6FA0', near: '#3F4F80', lake: '#7C6F9E', ground: '#C99A73', trees: '#1C1A2B', light: '#FFC78A' }),
  s({ name: 'Strand bei Nacht', kind: 'beach', night: true, skyTop: '#070D22', skyBot: '#1D2C57', sun: '#F1F3FA', far: '#1B2A50', mid: '#14254A', near: '#0E1B38', lake: '#162A55', ground: '#2E3550', trees: '#05070F', light: '#DDE6FF' }),

  s({ name: 'Berge', kind: 'mountains', night: false, skyTop: '#5C9BD6', skyBot: '#D9ECF7', sun: '#FFFBEA', far: '#A9BFD4', mid: '#6F8AA6', near: '#445A73', lake: '#8FB0C9', ground: '#3E5A45', trees: '#1F3326', light: '#FFFFFF' }),
  s({ name: 'Berge im Abendrot', kind: 'mountains', night: false, skyTop: '#2F3566', skyBot: '#F58E6B', sun: '#FFC68A', far: '#9C7A96', mid: '#6A5578', near: '#433752', lake: '#B98A95', ground: '#2E2438', trees: '#17111F', light: '#FFD2B0' }),
  s({ name: 'Berge bei Nacht', kind: 'mountains', night: true, skyTop: '#050A1C', skyBot: '#1E2B55', sun: '#EEF1FA', far: '#27335B', mid: '#1B2547', near: '#121A35', lake: '#2B3A66', ground: '#0B1024', trees: '#04060F', light: '#DCE3FF' }),

  s({ name: 'Stadt', kind: 'city', night: false, skyTop: '#6FA6D6', skyBot: '#E6F0F5', sun: '#FFF8DE', far: '#A7B8C8', mid: '#7D8FA3', near: '#56677C', lake: '#6E8BA5', ground: '#3C4756', trees: '#252D38', light: '#DCE9F5' }),
  s({ name: 'Stadt am Abend', kind: 'city', night: false, skyTop: '#28305E', skyBot: '#F28A5E', sun: '#FFC27A', far: '#6D5F83', mid: '#4B4468', near: '#322D4A', lake: '#5D4E72', ground: '#221E33', trees: '#151222', light: '#FFD27D' }),
  s({ name: 'Stadt bei Nacht', kind: 'city', night: true, skyTop: '#04081A', skyBot: '#1A2350', sun: '#EDEFF8', far: '#1D2448', mid: '#141A38', near: '#0D1228', lake: '#121A3C', ground: '#080B1A', trees: '#04050C', light: '#FFD36B' }),

  s({ name: 'Wüste', kind: 'mountains', night: false, skyTop: '#D9794C', skyBot: '#FBD3A0', sun: '#FFF0C8', far: '#E3A26E', mid: '#C77B4C', near: '#A85E36', lake: '#E0A46F', ground: '#8C4A28', trees: '#3F1F10', light: '#FFF0C8' }),
  s({ name: 'Savanne', kind: 'mountains', night: false, skyTop: '#E39A52', skyBot: '#F7DDA2', sun: '#FFF3CC', far: '#D2A262', mid: '#A87A40', near: '#7F5A2C', lake: '#C9964E', ground: '#6B4A22', trees: '#2E1D0C', light: '#FFF3CC' })
]

export function paletteFor(id: string): ScenePalette {
  const name = id.startsWith('builtin:') ? id.slice(8) : id
  return PALETTES.find((p) => p.name === name) ?? PALETTES[0]
}
