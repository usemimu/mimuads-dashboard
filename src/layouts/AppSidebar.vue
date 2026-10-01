<script setup lang="ts">
/**
 * Shared sidebar body — rendered by AppShell in both the static desktop sidebar
 * and the mobile off-canvas drawer. Tailwind Plus "Sidebar Layout" structure,
 * re-themed to the clay palette (no indigo/gray). Collapses to an icon-only rail
 * on desktop (`collapsed`); labels/section headings hide and icons center, with
 * native tooltips so every destination stays reachable. Emits `navigate` on any
 * link/action so the mobile drawer can close itself.
 */
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  PhGauge,
  PhMegaphone,
  PhMapPin,
  PhChartLine,
  PhWallet,
  PhBuildings,
  PhGearSix,
  PhCaretUpDown,
} from '@phosphor-icons/vue'
import { useSession } from '@/stores/session'

const props = withDefaults(defineProps<{ collapsed?: boolean }>(), { collapsed: false })
const emit = defineEmits<{ (e: 'navigate'): void }>()

const session = useSession()
const router = useRouter()

// Primary nav (sectioned, mirrors the TW Plus pattern). Settings is split out so
// it can pin to the bottom of the rail.
const navGroups = [
  {
    label: 'nav.groupOverview',
    items: [{ to: '/dashboard', key: 'nav.dashboard', icon: PhGauge }],
  },
  {
    label: 'nav.groupAdvertising',
    items: [
      { to: '/campaigns', key: 'nav.campaigns', icon: PhMegaphone },
      { to: '/screens', key: 'nav.screens', icon: PhMapPin },
      { to: '/reports', key: 'nav.reports', icon: PhChartLine },
    ],
  },
  {
    label: 'nav.groupAccount',
    items: [
      { to: '/billing', key: 'nav.billing', icon: PhWallet },
      { to: '/organization', key: 'nav.organization', icon: PhBuildings },
    ],
  },
] as const

const userName = computed(() => session.user?.name ?? session.context.userId ?? '')
const roleLabel = computed(() => (session.role ? session.role.replace(/_/g, ' ') : ''))
const userInitials = computed(() => {
  const parts = String(userName.value).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'M'
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'M'
})

// Shared link styling so the active state (bg + text + icon all go clay) is one
// source of truth. `is-active` is the RouterLink active marker the icon reads via
// the group-[.is-active] variant.
const linkBase =
  'group relative flex items-center gap-x-3 rounded-lg px-2.5 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-900/[0.04] hover:text-neutral-900'
const linkActive = 'is-active bg-clay-500/10 font-semibold !text-neutral-900'

function goSettings() {
  emit('navigate')
  router.push('/settings')
}
function goDashboard() {
  emit('navigate')
  router.push('/dashboard')
}
</script>

<template>
  <div class="flex h-full flex-col bg-surface">
    <!-- Brand -->
    <button
      class="flex h-14 shrink-0 items-center gap-2.5 px-4 text-left"
      :class="props.collapsed ? 'justify-center px-0' : ''"
      :title="props.collapsed ? $t('app.name') : undefined"
      @click="goDashboard"
    >
      <img src="/bimi-logo.svg" alt="" class="h-8 w-8 shrink-0 rounded-lg object-cover" />
      <span
        v-if="!props.collapsed"
        class="font-display text-[19px] font-semibold leading-none tracking-[-0.02em] text-neutral-900"
      >
        {{ $t('app.name') }}
      </span>
    </button>

    <!-- Nav -->
    <nav class="flex flex-1 flex-col gap-y-6 overflow-y-auto px-3 py-4">
      <div v-for="group in navGroups" :key="group.label">
        <p
          v-if="!props.collapsed"
          class="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400"
        >
          {{ $t(group.label) }}
        </p>
        <div class="space-y-0.5">
          <RouterLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            :class="[linkBase, props.collapsed ? 'justify-center px-0' : '']"
            :active-class="linkActive"
            :title="props.collapsed ? $t(item.key) : undefined"
            @click="emit('navigate')"
          >
            <component
              :is="item.icon"
              :size="20"
              weight="regular"
              class="shrink-0 text-neutral-400 transition-colors group-hover:text-neutral-600 group-[.is-active]:text-clay-600"
            />
            <span v-if="!props.collapsed" class="flex-1 truncate">{{ $t(item.key) }}</span>
          </RouterLink>
        </div>
      </div>

      <!-- Settings pinned to the bottom of the scroll region. -->
      <div class="mt-auto">
        <RouterLink
          to="/settings"
          :class="[linkBase, props.collapsed ? 'justify-center px-0' : '']"
          :active-class="linkActive"
          :title="props.collapsed ? $t('nav.settings') : undefined"
          @click="emit('navigate')"
        >
          <PhGearSix
            :size="20"
            weight="regular"
            class="shrink-0 text-neutral-400 transition-colors group-hover:text-neutral-600 group-[.is-active]:text-clay-600"
          />
          <span v-if="!props.collapsed" class="flex-1 truncate">{{ $t('nav.settings') }}</span>
        </RouterLink>
      </div>
    </nav>

    <!-- User footer -->
    <button
      class="flex items-center gap-2.5 border-t border-line px-3 py-2.5 text-left transition-colors hover:bg-neutral-900/[0.03]"
      :class="props.collapsed ? 'justify-center px-0' : ''"
      :title="props.collapsed ? userName : undefined"
      @click="goSettings"
    >
      <img
        v-if="session.user?.profileImageUrl"
        :src="session.user.profileImageUrl"
        alt="avatar"
        class="h-[30px] w-[30px] shrink-0 rounded-lg object-cover"
      />
      <div
        v-else
        class="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-clay-500 text-xs font-bold text-white"
      >
        {{ userInitials }}
      </div>
      <template v-if="!props.collapsed">
        <div class="min-w-0 flex-1">
          <div class="truncate text-xs font-semibold text-neutral-900">{{ userName }}</div>
          <div class="truncate text-[11px] capitalize text-neutral-400">{{ roleLabel }}</div>
        </div>
        <PhCaretUpDown :size="14" class="shrink-0 text-neutral-400" />
      </template>
    </button>
  </div>
</template>
