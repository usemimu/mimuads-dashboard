/**
 * Campaign status → pill tone + human label. Single source of truth so
 * every surface (dashboard, list, detail) shows the same vocabulary and
 * colour for a given status. Mirrors the mobile app's status language.
 */
type Tone = 'neutral' | 'accent' | 'success' | 'pending' | 'danger' | 'info'

const MAP: Record<string, { tone: Tone; label: string }> = {
  draft: { tone: 'neutral', label: 'Draft' },
  pending_payment: { tone: 'pending', label: 'Pending payment' },
  pending_vetting: { tone: 'pending', label: 'In review' },
  pending_approval: { tone: 'pending', label: 'Awaiting APCON' },
  approved: { tone: 'accent', label: 'Scheduled' },
  active: { tone: 'success', label: 'Live' },
  paused: { tone: 'neutral', label: 'Paused' },
  completed: { tone: 'neutral', label: 'Ended' },
  rejected: { tone: 'danger', label: 'Rejected' },
  suspended: { tone: 'danger', label: 'Suspended' },
}

export function statusTone(status: string): Tone {
  return MAP[status]?.tone ?? 'neutral'
}

export function statusLabel(status: string): string {
  return MAP[status]?.label ?? status.replace(/_/g, ' ')
}
