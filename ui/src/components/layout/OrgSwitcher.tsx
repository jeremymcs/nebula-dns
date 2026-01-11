/**
 * Nebula DNS - Organization Switcher Component
 * Allows MSP users to switch between managed client organizations
 */

'use client'

import { Fragment, useState } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { useAuth } from '@/contexts/AuthContext'
import {
  BuildingOffice2Icon,
  ChevronDownIcon,
  CheckIcon,
  PlusIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

export function OrgSwitcher() {
  const { user, isMsp, currentOrg, organizations, switchOrganization } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [switching, setSwitching] = useState(false)

  // Get display name - use currentOrg for MSP, or tenant name for regular users
  const displayName = currentOrg?.name || user?.tenantName || 'My Organization'
  const hasMultipleOrgs = isMsp && organizations.length > 1

  // Always show org name, but only show dropdown if MSP with multiple orgs
  if (!hasMultipleOrgs) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-space-100 dark:bg-space-800 border border-space-200 dark:border-space-700">
        <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
          <BuildingOffice2Icon className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-medium text-space-700 dark:text-space-200 max-w-[150px] truncate">
          {displayName}
        </span>
      </div>
    )
  }

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSwitch = async (orgId: string) => {
    if (orgId === currentOrg?.id) return
    
    setSwitching(true)
    try {
      await switchOrganization(orgId)
    } catch (error) {
      console.error('Failed to switch organization:', error)
    } finally {
      setSwitching(false)
    }
  }

  return (
    <Menu as="div" className="relative">
      <Menu.Button
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-xl transition-all',
          'bg-space-100 dark:bg-space-800 hover:bg-space-200 dark:hover:bg-space-700',
          'border border-space-200 dark:border-space-700',
          switching && 'opacity-50 pointer-events-none'
        )}
        disabled={switching}
      >
        <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
          <BuildingOffice2Icon className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-medium text-space-700 dark:text-space-200 max-w-[150px] truncate">
          {currentOrg?.name || 'Select Organization'}
        </span>
        <ChevronDownIcon className="h-4 w-4 text-space-400 flex-shrink-0" />
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute left-0 mt-2 w-72 origin-top-left rounded-xl bg-white dark:bg-space-800 shadow-xl ring-1 ring-space-900/5 dark:ring-white/10 focus:outline-none overflow-hidden z-50">
          {/* Search */}
          {organizations.length > 5 && (
            <div className="p-2 border-b border-space-100 dark:border-space-700">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-space-400" />
                <input
                  type="text"
                  placeholder="Search organizations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-space-50 dark:bg-space-900 border border-space-200 dark:border-space-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          {/* Organization List */}
          <div className="max-h-64 overflow-y-auto py-1">
            {filteredOrgs.length === 0 ? (
              <div className="px-4 py-3 text-sm text-space-500 text-center">
                No organizations found
              </div>
            ) : (
              filteredOrgs.map((org) => (
                <Menu.Item key={org.id}>
                  {({ active }) => (
                    <button
                      onClick={() => handleSwitch(org.id)}
                      className={clsx(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left',
                        active && 'bg-space-50 dark:bg-space-700/50',
                        org.id === currentOrg?.id && 'bg-primary-50 dark:bg-primary-900/20'
                      )}
                    >
                      <div className={clsx(
                        'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        org.id === currentOrg?.id
                          ? 'bg-gradient-to-br from-primary-500 to-accent-500'
                          : 'bg-space-200 dark:bg-space-600'
                      )}>
                        <BuildingOffice2Icon className={clsx(
                          'h-4 w-4',
                          org.id === currentOrg?.id ? 'text-white' : 'text-space-500 dark:text-space-300'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-space-900 dark:text-white truncate">
                          {org.name}
                        </div>
                        <div className="text-xs text-space-500 dark:text-space-400 truncate">
                          {org.slug}
                        </div>
                      </div>
                      {org.id === currentOrg?.id && (
                        <CheckIcon className="h-5 w-5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                      )}
                    </button>
                  )}
                </Menu.Item>
              ))
            )}
          </div>

          {/* Add Organization Link */}
          <div className="border-t border-space-100 dark:border-space-700 p-1">
            <Menu.Item>
              {({ active }) => (
                <a
                  href="/dashboard/clients/new"
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium',
                    active ? 'bg-space-50 dark:bg-space-700' : '',
                    'text-primary-600 dark:text-primary-400'
                  )}
                >
                  <PlusIcon className="h-4 w-4" />
                  Add New Organization
                </a>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}

