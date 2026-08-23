<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { MarkerClusterer } from '@googlemaps/markerclusterer'
import { env } from '@/env'
import { isOnline, type Screen } from '@/api/contracts/screens'

/**
 * Google Maps inventory view — the web equivalent of the mobile screens map.
 * Screens render as clay dots (online) / muted dots (offline); tapping one
 * emits `select` so the parent can raise a detail card. The camera frames all
 * visible screens whenever the filtered set changes (mirrors the mobile map's
 * "fit to features"). Degrades to a clear fallback when no
 * VITE_GOOGLE_MAPS_API_KEY is set (dev/CI).
 */
const props = defineProps<{ screens: Screen[]; selectedIds: string[] }>()
const emit = defineEmits<{ (e: 'select', screen: Screen): void }>()

const ONLINE = '#B55430' // clay-500 — matches the mobile accent dot
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
    strokeColor: selected ? '#79321E' /* clay-700 */ : '#ffffff',
    strokeWeight: selected ? 3 : 1.5,
  }
}

/** Frame the camera around all screens with a coordinate (mobile "fit"). */
function frame(): void {
  if (!map) return
  const pts = props.screens.filter((s) => s.latitude != null && s.longitude != null)
  if (!pts.length) return
  if (pts.length === 1) {
    map.setCenter({ lat: pts[0]!.latitude!, lng: pts[0]!.longitude! })
    map.setZoom(14)
    return
  }
  const bounds = new google.maps.LatLngBounds()
  for (const s of pts) bounds.extend({ lat: s.latitude!, lng: s.longitude! })
  map.fitBounds(bounds, 64)
}

/** Rebuild every marker + cluster from the current screen set. */
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

/** Recolour existing markers for selection changes — no camera re-frame. */
function refreshSelection(): void {
  for (const s of props.screens) {
    const m = markers.value.get(s.id)
    if (m) m.setIcon(icon(s, props.selectedIds.includes(s.id)))
  }
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
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
    })
    render()
    frame()
  } catch {
    failed.value = true
  }
})

onBeforeUnmount(() => {
  clusterer?.clearMarkers()
  markers.value.forEach((m) => m.setMap(null))
})

// The filtered set changing rebuilds markers and re-frames the camera; a
// pure selection change only recolours (keeps the user's current viewport).
watch(() => props.screens, () => { render(); frame() }, { deep: true })
watch(() => props.selectedIds, refreshSelection, { deep: true })
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
