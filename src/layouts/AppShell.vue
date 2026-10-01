<script setup lang="ts">
/**
 * App shell — Tailwind Plus "Sidebar Layout" structure, re-themed to the clay
 * palette. Static sidebar on desktop (md+); a proper off-canvas drawer
 * (Headless UI Dialog) on mobile. Topbar carries the mobile hamburger, theme
 * toggle, notifications and the user menu. Content hosts the banners + RouterView.
 */
import { computed, ref } from 'vue'
import { RouterView, useRouter } from 'vue-router'
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
} from '@phosphor-icons/vue'
import AppSidebar from '@/layouts/AppSidebar.vue'
import CommandPalette from '@/components/CommandPalette.vue'
import VerificationBanner from '@/components/VerificationBanner.vue'
import { useSession } from '@/stores/session'

const session = useSession()
const router = useRouter()

const sidebarOpen = ref(false)
const palette = ref<InstanceType<typeof CommandPalette> | null>(null)
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

// Light / dark theme — flip `data-theme` on <html>, persist. Initial attribute
// is set in main.ts before mount to avoid a flash.
const theme = ref(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light')
function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', theme.value)
  localStorage.setItem('mimu-platform-theme', theme.value)
}

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
    <!-- Global command palette (⌘K) -->
    <CommandPalette ref="palette" :on-toggle-theme="toggleTheme" />

    <!-- Mobile off-canvas sidebar -->
    <TransitionRoot as="template" :show="sidebarOpen">
      <Dialog as="div" class="relative z-40 md:hidden" @close="sidebarOpen = false">
        <TransitionChild
          as="template"
          enter="transition-opacity ease-linear duration-300"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-neutral-900/60" />
        </TransitionChild>

        <div class="fixed inset-0 z-40 flex">
          <TransitionChild
            as="template"
            enter="transition ease-in-out duration-300 transform"
            enter-from="-translate-x-full"
            enter-to="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leave-from="translate-x-0"
            leave-to="-translate-x-full"
          >
            <DialogPanel class="relative flex w-full max-w-xs flex-1 flex-col border-r border-line bg-surface">
              <TransitionChild
                as="template"
                enter="ease-in-out duration-300"
                enter-from="opacity-0"
                enter-to="opacity-100"
                leave="ease-in-out duration-300"
                leave-from="opacity-100"
                leave-to="opacity-0"
              >
                <div class="absolute right-0 top-0 -mr-12 pt-2">
                  <button
                    type="button"
                    class="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                    @click="sidebarOpen = false"
                  >
                    <span class="sr-only">Close sidebar</span>
                    <PhX :size="22" class="text-white" />
                  </button>
                </div>
              </TransitionChild>
              <AppSidebar @navigate="sidebarOpen = false" />
            </DialogPanel>
          </TransitionChild>
          <div class="w-14 shrink-0" aria-hidden="true" />
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Static desktop sidebar -->
    <div class="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
      <div class="flex min-h-0 flex-1 flex-col border-r border-line">
        <AppSidebar />
      </div>
    </div>

    <!-- Main column -->
    <div class="flex min-h-screen flex-col md:pl-64">
      <!-- Topbar -->
      <header
        class="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-4"
      >
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 md:hidden"
          @click="sidebarOpen = true"
        >
          <span class="sr-only">Open sidebar</span>
          <PhList :size="20" />
        </button>

        <button
          type="button"
          class="mx-auto flex max-w-[520px] flex-1 items-center gap-2 rounded-lg border border-line bg-neutral-50 px-3 py-1.5 text-sm text-neutral-400 transition-colors hover:border-line-strong hover:text-neutral-500"
          @click="palette?.open()"
        >
          <PhMagnifyingGlass :size="15" />
          <span class="flex-1 truncate text-left">{{ $t('cmd.placeholder') }}</span>
          <kbd
            class="hidden items-center gap-0.5 rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] font-semibold text-neutral-400 sm:inline-flex"
          >
            {{ isMac ? '⌘' : 'Ctrl' }} K
          </kbd>
        </button>

        <div class="flex items-center gap-1.5">
          <button
            class="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            :title="$t('nav.toggleTheme')"
            @click="toggleTheme"
          >
            <PhMoon v-if="theme === 'light'" :size="18" />
            <PhSun v-else :size="18" />
          </button>

          <button
            class="relative flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100"
            title="Notifications"
          >
            <PhBell :size="18" />
            <span class="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-clay-500" />
          </button>

          <!-- User menu -->
          <Menu as="div" class="relative">
            <MenuButton class="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-neutral-100">
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
                      :class="[active ? 'bg-neutral-100' : '', 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-neutral-700']"
                      @click="router.push('/settings')"
                    >
                      <PhGearSix :size="16" /> {{ $t('nav.settings') }}
                    </button>
                  </MenuItem>
                </div>
                <div class="border-t border-line p-1">
                  <MenuItem v-slot="{ active }">
                    <button
                      :class="[active ? 'bg-neutral-100' : '', 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-clay-700']"
                      @click="onSignOut"
                    >
                      <PhSignOut :size="16" /> {{ $t('auth.signOut') }}
                    </button>
                  </MenuItem>
                </div>
              </MenuItems>
            </transition>
          </Menu>
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
  </div>
</template>
