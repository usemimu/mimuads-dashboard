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

async function onSignOut() {
  await session.logout()
  router.replace({ name: 'login' })
}
</script>

<template>
  <div class="flex h-full min-h-screen bg-neutral-50">
    <!-- Sidebar -->
    <aside class="flex w-60 flex-col border-r border-neutral-200 bg-white">
      <div class="flex h-16 items-center px-6">
        <span class="font-display text-2xl font-semibold text-clay-600">{{ $t('app.name') }}</span>
      </div>
      <nav class="flex-1 space-y-1 px-3 py-4">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          active-class="bg-clay-50 !text-clay-700"
        >
          <component :is="item.icon" :size="20" weight="regular" />
          <span>{{ $t(item.key) }}</span>
        </RouterLink>
      </nav>
      <div class="border-t border-neutral-200 p-3">
        <Button variant="ghost" size="sm" class="w-full justify-start" @click="onSignOut">
          <PhSignOut :size="18" />
          <span>{{ $t('auth.signOut') }}</span>
        </Button>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-6"
      >
        <OrgWorkspaceSwitcher />
        <div class="flex items-center gap-3 text-right">
          <div class="flex flex-col leading-tight">
            <span class="text-sm font-medium text-neutral-900">{{ userName }}</span>
            <span v-if="roleLabel" class="text-xs capitalize text-neutral-500">{{ roleLabel }}</span>
          </div>
        </div>
      </header>

      <VerificationBanner />

      <p
        v-if="!session.canMutate"
        class="bg-neutral-100 px-6 py-2 text-center text-sm text-neutral-600"
      >
        {{ $t('roles.viewerReadOnly') }}
      </p>

      <main class="min-w-0 flex-1 overflow-auto p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
