import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useSession } from '@/stores/session'
import { useInvite } from '@/stores/invite'
import AppShell from '@/layouts/AppShell.vue'

/**
 * Routing + the context model. The shell is unreachable until (a) authenticated
 * and (b) an org exists. Signup is a single flow with a fork at org creation
 * (/signup → /signup/verify → /signup/organization). The invite path bypasses
 * org creation. Deep links carry workspace context as `/w/:slug/...`.
 */
const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
  { path: '/signup', name: 'signup', component: () => import('@/views/SignupView.vue'), meta: { public: true } },
  {
    path: '/signup/verify',
    name: 'signup-verify',
    component: () => import('@/views/VerifyOtpView.vue'),
    meta: { public: true },
  },
  {
    path: '/signup/social-phone',
    name: 'social-phone',
    component: () => import('@/views/SocialPhoneView.vue'),
    meta: { public: true },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/views/ForgotPasswordView.vue'),
    meta: { public: true },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('@/views/ResetPasswordView.vue'),
    meta: { public: true },
  },
  // Org creation / onboarding-pending target (authed, no org required).
  {
    path: '/signup/organization',
    name: 'onboarding',
    component: () => import('@/views/OrgSetupView.vue'),
    meta: { requiresAuth: true, requiresOrg: false },
  },
  // Invite path bypasses org creation.
  {
    path: '/invite/:token',
    name: 'invite',
    component: () => import('@/views/InviteView.vue'),
    meta: { requiresAuth: true, requiresOrg: false },
  },
  {
    path: '/',
    component: AppShell,
    meta: { requiresAuth: true, requiresOrg: true },
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { titleKey: 'nav.dashboard' } },
      { path: 'campaigns', name: 'campaigns', component: () => import('@/views/CampaignsListView.vue'), meta: { titleKey: 'nav.campaigns' } },
      { path: 'campaigns/new', name: 'campaign-new', component: () => import('@/views/CampaignWizardView.vue'), meta: { titleKey: 'campaigns.newCampaign' } },
      { path: 'campaigns/:id', name: 'campaign-detail', component: () => import('@/views/CampaignDetailView.vue'), meta: { titleKey: 'nav.campaigns' } },
      { path: 'screens', name: 'screens', component: () => import('@/views/ScreensView.vue'), meta: { titleKey: 'nav.screens' } },
      { path: 'audiences', name: 'audiences', component: () => import('@/views/AudiencesView.vue'), meta: { titleKey: 'nav.audiences' } },
      { path: 'reports', name: 'reports', component: () => import('@/views/ReportsView.vue'), meta: { titleKey: 'nav.reports' } },
      { path: 'billing', name: 'billing', component: () => import('@/views/BillingView.vue'), meta: { titleKey: 'nav.billing' } },
      { path: 'organization', name: 'organization', component: () => import('@/views/OrgAdminView.vue'), meta: { titleKey: 'nav.organization' } },
      { path: 'verify', name: 'verification', component: () => import('@/views/VerificationView.vue'), meta: { titleKey: 'verification.hubTitle' } },
      { path: 'settings', name: 'settings', component: () => import('@/views/SettingsView.vue'), meta: { titleKey: 'nav.settings' } },
    ],
  },
  {
    path: '/w/:workspaceSlug/:rest(.*)*',
    redirect: (to) => '/' + (Array.isArray(to.params.rest) ? to.params.rest.join('/') : ''),
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// ── SEO <head> per route ────────────────────────────────────────────────────
// ads.usemimu.com is a SPA console. Only the public auth pages are meaningful
// to search engines (the rest redirect bots to /login). We index the two entry
// points — /signup is the "Get started" sitelink target, /login the returning
// door — and noindex everything else. Titles/description/canonical are updated
// on every navigation; index.html carries the first-paint defaults.
const SITE = 'https://ads.usemimu.com'
type PageSeo = { title: string; desc: string; path: string }
const PUBLIC_SEO: Record<string, PageSeo> = {
  signup: {
    title: 'Get started with Mimuads | The infrastructure for physical ad buying',
    desc: 'Create your account and start buying on the infrastructure for physical advertising. Every DOOH screen, verified and programmatic. Self serve, no agency needed, live in a day.',
    path: '/signup',
  },
  login: {
    title: 'Log in | Mimuads',
    desc: 'Log in to Mimuads, the infrastructure for physical ad buying. Launch and manage verified, programmatic DOOH campaigns across the network.',
    path: '/login',
  },
  'signup-verify': {
    title: 'Verify your email | Mimuads',
    desc: 'Verify your email to finish creating your Mimuads account.',
    path: '/signup/verify',
  },
  'forgot-password': {
    title: 'Reset your password | Mimuads',
    desc: 'Reset the password for your Mimuads account.',
    path: '/forgot-password',
  },
  'reset-password': {
    title: 'Set a new password | Mimuads',
    desc: 'Set a new password for your Mimuads account.',
    path: '/reset-password',
  },
}
// Only the two entry points earn a place in the index.
const INDEXABLE = new Set(['signup', 'login'])
const DEFAULT_TITLE = 'Mimuads | The infrastructure for physical ad buying'
const DEFAULT_DESC = 'The Mimuads console. Launch and manage verified, programmatic DOOH campaigns on the infrastructure for physical ad buying.'

function setMetaTag(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

router.afterEach((to) => {
  if (typeof document === 'undefined') return
  const page = PUBLIC_SEO[to.name as string]
  const title = page?.title ?? DEFAULT_TITLE
  const desc = page?.desc ?? DEFAULT_DESC
  const canonical = SITE + (page?.path ?? to.path)
  const indexable = INDEXABLE.has(to.name as string)

  document.title = title
  setMetaTag('name', 'description', desc)
  setMetaTag(
    'name',
    'robots',
    indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow',
  )
  setCanonical(canonical)
  setMetaTag('property', 'og:title', title)
  setMetaTag('property', 'og:description', desc)
  setMetaTag('property', 'og:url', canonical)
  setMetaTag('name', 'twitter:title', title)
  setMetaTag('name', 'twitter:description', desc)
})

router.beforeEach(async (to) => {
  const session = useSession()
  const invite = useInvite()
  if (!session.bootstrapped) await session.bootstrap()

  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth)
  const requiresOrg = to.matched.some((r) => r.meta.requiresOrg)

  // Signed-in users never see the public auth pages.
  if (to.meta.public && session.isAuthenticated) {
    return session.hasOrg ? { name: 'dashboard' } : { name: 'onboarding' }
  }
  if (requiresAuth && !session.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  // No org yet: a pending invite takes priority over org creation.
  if (requiresOrg && !session.hasOrg) {
    return invite.token ? `/invite/${invite.token}` : { name: 'onboarding' }
  }
  if (to.name === 'onboarding' && session.hasOrg) {
    return { name: 'dashboard' }
  }
  return true
})

export default router
