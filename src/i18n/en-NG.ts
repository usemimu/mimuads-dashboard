/**
 * en-NG message catalog. ALL user-facing strings live here (PRD §5 i18n) — no
 * inline copy in components. Keys are namespaced by area.
 */
export default {
  app: {
    name: 'Mimuads',
    tagline: 'The buying surface for out-of-home advertising',
  },
  nav: {
    dashboard: 'Dashboard',
    campaigns: 'Campaigns',
    screens: 'Screens',
    reports: 'Reports',
    billing: 'Billing',
    organization: 'Organization',
    settings: 'Settings',
  },
  context: {
    switchOrg: 'Switch organization',
    switchWorkspace: 'Switch workspace',
    org: 'Organization',
    workspace: 'Workspace',
    actingAs: 'Acting as',
    enumerationComingSoon: 'Switching between organizations is coming soon.',
  },
  auth: {
    signIn: 'Sign in',
    signOut: 'Sign out',
    haveAccount: 'Have an account?',
    noAccount: "Don't have an account?",
    createAccount: 'Create an account',
    phoneOrEmail: 'Phone or email',
    password: 'Password',
    signingIn: 'Signing in…',
    signInFailed: 'Sign-in failed. Check your details and try again.',
    sessionExpired: 'Your session expired. Please sign in again.',
  },
  onboarding: {
    pendingTitle: 'Set up your organization',
    pendingBody: 'Create an organization to start buying media.',
  },
  roles: {
    viewerReadOnly: 'You have view-only access in this context.',
  },
  common: {
    loading: 'Loading…',
    retry: 'Retry',
    cancel: 'Cancel',
    save: 'Save',
    comingSoon: 'Coming soon',
  },
  errors: {
    network: 'Could not reach Mimuads. Check your connection and retry.',
    forbidden: "You don't have access to this.",
    notFound: 'Not found.',
    server: 'Something went wrong on our end. Please try again.',
    generic: 'Something went wrong.',
  },
}
