import { redirect } from 'next/navigation'

/** Integrations live under Settings; keep the old menu path working. */
export default function IntegrationsRedirect() {
  redirect('/dashboard/settings/integrations')
}
