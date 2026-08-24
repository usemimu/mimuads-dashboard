<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
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
  PhPlus,
  PhSidebarSimple,
} from '@phosphor-icons/vue'
import VerificationBanner from '@/components/VerificationBanner.vue'
import { useSession } from '@/stores/session'

const session = useSession()
const router = useRouter()

// Sidebar collapse (icon rail). With no stored preference the default follows
// the viewport — collapsed on mobile (<768px), expanded on desktop — and tracks
// resizes; an explicit toggle sticks across sessions and viewports.
const MOBILE = 768
const stored = ref<string | null>(localStorage.getItem('mimu-sidebar-collapsed'))
const collapsed = ref(stored.value != null ? stored.value === '1' : window.innerWidth < MOBILE)

function applyViewport() {
  if (stored.value == null) collapsed.value = window.innerWidth < MOBILE
}
onMounted(() => window.addEventListener('resize', applyViewport))
onUnmounted(() => window.removeEventListener('resize', applyViewport))

function toggleSidebar() {
  collapsed.value = !collapsed.value
  stored.value = collapsed.value ? '1' : '0'
  localStorage.setItem('mimu-sidebar-collapsed', stored.value)
}

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
  <!-- Floating-panel shell (X Ads Manager): tinted base, with the sidebar,
       topbar and main content as separate rounded cards lifted off it. -->
  <div class="flex h-screen gap-3 bg-neutral-200 p-3">
    <!-- Sidebar card -->
    <aside
      class="flex shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-[var(--sidebar-bg)] shadow-float transition-[width] duration-200"
      :class="collapsed ? 'w-[68px]' : 'w-60'"
    >
      <button
        class="flex h-14 shrink-0 items-center gap-2.5 px-4 text-left"
        @click="router.push('/dashboard')"
      >
        <span
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-clay-500 text-sm font-bold text-white"
          >M</span
        >
        <span
          v-show="!collapsed"
          class="font-display text-[19px] font-semibold leading-none tracking-[-0.02em] text-neutral-900"
          >{{ $t('app.name') }}</span
        >
      </button>

      <!-- Prominent create CTA (X signature). -->
      <div v-if="session.canSubmitCampaign" class="px-2.5 pb-1 pt-2">
        <RouterLink
          to="/campaigns/new"
          :title="$t('dashboard.quickStart')"
          class="flex items-center justify-center gap-2 rounded-lg bg-clay-500 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-clay-600"
          :class="collapsed ? 'px-0' : 'px-3'"
        >
          <PhPlus :size="16" weight="bold" />
          <span v-show="!collapsed">{{ $t('dashboard.quickStart') }}</span>
        </RouterLink>
      </div>

      <nav class="flex-1 overflow-y-auto px-2.5 py-3">
        <div v-for="group in navGroups" :key="group.label" class="mb-1 py-1.5">
          <p
            v-show="!collapsed"
            class="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400"
          >
            {{ $t(group.label) }}
          </p>
          <RouterLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            :title="$t(item.key)"
            class="my-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-900/[0.04] hover:text-neutral-900"
            active-class="!bg-clay-500/[0.1] !font-semibold !text-neutral-900"
            :class="collapsed && 'justify-center !px-0'"
          >
            <component :is="item.icon" :size="18" weight="regular" class="shrink-0" />
            <span v-show="!collapsed" class="flex-1">{{ $t(item.key) }}</span>
          </RouterLink>
        </div>
      </nav>

      <button
        class="flex items-center gap-2.5 border-t border-line px-3 py-2.5 text-left transition-colors hover:bg-neutral-900/[0.03]"
        :class="collapsed && 'justify-center !px-0'"
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
        <div v-show="!collapsed" class="min-w-0 flex-1">
          <div class="truncate text-xs font-semibold text-neutral-900">{{ userName }}</div>
          <div class="truncate text-[11px] capitalize text-neutral-400">{{ roleLabel }}</div>
        </div>
        <PhCaretUpDown v-show="!collapsed" :size="14" class="shrink-0 text-neutral-400" />
      </button>
    </aside>

    <!-- Main column -->
    <div class="flex min-w-0 flex-1 flex-col gap-3">
      <!-- Topbar card -->
      <header
        class="flex h-12 shrink-0 items-center gap-3 rounded-2xl border border-line bg-white px-3 shadow-float"
      >
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          :title="$t('nav.toggleSidebar')"
          @click="toggleSidebar"
        >
          <PhSidebarSimple :size="18" />
        </button>

        <div
          class="mx-auto flex max-w-[520px] flex-1 items-center gap-2 rounded-lg border border-line bg-neutral-50 px-3 py-1.5 text-sm text-neutral-400"
        >
          <PhMagnifyingGlass :size="15" />
          <span class="flex-1 truncate">{{ $t('nav.menu') }}…</span>
        </div>

        <div class="flex items-center gap-1.5">
          <button
            class="relative flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100"
            title="Notifications"
          >
            <PhBell :size="18" />
            <span class="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-clay-500" />
          </button>

          <div class="relative">
            <button
              class="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-neutral-100"
              @click="menuOpen = !menuOpen"
            >
              <img
                v-if="session.user?.profileImageUrl"
                :src="session.user.profileImageUrl"
                alt="avatar"
                class="h-7 w-7 rounded-lg object-cover"
              />
              <div
                v-else
                class="flex h-7 w-7 items-center justify-center rounded-lg bg-clay-500 text-[11px] font-bold text-white"
              >
                {{ userInitials }}
              </div>
              <PhCaretDown :size="12" class="text-neutral-400" />
            </button>

            <template v-if="menuOpen">
              <div class="fixed inset-0 z-[40]" @click="menuOpen = false" />
              <div
                class="absolute right-0 top-full z-[50] mt-1.5 w-56 overflow-hidden rounded-xl border border-line bg-white shadow-pop"
              >
                <div class="border-b border-line p-3">
                  <div class="text-sm font-semibold text-neutral-900">{{ userName }}</div>
                  <div v-if="userEmail" class="text-xs text-neutral-400">{{ userEmail }}</div>
                  <span v-if="roleLabel" class="pill pill-neutral mt-1.5">{{ roleLabel }}</span>
                </div>
                <div class="p-1">
                  <button
                    class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-neutral-100"
                    @click="goSettings"
                  >
                    <PhGearSix :size="16" /> {{ $t('nav.settings') }}
                  </button>
                </div>
                <div class="border-t border-line p-1">
                  <button
                    class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-clay-700 hover:bg-neutral-100"
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

      <!-- Content card -->
      <main
        class="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-line bg-[var(--bg)] shadow-float"
      >
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
      </main>
    </div>
  </div>
</template>
