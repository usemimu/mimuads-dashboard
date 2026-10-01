<script setup lang="ts">
/**
 * Shared sidebar body — rendered by AppShell in both the static desktop
 * sidebar and the mobile off-canvas drawer. Clay-themed (no indigo/gray).
 * Emits `navigate` on any link/action so the mobile drawer can close itself.
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
  PhPlus,
} from '@phosphor-icons/vue'
import { useSession } from '@/stores/session'

const emit = defineEmits<{ (e: 'navigate'): void }>()

const session = useSession()
const router = useRouter()

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
      { to: '/settings', key: 'nav.settings', icon: PhGearSix },
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

function goSettings() {
  emit('navigate')
  router.push('/settings')
}
</script>

<template>
  <div class="flex h-full flex-col bg-surface">
    <!-- Brand -->
    <button
      class="flex h-14 shrink-0 items-center gap-2.5 px-4 text-left"
      @click="emit('navigate'); router.push('/dashboard')"
    >
      <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-clay-500 text-sm font-bold text-white">M</span>
      <span class="font-display text-[19px] font-semibold leading-none tracking-[-0.02em] text-neutral-900">{{ $t('app.name') }}</span>
    </button>

    <!-- Create CTA -->
    <div v-if="session.canSubmitCampaign" class="px-3 pb-1 pt-2">
      <RouterLink
        to="/campaigns/new"
        class="flex items-center justify-center gap-2 rounded-lg bg-clay-500 px-3 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-clay-600"
        @click="emit('navigate')"
      >
        <PhPlus :size="16" weight="bold" />
        <span>{{ $t('dashboard.quickStart') }}</span>
      </RouterLink>
    </div>

    <!-- Nav -->
    <nav class="flex-1 overflow-y-auto px-3 py-3">
      <div v-for="group in navGroups" :key="group.label" class="mb-1 py-1.5">
        <p class="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">
          {{ $t(group.label) }}
        </p>
        <RouterLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="my-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-900/[0.04] hover:text-neutral-900"
          active-class="!bg-clay-500/[0.1] !font-semibold !text-neutral-900"
          @click="emit('navigate')"
        >
          <component :is="item.icon" :size="18" weight="regular" class="shrink-0" />
          <span class="flex-1">{{ $t(item.key) }}</span>
        </RouterLink>
      </div>
    </nav>

    <!-- User footer -->
    <button
      class="flex items-center gap-2.5 border-t border-line px-3 py-2.5 text-left transition-colors hover:bg-neutral-900/[0.03]"
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
      <div class="min-w-0 flex-1">
        <div class="truncate text-xs font-semibold text-neutral-900">{{ userName }}</div>
        <div class="truncate text-[11px] capitalize text-neutral-400">{{ roleLabel }}</div>
      </div>
      <PhCaretUpDown :size="14" class="shrink-0 text-neutral-400" />
    </button>
  </div>
</template>
