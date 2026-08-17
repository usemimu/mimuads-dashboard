<script setup lang="ts">
import { computed } from 'vue'
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
} from '@phosphor-icons/vue'
import OrgWorkspaceSwitcher from '@/components/OrgWorkspaceSwitcher.vue'
import VerificationBanner from '@/components/VerificationBanner.vue'
import Button from '@/components/ui/Button.vue'
import { useSession } from '@/stores/session'

const session = useSession()
const router = useRouter()

const nav = [
  { to: '/dashboard', key: 'nav.dashboard', icon: PhGauge },
  { to: '/campaigns', key: 'nav.campaigns', icon: PhMegaphone },
  { to: '/screens', key: 'nav.screens', icon: PhMapPin },
  { to: '/reports', key: 'nav.reports', icon: PhChartLine },
  { to: '/billing', key: 'nav.billing', icon: PhWallet },
  { to: '/organization', key: 'nav.organization', icon: PhBuildings },
  { to: '/settings', key: 'nav.settings', icon: PhGearSix },
] as const

const userName = computed(() => session.user?.name ?? session.context.userId ?? '')
const roleLabel = computed(() => session.role ?? '')
const userInitials = computed(() => {
  const parts = String(userName.value).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'M'
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'M'
})

async function onSignOut() {
  await session.logout()
  router.replace({ name: 'login' })
}
</script>

<template>
  <div class="flex h-full min-h-screen bg-neutral-50">
    <!-- Sidebar -->
    <aside class="flex w-60 flex-col border-r border-line bg-[#FDFCFA]">
      <div class="flex h-14 items-center gap-2 border-b border-line px-5">
        <span class="font-display text-[22px] font-semibold leading-none tracking-[-0.02em] text-neutral-900">{{
          $t('app.name')
        }}</span>
        <span class="ml-auto rounded border border-line px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-neutral-400">
          Ads
        </span>
      </div>
      <nav class="flex-1 overflow-y-auto px-2.5 py-4">
        <p class="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">
          {{ $t('nav.menu') }}
        </p>
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="group relative my-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-900/[0.035] hover:text-neutral-900"
          active-class="!bg-clay-500/[0.08] !font-semibold !text-neutral-900 before:absolute before:-left-2.5 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-r before:bg-clay-500"
        >
          <component :is="item.icon" :size="18" weight="regular" />
          <span>{{ $t(item.key) }}</span>
        </RouterLink>
      </nav>
      <div class="border-t border-line p-2.5">
        <Button variant="ghost" size="sm" class="w-full justify-start text-neutral-500" @click="onSignOut">
          <PhSignOut :size="18" />
          <span>{{ $t('auth.signOut') }}</span>
        </Button>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-neutral-50/85 px-6 backdrop-blur-xl"
      >
        <OrgWorkspaceSwitcher />
        <div class="flex items-center gap-3">
          <div class="flex flex-col text-right leading-tight">
            <span class="text-[13px] font-semibold text-neutral-900">{{ userName }}</span>
            <span v-if="roleLabel" class="text-[11px] capitalize text-neutral-400">{{ roleLabel }}</span>
          </div>
          <img
            v-if="session.user?.profileImageUrl"
            :src="session.user.profileImageUrl"
            alt="avatar"
            class="h-8 w-8 rounded-lg object-cover ring-1 ring-line"
          />
          <div
            v-else
            class="flex h-8 w-8 items-center justify-center rounded-lg bg-clay-500 text-xs font-bold text-white"
          >
            {{ userInitials }}
          </div>
        </div>
      </header>

      <VerificationBanner />

      <p
        v-if="!session.canMutate"
        class="border-b border-gold-200/60 bg-gold-50 px-6 py-2 text-center text-sm text-gold-800"
      >
        {{ $t('roles.viewerReadOnly') }}
      </p>

      <main class="min-w-0 flex-1 overflow-auto">
        <div class="mx-auto max-w-6xl animate-fade-in p-6 sm:p-8">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>
