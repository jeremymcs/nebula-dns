'use client'

import { use } from 'react'
import { TenantDetailView } from '@/components/tenants/TenantDetailView'
import { useAdminTenantDetail } from '@/hooks/useApi'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function TenantDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const { data, isLoading, error, mutate } = useAdminTenantDetail(id)

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
      <TenantDetailView
        tenantId={id}
        tenant={data}
        isLoading={isLoading}
        error={error}
        onRefresh={() => mutate()}
      />
    </div>
  )
}
