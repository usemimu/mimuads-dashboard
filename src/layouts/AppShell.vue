<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import {
  Dialog,
  DialogPanel,
  TransitionChild,
  TransitionRoot,
  Menu,
  MenuButton,
  MenuItems,
  MenuItem,
} from '@headlessui/vue'
import {
  PhList,
  PhX,
  PhBell,
  PhMagnifyingGlass,
  PhCaretDown,
  PhGearSix,
  PhSignOut,
  PhSun,
  PhMoon,
  PhGauge,
  PhMegaphone,
  PhMapPin,
  PhChartLine,
  PhWallet,
  PhBuildings,
  PhUsers,
} from '@phosphor-icons/vue'
import CommandPalette from '@/components/CommandPalette.vue'
import VerificationBanner from '@/components/VerificationBanner.vue'
import { useSession } from '@/stores/session'

const session = useSession()
const router = useRouter()

const mobileOpen = ref(false)
const palette = ref<InstanceType<typeof CommandPalette> | null>(null)
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

const theme = ref(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light')
function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', theme.value)
  localStorage.setItem('mimu-platform-theme', theme.value)
}

const navItems = [
  { to: '/dashboard',    key: 'nav.dashboard',    icon: PhGauge },
  { to: '/campaigns',    key: 'nav.campaigns',    icon: PhMegaphone },
  { to: '/screens',      key: 'nav.screens',      icon: PhMapPin },
  { to: '/audiences',   key: 'nav.audiences',    icon: PhUsers },
  { to: '/reports',      key: 'nav.reports',      icon: PhChartLine },
  { to: '/billing',      key: 'nav.billing',      icon: PhWallet },
  { to: '/organization', key: 'nav.organization', icon: PhBuildings },
] as const

const userName = computed(() => session.user?.name ?? session.context.userId ?? '')
const userEmail = computed(() => session.user?.email ?? '')
const roleLabel = computed(() => (session.role ? session.role.replace(/_/g, ' ') : ''))
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
  <div class="min-h-screen bg-[var(--bg)]">
    <CommandPalette ref="palette" :on-toggle-theme="toggleTheme" />

    <!-- Mobile nav sheet (drops from top) -->
    <TransitionRoot as="template" :show="mobileOpen">
      <Dialog as="div" class="relative z-50 md:hidden" @close="mobileOpen = false">
        <TransitionChild
          as="template"
          enter="transition-opacity ease-out duration-200"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="transition-opacity ease-in duration-150"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm" />
        </TransitionChild>

        <div class="fixed inset-x-0 top-0 p-3">
          <TransitionChild
            as="template"
            enter="transition ease-out duration-200 transform"
            enter-from="opacity-0 -translate-y-3"
            enter-to="opacity-100 translate-y-0"
            leave="transition ease-in duration-150 transform"
            leave-from="opacity-100 translate-y-0"
            leave-to="opacity-0 -translate-y-3"
          >
            <DialogPanel class="rounded-[14px] border border-line bg-surface shadow-pop">
              <div class="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-line">
                <div class="flex items-center gap-2.5">
                  <img src="/bimi-logo.svg" alt="" class="h-7 w-7 rounded-lg object-cover" />
                  <span class="text-[16px] font-semibold tracking-tight text-neutral-900">{{ $t('app.name') }}</span>
                </div>
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-900/[0.05]"
                  @click="mobileOpen = false"
                >
                  <PhX :size="18" />
                </button>
              </div>
              <nav class="p-2">
                <RouterLink
                  v-for="item in navItems"
                  :key="item.to"
                  :to="item.to"
                  class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-900/[0.04] hover:text-neutral-900"
                  active-class="bg-clay-500/10 !text-neutral-900 font-semibold"
                  @click="mobileOpen = false"
                >
                  <component :is="item.icon" :size="17" class="shrink-0" />
                  {{ $t(item.key) }}
                </RouterLink>
              </nav>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Floating pill topbar -->
    <header class="sticky top-0 z-10 px-3 pt-2.5 pb-2">
      <div
        class="mx-auto flex h-[52px] max-w-screen-2xl items-center gap-2 rounded-[14px] border border-line bg-surface/[0.96] px-3 shadow-float backdrop-blur-md"
      >
        <!-- Logo -->
        <RouterLink
          to="/dashboard"
          class="flex shrink-0 items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-neutral-900/[0.04]"
        >
          <img src="/bimi-logo.svg" alt="" class="h-7 w-7 rounded-lg object-cover" />
          <span class="hidden text-[15px] font-semibold tracking-[-0.02em] text-neutral-900 sm:block">{{ $t('app.name') }}</span>
        </RouterLink>

        <div class="hidden h-4 w-px shrink-0 bg-line md:block" />

        <!-- Desktop nav -->
        <nav class="hidden flex-1 items-center gap-0.5 md:flex">
          <RouterLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-neutral-500 transition-colors hover:bg-neutral-900/[0.04] hover:text-neutral-900"
            active-class="!bg-clay-500/10 !text-neutral-900 font-semibold"
          >
            <component :is="item.icon" :size="14" weight="regular" />
            {{ $t(item.key) }}
          </RouterLink>
        </nav>

        <!-- Right actions -->
        <div class="ml-auto flex items-center gap-0.5 md:ml-0">
          <!-- Search (desktop) -->
          <button
            type="button"
            class="hidden h-8 items-center gap-1.5 rounded-lg border border-line bg-neutral-50 px-2.5 text-[12px] text-neutral-400 transition-colors hover:border-line-strong hover:text-neutral-600 md:flex"
            @click="palette?.open()"
          >
            <PhMagnifyingGlass :size="13" />
            <span>{{ $t('cmd.placeholder') }}</span>
            <kbd
              class="hidden items-center gap-0.5 rounded border border-line px-1 py-0.5 text-[9px] font-semibold leading-none text-neutral-400 sm:inline-flex"
            >
              {{ isMac ? '⌘' : 'Ctrl' }} K
            </kbd>
          </button>

          <!-- Theme toggle -->
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-900/[0.04] hover:text-neutral-900"
            :title="$t('nav.toggleTheme')"
            @click="toggleTheme"
          >
            <PhMoon v-if="theme === 'light'" :size="16" />
            <PhSun v-else :size="16" />
          </button>

          <!-- Notifications -->
          <button
            type="button"
            class="relative flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-900/[0.04]"
            title="Notifications"
          >
            <PhBell :size="16" />
            <span class="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-clay-500" />
          </button>

          <!-- User menu -->
          <Menu as="div" class="relative">
            <MenuButton
              class="flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-neutral-900/[0.04]"
            >
              <img
                v-if="session.user?.profileImageUrl"
                :src="session.user.profileImageUrl"
                alt="avatar"
                class="h-6 w-6 rounded-lg object-cover"
              />
              <div
                v-else
                class="flex h-6 w-6 items-center justify-center rounded-lg bg-clay-500 text-[10px] font-bold text-white"
              >
                {{ userInitials }}
              </div>
              <PhCaretDown :size="11" class="text-neutral-400" />
            </MenuButton>
            <transition
              enter-active-class="transition ease-out duration-100"
              enter-from-class="transform opacity-0 scale-95"
              enter-to-class="transform opacity-100 scale-100"
              leave-active-class="transition ease-in duration-75"
              leave-from-class="transform opacity-100 scale-100"
              leave-to-class="transform opacity-0 scale-95"
            >
              <MenuItems
                class="absolute right-0 z-50 mt-1.5 w-56 origin-top-right overflow-hidden rounded-xl border border-line bg-surface shadow-pop focus:outline-none"
              >
                <div class="border-b border-line p-3">
                  <div class="text-sm font-semibold text-neutral-900">{{ userName }}</div>
                  <div v-if="userEmail" class="text-xs text-neutral-400">{{ userEmail }}</div>
                  <span v-if="roleLabel" class="pill pill-neutral mt-1.5">{{ roleLabel }}</span>
                </div>
                <div class="p-1">
                  <MenuItem v-slot="{ active }">
                    <button
                      :class="[active ? 'bg-neutral-900/[0.05]' : '', 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-neutral-700']"
                      @click="router.push('/settings')"
                    >
                      <PhGearSix :size="16" /> {{ $t('nav.settings') }}
                    </button>
                  </MenuItem>
                </div>
                <div class="border-t border-line p-1">
                  <MenuItem v-slot="{ active }">
                    <button
                      :class="[active ? 'bg-neutral-900/[0.05]' : '', 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-clay-700']"
                      @click="onSignOut"
                    >
                      <PhSignOut :size="16" /> {{ $t('auth.signOut') }}
                    </button>
                  </MenuItem>
                </div>
              </MenuItems>
            </transition>
          </Menu>

          <!-- Mobile hamburger -->
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-900/[0.04] md:hidden"
            @click="mobileOpen = true"
          >
            <PhList :size="18" />
          </button>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="min-h-0 flex-1">
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
</template>
