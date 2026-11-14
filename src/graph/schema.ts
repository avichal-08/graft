// hydradb node ids are integers, so every kind gets its own id range
// and a stable string key stored on the node.
export const RANGE = {
  Server: 1_000_000,
  Tool: 2_000_000,
  Capability: 3_000_000,
  Skill: 4_000_000,
  EntityType: 5_000_000,
  Session: 6_000_000,
  Entity: 7_000_000,
  Run: 8_000_000,
} as const

export type Kind = keyof typeof RANGE

export const kindOf = (id: number): Kind => {
  const k = (Object.keys(RANGE) as Kind[]).reverse().find((k) => id >= RANGE[k])
  if (!k) throw new Error(`id ${id} is outside every range`)
  return k
}

// relationship types
export const REL = {
  PROVIDED_BY: 'PROVIDED_BY', // tool -> server
  SATISFIED_BY: 'SATISFIED_BY', // capability -> tool
  CONSUMES: 'CONSUMES', // tool -> entity type
  PRODUCED_BY: 'PRODUCED_BY', // entity type -> tool
  USES: 'USES', // skill -> tool
  RESOLVED: 'RESOLVED', // session -> entity
  INSTANCE_OF: 'INSTANCE_OF', // entity -> entity type
  RESOLVED_BY: 'RESOLVED_BY', // entity -> tool
  CALLED: 'CALLED', // run -> tool
} as const
