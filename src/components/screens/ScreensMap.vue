<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { MarkerClusterer } from '@googlemaps/markerclusterer'
import { env } from '@/env'
import { isOnline, type Screen } from '@/api/contracts/screens'

/**
 * Google Maps inventory view (per product decision — replaces the PRD's MapLibre).
 * Clustered markers coloured by online/offline. Degrades to a clear fallback when
 * no VITE_GOOGLE_MAPS_API_KEY is set (dev/CI), so the rest of the browser still works.
 */
const props = defineProps<{ screens: Screen[]; selectedIds: string[] }>()
const emit = defineEmits<{ (e: 'select', screen: Screen): void }>()

const ONLINE = '#2B7244' // moss-500
const OFFLINE = '#A89F94' // neutral-400
const LAGOS = { lat: 6.5244, lng: 3.3792 }

const el = ref<HTMLDivElement | null>(null)
const failed = ref(false)
const hasKey = Boolean(env.googleMapsApiKey)

let map: google.maps.Map | null = null
const markers = shallowRef<Map<string, google.maps.Marker>>(new Map())
let clusterer: MarkerClusterer | null = null

function icon(screen: Screen, selected: boolean): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: selected ? 9 : 6,
    fillColor: isOnline(screen.status) ? ONLINE : OFFLINE,
    fillOpacity: 1,
    strokeColor: selected ? '#B55430' /* clay-500 */ : '#ffffff',
    strokeWeight: selected ? 3 : 1.5,
  }
}

function render(): void {
  if (!map) return
  clusterer?.clearMarkers()
  markers.value.forEach((m) => m.setMap(null))
  const next = new Map<string, google.maps.Marker>()
  for (const s of props.screens) {
    if (s.latitude == null || s.longitude == null) continue
    const selected = props.selectedIds.includes(s.id)
    const marker = new google.maps.Marker({
      position: { lat: s.latitude, lng: s.longitude },
      icon: icon(s, selected),
      title: s.name,
    })
    marker.addListener('click', () => emit('select', s))
    next.set(s.id, marker)
  }
  markers.value = next
  clusterer = new MarkerClusterer({ map, markers: [...next.values()] })
}

onMounted(async () => {
  if (!hasKey || !el.value) return
  try {
    setOptions({ key: env.googleMapsApiKey!, v: 'weekly' })
    const { Map } = await importLibrary('maps')
    await importLibrary('marker')
    map = new Map(el.value, {
      center: LAGOS,
      zoom: 11,
      disableDefaultUI: false,
      clickableIcons: false,
    })
    render()
  } catch {
    failed.value = true
  }
})

onBeforeUnmount(() => {
  clusterer?.clearMarkers()
  markers.value.forEach((m) => m.setMap(null))
})

watch(() => [props.screens, props.selectedIds], render, { deep: true })
</script>

<template>
  <div class="relative h-full w-full">
    <div v-if="hasKey && !failed" ref="el" class="h-full w-full" data-testid="google-map" />
    <div
      v-else
      class="flex h-full w-full flex-col items-center justify-center bg-neutral-100 text-center text-sm text-neutral-500"
      data-testid="map-fallback"
    >
      <p class="font-medium text-neutral-600">{{ $t('screens.mapUnavailable') }}</p>
      <p class="mt-1 max-w-xs">{{ $t('screens.mapUnavailableHint') }}</p>
    </div>
  </div>
</template>
