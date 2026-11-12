/** Mimuads neo-brutalist sticker for each campaign objective (src/assets/icons/brutal). */
export const OBJECTIVE_STICKER: Record<string, string> = {
  awareness: 'campaign',
  consideration: 'targeting',
  conversion: 'click',
}
export const objectiveSticker = (objective: string) => OBJECTIVE_STICKER[objective] ?? 'campaign'
