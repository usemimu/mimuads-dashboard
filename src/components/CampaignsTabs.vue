<script setup lang="ts">
import { RouterLink } from 'vue-router'

// Sibling tabs under the Campaigns area: the campaign list vs the ad (creative)
// library. Kept as its own component so both views share one source of truth.
const tabs = [
  { to: '/campaigns', key: 'campaigns.tabCampaigns' },
  { to: '/campaigns/ads', key: 'creatives.tabAds' },
]
</script>

<template>
  <div class="mb-5 flex gap-1 border-b border-line">
    <RouterLink
      v-for="t in tabs"
      :key="t.to"
      :to="t.to"
      class="-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors"
      :class="$route.path === t.to
        ? 'border-clay-500 text-clay-700'
        : 'border-transparent text-neutral-500 hover:text-neutral-800'"
    >
      {{ $t(t.key) }}
    </RouterLink>
  </div>
</template>
