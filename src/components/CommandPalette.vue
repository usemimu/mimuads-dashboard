<script setup lang="ts">
import MimuIcon from '@/components/ui/MimuIcon.vue'
/**
 * Global ⌘K / Ctrl-K command palette (Tailwind Plus "Command Palette" pattern,
 * clay-themed). Jumps between pages and fires quick actions. Opened via the
 * keyboard shortcut, the topbar search affordance, or `open()` exposed to the
 * parent. Actions are gated by role so viewers never see mutating entries.
 */
import { computed, onMounted, onUnmounted, ref, watch, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  Combobox,
  ComboboxInput,
  ComboboxOptions,
  ComboboxOption,
  Dialog,
  DialogPanel,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import {
  PhMagnifyingGlass,
  PhGauge,
  PhMegaphone,
  PhMapPin,
  PhChartLine,
  PhWallet,
  PhBuildings,
  PhGearSix,
  PhSealCheck,
  PhPlus,
  PhArrowUpRight,
  PhUserPlus,
  PhMoon,
  PhArrowRight,
} from '@phosphor-icons/vue'
import { useSession } from '@/stores/session'

const props = defineProps<{ onToggleTheme?: () => void }>()

type Item = {
  id: string
  label: string
  icon: Component
  group: 'pages' | 'actions'
  run: () => void
  when?: () => boolean
}

const session = useSession()
const router = useRouter()
const { t } = useI18n()

const open = ref(false)
const query = ref('')

function close() {
  open.value = false
}
function go(path: string) {
  close()
  router.push(path)
}

const pages: Item[] = [
  { id: 'dashboard', label: 'nav.dashboard', icon: PhGauge, group: 'pages', run: () => go('/dashboard') },
  { id: 'campaigns', label: 'nav.campaigns', icon: PhMegaphone, group: 'pages', run: () => go('/campaigns') },
  { id: 'screens', label: 'nav.screens', icon: PhMapPin, group: 'pages', run: () => go('/screens') },
  { id: 'reports', label: 'nav.reports', icon: PhChartLine, group: 'pages', run: () => go('/reports') },
  { id: 'billing', label: 'nav.billing', icon: PhWallet, group: 'pages', run: () => go('/billing') },
  { id: 'organization', label: 'nav.organization', icon: PhBuildings, group: 'pages', run: () => go('/organization') },
  { id: 'verify', label: 'verification.hubTitle', icon: PhSealCheck, group: 'pages', run: () => go('/verify') },
  { id: 'settings', label: 'nav.settings', icon: PhGearSix, group: 'pages', run: () => go('/settings') },
]

const actions: Item[] = [
  {
    id: 'new-campaign',
    label: 'cmd.newCampaign',
    icon: PhPlus,
    group: 'actions',
    when: () => session.canSubmitCampaign,
    run: () => go('/campaigns/new'),
  },
  {
    id: 'top-up',
    label: 'cmd.topUp',
    icon: PhArrowUpRight,
    group: 'actions',
    when: () => session.canManageBilling,
    run: () => go('/billing'),
  },
  {
    id: 'invite',
    label: 'cmd.inviteMember',
    icon: PhUserPlus,
    group: 'actions',
    when: () => session.canMutate,
    run: () => go('/organization'),
  },
  {
    id: 'toggle-theme',
    label: 'cmd.toggleTheme',
    icon: PhMoon,
    group: 'actions',
    run: () => {
      props.onToggleTheme?.()
      close()
    },
  },
]

const available = computed(() => [...pages, ...actions].filter((i) => (i.when ? i.when() : true)))

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return available.value
  return available.value.filter((i) => t(i.label).toLowerCase().includes(q))
})
const pageResults = computed(() => filtered.value.filter((i) => i.group === 'pages'))
const actionResults = computed(() => filtered.value.filter((i) => i.group === 'actions'))

function onSelect(item: Item | null) {
  if (item) item.run()
}

function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    open.value = !open.value
  }
}

watch(open, (v) => {
  if (!v) query.value = ''
})

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

defineExpose({ open: () => (open.value = true) })
</script>

<template>
  <TransitionRoot :show="open" as="template" appear @after-leave="query = ''">
    <Dialog class="relative z-50" @close="close">
      <TransitionChild
        as="template"
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-150"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" />
      </TransitionChild>

      <div class="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20">
        <TransitionChild
          as="template"
          enter="ease-out duration-200"
          enter-from="opacity-0 scale-95"
          enter-to="opacity-100 scale-100"
          leave="ease-in duration-150"
          leave-from="opacity-100 scale-100"
          leave-to="opacity-0 scale-95"
        >
          <DialogPanel
            class="mx-auto max-w-xl transform overflow-hidden rounded-2xl border border-line bg-surface shadow-float transition-all"
          >
            <Combobox @update:modelValue="onSelect">
              <div class="relative">
                <PhMagnifyingGlass
                  :size="18"
                  class="pointer-events-none absolute left-4 top-3.5 text-neutral-400"
                />
                <ComboboxInput
                  class="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0"
                  :placeholder="$t('cmd.placeholder')"
                  autocomplete="off"
                  @change="query = ($event.target as HTMLInputElement).value"
                />
              </div>

              <ComboboxOptions
                v-if="filtered.length"
                static
                class="max-h-80 scroll-py-2 overflow-y-auto border-t border-line p-2"
              >
                <template v-if="pageResults.length">
                  <p class="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                    {{ $t('cmd.pages') }}
                  </p>
                  <ComboboxOption
                    v-for="item in pageResults"
                    :key="item.id"
                    v-slot="{ active }"
                    :value="item"
                    as="template"
                  >
                    <li
                      :class="[
                        'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm',
                        active ? 'bg-clay-500/10 text-neutral-900' : 'text-neutral-700',
                      ]"
                    >
                      <component :is="item.icon" :size="18" :class="active ? 'text-clay-600' : 'text-neutral-400'" />
                      <span class="flex-1">{{ $t(item.label) }}</span>
                      <PhArrowRight v-if="active" :size="14" class="text-clay-500" />
                    </li>
                  </ComboboxOption>
                </template>

                <template v-if="actionResults.length">
                  <p class="px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                    {{ $t('cmd.actions') }}
                  </p>
                  <ComboboxOption
                    v-for="item in actionResults"
                    :key="item.id"
                    v-slot="{ active }"
                    :value="item"
                    as="template"
                  >
                    <li
                      :class="[
                        'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm',
                        active ? 'bg-clay-500/10 text-neutral-900' : 'text-neutral-700',
                      ]"
                    >
                      <component :is="item.icon" :size="18" :class="active ? 'text-clay-600' : 'text-neutral-400'" />
                      <span class="flex-1">{{ $t(item.label) }}</span>
                      <PhArrowRight v-if="active" :size="14" class="text-clay-500" />
                    </li>
                  </ComboboxOption>
                </template>
              </ComboboxOptions>

              <div v-else class="flex flex-col items-center border-t border-line px-6 py-10 text-center text-sm text-neutral-400">
                <MimuIcon name="nearby" variant="sticker" :size="88" class="mb-2" />
                {{ $t('cmd.empty') }}
              </div>
            </Combobox>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
