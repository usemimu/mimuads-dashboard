<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import {
  PhGauge,
  PhMegaphone,
  PhMapPin,
  PhChartLine,
  PhWallet,
  PhBuildings,
  PhGearSix,
  PhSignOut,
  PhBell,
  PhMagnifyingGlass,
  PhCaretDown,
  PhCaretUpDown,
} from '@phosphor-icons/vue'
import VerificationBanner from '@/components/VerificationBanner.vue'
import { useSession } from '@/stores/session'

const session = useSession()
const router = useRouter()

/**
 * Sidebar nav, grouped into labeled sections to mirror the admin console
 * shell. Each group renders an uppercase section label; the active route
 * lights up with a clay rail (see `.sb-item.active` in main.css).
 */
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
const userEmail = computed(() => session.user?.email ?? '')
const userInitials = computed(() => {
  const parts = String(userName.value).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'M'
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'M'
})

const menuOpen = ref(false)

function goSettings() {
  menuOpen.value = false
  router.push('/settings')
}

async function onSignOut() {
  menuOpen.value = false
  await session.logout()
  router.replace({ name: 'login' })
}
</script>

<template>
  <div class="app-shell">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sb-logo" @click="router.push('/dashboard')">
        <span class="sb-logo-txt">{{ $t('app.name') }}</span>
        <span class="sb-env">Ads</span>
      </div>

      <nav class="flex-1 overflow-y-auto">
        <div v-for="group in navGroups" :key="group.label" class="sb-section">
          <div class="sb-section-label">{{ $t(group.label) }}</div>
          <RouterLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="sb-item"
            active-class="active"
          >
            <component :is="item.icon" :size="18" weight="regular" />
            <span class="sb-item-label">{{ $t(item.key) }}</span>
          </RouterLink>
        </div>
      </nav>

      <div class="sb-user" @click="goSettings">
        <img
          v-if="session.user?.profileImageUrl"
          :src="session.user.profileImageUrl"
          alt="avatar"
          class="h-[30px] w-[30px] rounded-md object-cover"
        />
        <div v-else class="avatar h-[30px] w-[30px] text-[12px]">{{ userInitials }}</div>
        <div class="min-w-0 flex-1">
          <div class="sb-user-name">{{ userName }}</div>
          <div class="sb-user-role">{{ roleLabel }}</div>
        </div>
        <PhCaretUpDown :size="14" class="text-neutral-400" />
      </div>
    </aside>

    <!-- Topbar -->
    <header class="topbar">
      <div class="tb-search">
        <PhMagnifyingGlass :size="15" />
        <span class="flex-1 truncate">{{ $t('nav.menu') }}…</span>
      </div>

      <div class="tb-right">
        <button class="tb-btn" title="Notifications">
          <PhBell :size="18" />
          <span class="dot" />
        </button>

        <div class="mx-1 hidden h-5 w-px bg-[var(--border)] sm:block" />

        <div class="relative">
          <div
            class="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-[var(--bg-hover)]"
            @click="menuOpen = !menuOpen"
          >
            <img
              v-if="session.user?.profileImageUrl"
              :src="session.user.profileImageUrl"
              alt="avatar"
              class="h-6 w-6 rounded-md object-cover"
            />
            <div v-else class="avatar h-6 w-6 text-[10px]">{{ userInitials }}</div>
            <PhCaretDown :size="12" class="text-neutral-400" />
          </div>

          <template v-if="menuOpen">
            <div class="fixed inset-0 z-[40]" @click="menuOpen = false" />
            <div
              class="absolute right-0 top-full z-[50] mt-1.5 w-56 rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] shadow-[var(--shadow-lg)]"
            >
              <div class="border-b border-[var(--border)] p-3">
                <div class="text-sm font-semibold text-[var(--fg)]">{{ userName }}</div>
                <div v-if="userEmail" class="text-xs text-[var(--fg-3)]">{{ userEmail }}</div>
                <span v-if="roleLabel" class="pill pill-neutral mt-1.5">{{ roleLabel }}</span>
              </div>
              <div class="p-1">
                <button
                  class="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-[var(--bg-hover)]"
                  @click="goSettings"
                >
                  <PhGearSix :size="16" /> {{ $t('nav.settings') }}
                </button>
              </div>
              <div class="border-t border-[var(--border)] p-1">
                <button
                  class="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-clay-700 hover:bg-[var(--bg-hover)]"
                  @click="onSignOut"
                >
                  <PhSignOut :size="16" /> {{ $t('auth.signOut') }}
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </header>

    <!-- Page -->
    <div class="page">
      <VerificationBanner />

      <p
        v-if="!session.canMutate"
        class="border-b border-gold-200/60 bg-gold-50 px-6 py-2 text-center text-sm text-gold-800"
      >
        {{ $t('roles.viewerReadOnly') }}
      </p>

      <div class="page-body animate-fade-in">
        <RouterView />
      </div>
    </div>
  </div>
</template>
