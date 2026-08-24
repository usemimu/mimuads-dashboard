<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { env } from '@/env'
import { isOnline, type Screen } from '@/api/contracts/screens'

/**
 * Google Maps inventory view — the web equivalent of the mobile screens map.
 * Each screen radiates an animated pulse from its exact position (a custom
 * OverlayView of CSS-animated dots — Google's classic marker icons are
 * rasterised and can't animate). Online screens pulse clay, offline muted;
 * tapping one emits `select`. The camera frames all visible screens when the
 * filtered set changes. Degrades to a clear fallback when no
 * VITE_GOOGLE_MAPS_API_KEY is set (dev/CI) or the key is unauthorised.
 */
const props = defineProps<{ screens: Screen[]; selectedIds: string[] }>()
const emit = defineEmits<{ (e: 'select', screen: Screen): void }>()

const LAGOS = { lat: 6.5244, lng: 3.3792 }

const el = ref<HTMLDivElement | null>(null)
const failed = ref(false)
const hasKey = Boolean(env.googleMapsApiKey)

let map: google.maps.Map | null = null

// The pulse layer. Its concrete class extends google.maps.OverlayView, which
// only exists after the Maps library loads — so it's built in a factory once
// `importLibrary('maps')` has resolved (see `createPulseLayer`).
interface PulseLayer extends google.maps.OverlayView {
  setScreens(list: Screen[]): void
  setSelected(ids: string[]): void
}
let layer: PulseLayer | null = null

function createPulseLayer(onSelect: (s: Screen) => void): PulseLayer {
  class Pulse extends google.maps.OverlayView implements PulseLayer {
    private container: HTMLDivElement | null = null
    private dots = new Map<string, HTMLDivElement>()
    private list: Screen[] = []
    private selected = new Set<string>()

    onAdd(): void {
      const c = document.createElement('div')
      c.style.position = 'absolute'
      c.style.inset = '0'
      c.style.pointerEvents = 'none' // let the map pan; dots opt back in
      this.container = c
      this.getPanes()!.overlayMouseTarget.appendChild(c)
      this.build()
    }

    onRemove(): void {
      this.container?.remove()
      this.container = null
      this.dots.clear()
    }

    setScreens(next: Screen[]): void {
      this.list = next
      this.build()
      this.draw()
    }

    setSelected(ids: string[]): void {
      this.selected = new Set(ids)
      for (const [id, dot] of this.dots) dot.classList.toggle('is-selected', this.selected.has(id))
    }

    private build(): void {
      if (!this.container) return
      this.container.replaceChildren()
      this.dots.clear()
      for (const s of this.list) {
        if (s.latitude == null || s.longitude == null) continue
        const dot = document.createElement('div')
        dot.className = [
          'screen-pulse',
          isOnline(s.status) ? '' : 'is-offline',
          this.selected.has(s.id) ? 'is-selected' : '',
        ]
          .filter(Boolean)
          .join(' ')
        dot.style.pointerEvents = 'auto'
        dot.title = s.name
        dot.addEventListener('click', () => onSelect(s))
        this.container.appendChild(dot)
        this.dots.set(s.id, dot)
      }
    }

    draw(): void {
      const proj = this.getProjection()
      if (!proj) return
      for (const s of this.list) {
        const dot = this.dots.get(s.id)
        if (!dot || s.latitude == null || s.longitude == null) continue
        const p = proj.fromLatLngToDivPixel(new google.maps.LatLng(s.latitude, s.longitude))
        if (!p) {
          dot.style.display = 'none'
          continue
        }
        dot.style.display = ''
        dot.style.left = `${p.x}px`
        dot.style.top = `${p.y}px`
      }
    }
  }
  return new Pulse()
}

// A single screen frames at street level; a spread of screens fits to bounds
// but never zooms past this, so a tight cluster doesn't slam to max zoom.
const SINGLE_ZOOM = 15
const MAX_FIT_ZOOM = 15

/** Frame the camera around all screens with a coordinate (mobile "fit"). */
function frame(): void {
  if (!map) return
  const pts = props.screens.filter((s) => s.latitude != null && s.longitude != null)
  if (!pts.length) return
  if (pts.length === 1) {
    map.setCenter({ lat: pts[0]!.latitude!, lng: pts[0]!.longitude! })
    map.setZoom(SINGLE_ZOOM)
    return
  }
  const bounds = new google.maps.LatLngBounds()
  for (const s of pts) bounds.extend({ lat: s.latitude!, lng: s.longitude! })
  // 64px padding keeps the outermost pulses off the panel edges. fitBounds
  // picks the tightest zoom that shows them all; cap it once it settles.
  map.fitBounds(bounds, 64)
  google.maps.event.addListenerOnce(map, 'idle', () => {
    if (map && (map.getZoom() ?? 0) > MAX_FIT_ZOOM) map.setZoom(MAX_FIT_ZOOM)
  })
}

onMounted(async () => {
  if (!hasKey || !el.value) return
  // Google reports auth failures (bad/restricted/unbilled key) by calling this
  // global — it does NOT throw, so without this hook the map tile shows
  // Google's own "This page didn't load Google Maps correctly" overlay. Flip to
  // our graceful fallback instead. See the .env note on needing a *web* key.
  ;(window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
    failed.value = true
  }
  try {
    setOptions({ key: env.googleMapsApiKey!, v: 'weekly' })
    const { Map } = await importLibrary('maps')
    map = new Map(el.value, {
      center: LAGOS,
      zoom: 11,
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
    })
    layer = createPulseLayer((s) => emit('select', s))
    layer.setScreens(props.screens)
    layer.setSelected(props.selectedIds)
    layer.setMap(map)
    frame()
  } catch {
    failed.value = true
  }
})

onBeforeUnmount(() => {
  layer?.setMap(null)
  layer = null
})

// The filtered set changing rebuilds the dots and re-frames the camera; a pure
// selection change only recolours (keeps the user's current viewport).
watch(() => props.screens, () => { layer?.setScreens(props.screens); frame() }, { deep: true })
watch(() => props.selectedIds, () => layer?.setSelected(props.selectedIds), { deep: true })
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
