<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { PhCaretUpDown, PhCheck, PhBuildings } from '@phosphor-icons/vue'
import { useSession } from '@/stores/session'
import { FEATURES } from '@/config/features'
import { listMyOrgs, listWorkspaces } from '@/api/org'
import { ctxKey } from '@/lib/ctx-key'

/**
 * Header context switcher. Enumerates the user's orgs + the current org's
 * workspaces (fast-follow endpoints now live) and re-issues the token via
 * switch-org / switch-workspace, which resets the query cache (isolation).
 */
const session = useSession()
const open = ref(false)

const { data: orgs } = useQuery({
  queryKey: ['my-orgs'],
  queryFn: listMyOrgs,
  enabled: FEATURES.listMyOrgs,
})
const { data: workspaces } = useQuery({
  // Workspaces are org-scoped → key by the active org.
  queryKey: computed(() => ctxKey({ orgId: session.context.orgId, workspaceId: null }, 'workspaces')),
  queryFn: listWorkspaces,
  enabled: computed(() => FEATURES.listWorkspaces && session.hasOrg),
})

const currentOrg = computed(() =>
  orgs.value?.orgs.find((o) => o.orgId === session.context.orgId),
)
const orgLabel = computed(() => currentOrg.value?.displayName ?? (session.context.orgId ? `Org · ${session.context.orgId.slice(0, 8)}` : '—'))
const wsLabel = computed(() => {
  const ws = workspaces.value?.workspaces.find((w) => w.id === session.context.workspaceId)
  return ws?.name ?? (session.context.workspaceId ? `WS · ${session.context.workspaceId.slice(0, 8)}` : null)
})

async function pickOrg(orgId: string) {
  open.value = false
  if (orgId !== session.context.orgId) await session.switchOrg(orgId)
}
async function pickWorkspace(workspaceId: string | null) {
  open.value = false
  if (workspaceId === null) {
    if (session.context.workspaceId) await session.switchOrg(session.context.orgId!)
  } else if (workspaceId !== session.context.workspaceId) {
    await session.switchWorkspace(session.context.orgId!, workspaceId)
  }
}
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-left transition-colors hover:bg-neutral-50"
      :aria-label="$t('context.switchOrg')"
      @click="open = !open"
    >
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-clay-50 text-clay-600">
        <PhBuildings :size="17" />
      </div>
      <div class="flex flex-col leading-tight">
        <span class="text-sm font-semibold text-neutral-900">{{ orgLabel }}</span>
        <span v-if="wsLabel" class="text-xs font-medium text-clay-600">{{ wsLabel }}</span>
        <span v-else class="text-xs text-neutral-500">{{ $t('context.org') }}</span>
      </div>
      <PhCaretUpDown :size="16" class="text-neutral-400" />
    </button>

    <!-- Click-outside backdrop -->
    <div v-if="open" class="fixed inset-0 z-10" @click="open = false" />

    <div
      v-if="open"
      class="absolute left-0 z-20 mt-2 w-64 overflow-hidden rounded-xl bg-white py-1.5 shadow-pop ring-1 ring-neutral-200/70"
    >
      <p class="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{{ $t('context.switchOrg') }}</p>
      <button
        v-for="o in orgs?.orgs ?? []" :key="o.orgId"
        class="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-50"
        @click="pickOrg(o.orgId)"
      >
        <span class="text-neutral-800">{{ o.displayName }} <span class="text-neutral-400">· {{ o.role }}</span></span>
        <PhCheck v-if="o.orgId === session.context.orgId" :size="15" class="text-clay-600" />
      </button>

      <template v-if="workspaces?.workspaces.length">
        <div class="my-1.5 border-t border-neutral-100" />
        <p class="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{{ $t('context.switchWorkspace') }}</p>
        <button class="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-50" @click="pickWorkspace(null)">
          <span class="text-neutral-800">{{ $t('context.org') }}</span>
          <PhCheck v-if="!session.context.workspaceId" :size="15" class="text-clay-600" />
        </button>
        <button
          v-for="w in workspaces.workspaces" :key="w.id"
          class="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-50"
          @click="pickWorkspace(w.id)"
        >
          <span class="text-neutral-800">{{ w.name }}</span>
          <PhCheck v-if="w.id === session.context.workspaceId" :size="15" class="text-clay-600" />
        </button>
      </template>
    </div>
  </div>
</template>
