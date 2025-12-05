const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface RequestOptions extends RequestInit {
  token?: string
}

class ApiError extends Error {
  status: number
  
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  } else if (typeof window !== 'undefined') {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      headers['Authorization'] = `Bearer ${storedToken}`
    }
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new ApiError(error.message || 'Request failed', response.status)
  }
  
  if (response.status === 204) {
    return {} as T
  }
  
  return response.json()
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  
  // Policies
  getPolicies: (cursor?: string) =>
    request<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>(
      `/policies${cursor ? `?cursor=${cursor}` : ''}`
    ),
  
  getPolicy: (id: string) => request<any>(`/policies/${id}`),
  
  createPolicy: (data: any) =>
    request<any>('/policies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  updatePolicy: (id: string, data: any) =>
    request<any>(`/policies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  // Locations
  getLocations: (cursor?: string) =>
    request<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>(
      `/locations${cursor ? `?cursor=${cursor}` : ''}`
    ),
  
  getLocation: (id: string) => request<any>(`/locations/${id}`),
  
  createLocation: (data: any) =>
    request<any>('/locations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  createLocationToken: (locationId: string, data: any) =>
    request<{ token: string; tokenId: string; expiresAt: string | null }>(
      `/locations/${locationId}/tokens`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),
  
  // Lists
  getLists: (type?: 'allowlist' | 'blocklist') =>
    request<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>(
      `/lists${type ? `?type=${type}` : ''}`
    ),
  
  getListEntries: (listId: string, cursor?: string) =>
    request<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>(
      `/lists/${listId}/entries${cursor ? `?cursor=${cursor}` : ''}`
    ),
  
  addListEntries: (listId: string, entries: any[]) =>
    request<{ added: number; skipped: number }>(`/lists/${listId}/entries`, {
      method: 'POST',
      body: JSON.stringify({ entries }),
    }),
  
  // Reports
  getSummary: (period: string = '7d') =>
    request<any>(`/reports/summary?period=${period}`),
  
  getTopBlocked: (period: string = '7d', limit: number = 10) =>
    request<any[]>(`/reports/top-blocked?period=${period}&limit=${limit}`),
  
  getBlocksByCategory: (period: string = '7d') =>
    request<any[]>(`/reports/blocks-by-category?period=${period}`),
  
  // Users
  getUsers: (cursor?: string) =>
    request<{ data: any[]; pagination: { cursor: string | null; hasMore: boolean } }>(
      `/users${cursor ? `?cursor=${cursor}` : ''}`
    ),
  
  createUser: (data: any) =>
    request<any>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

export { ApiError }
