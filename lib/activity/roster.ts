// Maximum simultaneous canvas actors; every actor's GPU resources remain pooled.
export const MAX_RENDERED_PEOPLE = 8
export type Waypoint = 'great-hall' | 'library' | 'courtyard' | 'stairs' | 'classrooms' | 'tower' | 'west' | 'center' | 'east'
export type Room = Exclude<Waypoint, 'west' | 'center' | 'east'>
export type Person = { id: string; name: string; shortName: string; github: string; youtube?: string; home: Room; group: 'ecosystem' | 'joyco' }
export const roster: readonly Person[] = [
  { id:'mrdoob', name:'mrdoob', shortName:'mrdoob', github:'mrdoob', home:'great-hall', group:'ecosystem' },
  { id:'sunag', name:'sunag', shortName:'sunag', github:'sunag', home:'classrooms', group:'ecosystem' },
  { id:'donmccurdy', name:'Don McCurdy', shortName:'Don McCurdy', github:'donmccurdy', home:'library', group:'ecosystem' },
  { id:'drcmda', name:'drcmda', shortName:'drcmda', github:'drcmda', home:'stairs', group:'ecosystem' },
  { id:'akella', name:'Yuri Artiukh / Akella', shortName:'Akella', github:'akella', youtube:'UCDo7RTzizoOdPjY8A-xDR7g', home:'classrooms', group:'ecosystem' },
  { id:'brunosimon', name:'Bruno Simon', shortName:'Bruno Simon', github:'brunosimon', home:'courtyard', group:'ecosystem' },
  { id:'looeee', name:'Lewy Blue', shortName:'Lewy Blue', github:'looeee', home:'library', group:'ecosystem' },
  { id:'alejopequeno', name:'pek', shortName:'pek', github:'alejopequeno', home:'courtyard', group:'joyco' },
  { id:'fabroos', name:'fabroos', shortName:'fabroos', github:'fabroos', home:'great-hall', group:'joyco' },
  { id:'joyboy', name:'Joyboy', shortName:'Joyboy', github:'JOYBOY-0', home:'classrooms', group:'joyco' },
  { id:'justkahdri', name:'kahdri', shortName:'kahdri', github:'justkahdri', home:'stairs', group:'joyco' },
  { id:'matiasperz', name:'Matías Perez', shortName:'Matías', github:'matiasperz', home:'library', group:'joyco' },
  { id:'dmowl-ops', name:'dmowl', shortName:'dmowl', github:'dmowl-ops', home:'courtyard', group:'joyco' },
  { id:'jocodesing-arch', name:'Joaquín Morolla', shortName:'Joaquín Mo.', github:'jocodesing-arch', home:'great-hall', group:'joyco' },
]
export const destinations = { 'great-hall':'The Commons', library:'The Source Library', courtyard:'The Playground', stairs:'The Render Pipeline', classrooms:'The Shader Atelier', tower:'The Observatory' } as const
