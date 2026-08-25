<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { PhFilmSlate, PhMagnifyingGlass } from '@phosphor-icons/vue'
import Card from '@/components/ui/Card.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import Badge from '@/components/ui/Badge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import CampaignsTabs from '@/components/CampaignsTabs.vue'
import { listCreatives } from '@/api/creatives'
import type { CreativeStatus } from '@/api/contracts/creatives'
import { useSession } from '@/stores/session'
import { ctxKey } from '@/lib/ctx-key'

const session = useSession()
const search = ref('')

// Every ad the org has uploaded, across all campaigns and statuses — this is
// the library that used to clutter the wizard's creative step.
const { data, isLoading } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'creatives')),
  queryFn: listCreatives,
})
const creatives = computed<CreativeStatus[]>(() => data.value?.creatives ?? [])

const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  return q
    ? creatives.value.filter((c) => (c.name || c.filename).toLowerCase().includes(q))
    : creatives.value
})

// Creative statuses have their own vocabulary (uploading → approved/rejected),
// distinct from campaign statuses, so map tone locally.
function tone(status: string): 'success' | 'danger' | 'pending' {
  if (status === 'approved') return 'success'
  if (status === 'rejected' || status === 'failed') return 'danger'
  return 'pending'
}
</script>

<template>
  <div>
    <PageHeader :title="$t('creatives.title')" :subtitle="$t('creatives.subtitle')" />
    <CampaignsTabs />

    <div class="mb-5">
      <div class="relative max-w-sm">
        <PhMagnifyingGlass :size="15" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input v-model="search" :placeholder="$t('dashboard.searchPlaceholder')" class="input py-1.5 pl-8 text-sm" />
      </div>
    </div>

    <p v-if="isLoading" class="py-10 text-center text-sm text-neutral-400">{{ $t('common.loading') }}</p>
    <Card v-else-if="!visible.length">
      <EmptyState :title="$t('creatives.empty')">
        <template #icon><PhFilmSlate :size="24" /></template>
      </EmptyState>
    </Card>
    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="c in visible"
        :key="c.id"
        class="overflow-hidden rounded-xl border border-line bg-surface shadow-card"
      >
        <div class="relative aspect-video overflow-hidden bg-black">
          <img
            v-if="c.posterUrl || (c.format === 'image' && (c.previewUrl || c.cdnUrl))"
            :src="c.posterUrl ?? c.previewUrl ?? c.cdnUrl ?? ''"
            alt=""
            class="h-full w-full object-cover"
          />
          <div v-else class="flex h-full w-full items-center justify-center text-neutral-600">
            <PhFilmSlate :size="32" />
          </div>
          <Badge :tone="tone(c.status)" class="absolute left-2 top-2 shadow-sm capitalize">
            {{ c.status.replace(/_/g, ' ') }}
          </Badge>
        </div>
        <div class="p-3">
          <p class="truncate font-medium text-neutral-900">{{ c.name || c.filename }}</p>
          <p class="text-xs capitalize text-neutral-400">{{ c.format }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
