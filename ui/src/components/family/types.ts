/**
 * Nebula DNS - Family Mode Types
 */

export interface FamilyMember {
  id: string
  name: string
  avatar: string
  role: 'parent' | 'teen' | 'child'
  devices: FamilyDevice[]
  restrictions: MemberRestrictions
  screenTime: ScreenTimeData
  isOnline: boolean
}

export interface FamilyDevice {
  id: string
  name: string
  type: 'phone' | 'tablet' | 'laptop' | 'desktop' | 'gaming' | 'tv'
  isOnline: boolean
  lastSeen?: string
}

export interface MemberRestrictions {
  bedtime?: { start: string; end: string }
  dailyLimit?: number // minutes
  blockedCategories: string[]
  allowedApps: string[]
  safeSearch: boolean
}

export interface ScreenTimeData {
  today: number // minutes
  weekAverage: number
  byCategory: CategoryTime[]
}

export interface CategoryTime {
  category: string
  minutes: number
  color: string
}

export interface SchedulePreset {
  id: string
  name: string
  icon: string
  description: string
  restrictions: Partial<MemberRestrictions>
}

export const SCHEDULE_PRESETS: SchedulePreset[] = [
  {
    id: 'school-night',
    name: 'School Night',
    icon: '📚',
    description: 'Limited screen time, bedtime at 9pm',
    restrictions: { bedtime: { start: '21:00', end: '07:00' }, dailyLimit: 120 },
  },
  {
    id: 'weekend',
    name: 'Weekend',
    icon: '🎉',
    description: 'Extended hours, more freedom',
    restrictions: { bedtime: { start: '22:00', end: '08:00' }, dailyLimit: 240 },
  },
  {
    id: 'homework',
    name: 'Homework Mode',
    icon: '✏️',
    description: 'Block games and social media',
    restrictions: { blockedCategories: ['gaming', 'social-media', 'streaming'] },
  },
  {
    id: 'vacation',
    name: 'Vacation',
    icon: '🏖️',
    description: 'Relaxed restrictions',
    restrictions: { dailyLimit: 360 },
  },
]

export const DEVICE_ICONS: Record<FamilyDevice['type'], string> = {
  phone: '📱',
  tablet: '📲',
  laptop: '💻',
  desktop: '🖥️',
  gaming: '🎮',
  tv: '📺',
}

// Demo data generator
export function generateDemoFamilyMembers(): FamilyMember[] {
  return [
    {
      id: 'fm1',
      name: 'Emma',
      avatar: '👧',
      role: 'child',
      devices: [
        { id: 'd1', name: "Emma's iPad", type: 'tablet', isOnline: true },
        { id: 'd2', name: "Emma's Laptop", type: 'laptop', isOnline: false },
      ],
      restrictions: {
        bedtime: { start: '20:00', end: '07:00' },
        dailyLimit: 120,
        blockedCategories: ['adult', 'gambling', 'social-media'],
        allowedApps: ['youtube-kids', 'disney-plus'],
        safeSearch: true,
      },
      screenTime: {
        today: 85,
        weekAverage: 95,
        byCategory: [
          { category: 'Education', minutes: 45, color: '#10B981' },
          { category: 'Entertainment', minutes: 30, color: '#8B5CF6' },
          { category: 'Games', minutes: 10, color: '#F59E0B' },
        ],
      },
      isOnline: true,
    },
    {
      id: 'fm2',
      name: 'Jake',
      avatar: '👦',
      role: 'teen',
      devices: [
        { id: 'd3', name: "Jake's iPhone", type: 'phone', isOnline: true },
        { id: 'd4', name: 'Gaming PC', type: 'desktop', isOnline: true },
        { id: 'd5', name: 'PlayStation', type: 'gaming', isOnline: false },
      ],
      restrictions: {
        bedtime: { start: '22:00', end: '07:00' },
        dailyLimit: 180,
        blockedCategories: ['adult', 'gambling'],
        allowedApps: [],
        safeSearch: true,
      },
      screenTime: {
        today: 145,
        weekAverage: 160,
        byCategory: [
          { category: 'Gaming', minutes: 80, color: '#F59E0B' },
          { category: 'Social Media', minutes: 35, color: '#EC4899' },
          { category: 'Streaming', minutes: 30, color: '#8B5CF6' },
        ],
      },
      isOnline: true,
    },
  ]
}

