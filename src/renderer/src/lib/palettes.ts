export interface ScenePalette {
  name: string
  skyTop: string
  skyBot: string
  sun: string
  far: string
  mid: string
  lake: string
  trees: string
}

/** Hand-drawn fallback scenes, used when no photos are downloaded yet. */
export const PALETTES: ScenePalette[] = [
  { name: 'Bergsee', skyTop: '#3E5C86', skyBot: '#F2B58A', sun: '#FFD9A0', far: '#6E7FA3', mid: '#3F4F73', lake: '#4A6388', trees: '#121A26' },
  { name: 'Wald', skyTop: '#7FA9BD', skyBot: '#E3EAD6', sun: '#FFF6D8', far: '#7FA58F', mid: '#4E7A62', lake: '#5F8A7B', trees: '#15291C' },
  { name: 'Wüste', skyTop: '#D9794C', skyBot: '#FBD3A0', sun: '#FFF0C8', far: '#D9955F', mid: '#B8683E', lake: '#A85E36', trees: '#3F1F10' },
  { name: 'Nacht', skyTop: '#0E1A33', skyBot: '#33456E', sun: '#E8ECF5', far: '#2A3960', mid: '#1C2748', lake: '#1E2E52', trees: '#070B16' },
  { name: 'Nebel', skyTop: '#9AA3AB', skyBot: '#DDE1E3', sun: '#F4F5F2', far: '#AEB6BB', mid: '#7F8A90', lake: '#9CA6AC', trees: '#3A4247' },
  { name: 'Herbst', skyTop: '#6C8FB0', skyBot: '#F0D6A8', sun: '#FFE6B0', far: '#B77A45', mid: '#8A4A2A', lake: '#5C7A94', trees: '#3A1C0E' },
  { name: 'Fjord', skyTop: '#5B7F9A', skyBot: '#C9DCE4', sun: '#F4F8FA', far: '#6D8796', mid: '#3D5566', lake: '#2F4A5C', trees: '#14222B' },
  { name: 'Savanne', skyTop: '#E39A52', skyBot: '#F7DDA2', sun: '#FFF3CC', far: '#C98E4E', mid: '#8F6232', lake: '#B98545', trees: '#2E1D0C' },
  { name: 'Polarlicht', skyTop: '#0B2A2E', skyBot: '#2E8C74', sun: '#D8FFF0', far: '#1D4A4F', mid: '#123236', lake: '#163E42', trees: '#051214' }
]

export function paletteFor(id: string): ScenePalette {
  const name = id.startsWith('builtin:') ? id.slice(8) : id
  return PALETTES.find((p) => p.name === name) ?? PALETTES[0]
}
