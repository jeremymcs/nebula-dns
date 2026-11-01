import { redirect } from 'next/navigation';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy invite URL — canonical route is /invite/accept */
export default async function LegacyInviteAcceptRedirect({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      query.set(key, value);
    } else if (Array.isArray(value) && value[0]) {
      query.set(key, value[0]);
    }
  }
  const suffix = query.toString();
  redirect(suffix ? `/invite/accept?${suffix}` : '/invite/accept');
}
