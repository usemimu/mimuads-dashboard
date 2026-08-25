<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
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

// Living in the sidebar (which clips overflow), the menu is teleported to
// <body> and rendered `position: fixed`, anchored under the trigger — so it
// can't be cut off by the sidebar's scroll/overflow. Rect recomputed on open.
const triggerEl = ref<HTMLElement | null>(null)
// `up` anchors the menu to its bottom edge (grows upward) — used when the
// trigger sits low in the viewport (it lives at the bottom of the sidebar).
const menuPos = reactive({ top: 0, bottom: 0, left: 0, width: 0, up: false })

function toggleMenu() {
  if (open.value) {
    open.value = false
    return
  }
  const el = triggerEl.value
  if (el) {
    const r = el.getBoundingClientRect()
    menuPos.up = r.bottom > window.innerHeight * 0.6
    menuPos.top = r.bottom + 6
    menuPos.bottom = window.innerHeight - r.top + 6
    menuPos.left = r.left
    menuPos.width = Math.max(r.width, 232)
  }
  open.value = true
}

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
  <div>
    <button
      ref="triggerEl"
      type="button"
      class="flex w-full items-center gap-2 rounded-md border border-line bg-[var(--bg-raised)] px-2 py-1.5 text-left transition-colors hover:bg-neutral-50"
      :aria-label="$t('context.switchOrg')"
      @click="toggleMenu"
    >
      <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-clay-50 text-clay-600">
        <PhBuildings :size="14" />
      </div>
      <div class="flex min-w-0 flex-1 flex-col leading-tight">
        <span class="truncate text-[13px] font-semibold text-neutral-900">{{ orgLabel }}</span>
        <span v-if="wsLabel" class="truncate text-[11px] font-medium text-clay-600">{{ wsLabel }}</span>
        <span v-else class="truncate text-[11px] text-neutral-500">{{ $t('context.org') }}</span>
      </div>
      <PhCaretUpDown :size="14" class="shrink-0 text-neutral-400" />
    </button>

    <!-- Menu teleported to <body> so the sidebar's overflow can't clip it. -->
    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-[998]" @click="open = false" />
      <div
        v-if="open"
        class="fixed z-[999] overflow-hidden rounded-xl bg-surface py-1.5 shadow-pop ring-1 ring-neutral-200/70"
        :style="{
          left: `${menuPos.left}px`,
          width: `${menuPos.width}px`,
          ...(menuPos.up ? { bottom: `${menuPos.bottom}px` } : { top: `${menuPos.top}px` }),
        }"
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
    </Teleport>
  </div>
</template>
