<script setup lang="ts">
import { computed } from 'vue'
import { PhCaretUpDown } from '@phosphor-icons/vue'
import { useSession } from '@/stores/session'
import { FEATURES } from '@/config/features'

/**
 * Header context indicator + switcher. Slice 1 shows the ACTIVE context (from the
 * access-token claims). Enumerating other orgs/workspaces needs backend endpoints
 * that aren't live yet (FEATURES.listMyOrgs / listWorkspaces) — when they ship,
 * this component gains the dropdown; today it renders the current context read-only.
 */
const session = useSession()

const orgLabel = computed(() => {
  const orgId = session.context.orgId
  return orgId ? `Org · ${orgId.slice(0, 8)}` : '—'
})
const workspaceLabel = computed(() => {
  const ws = session.context.workspaceId
  return ws ? `WS · ${ws.slice(0, 8)}` : null
})
const canEnumerate = computed(() => FEATURES.listMyOrgs || FEATURES.listWorkspaces)
</script>

<template>
  <button
    type="button"
    class="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-left transition-colors"
    :class="canEnumerate ? 'hover:bg-neutral-50' : 'cursor-default'"
    :disabled="!canEnumerate"
    :aria-label="$t('context.switchOrg')"
  >
    <div class="flex flex-col leading-tight">
      <span class="font-mono text-sm font-medium text-neutral-900">{{ orgLabel }}</span>
      <span v-if="workspaceLabel" class="font-mono text-xs text-clay-600">{{
        workspaceLabel
      }}</span>
      <span v-else class="text-xs text-neutral-500">{{ $t('context.org') }}</span>
    </div>
    <PhCaretUpDown v-if="canEnumerate" :size="16" class="text-neutral-400" />
  </button>
</template>
