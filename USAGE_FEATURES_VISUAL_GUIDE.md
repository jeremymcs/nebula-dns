# Usage Features Visual Guide
## US-013 & US-014 Implementation

---

## Component Hierarchy

```
Mission Control Dashboard
├── ThreatRadar
├── ProtectionShield
├── UsageWidget ← NEW
└── QuickActions

Billing Page
├── Header with UsageExport button ← NEW
├── Overview Tab ← NEW
│   ├── UsageBreakdown ← NEW
│   └── UsageChart ← NEW
├── Bundles Tab
├── Purchases Tab
├── Invoices Tab
└── Usage by Client Tab
```

---

## US-013: Usage Widget (Mission Control Dashboard)

### Visual Layout

```
┌─────────────────────────────────────────┐
│  📊  Usage Overview                   ↗ │
│      Home Plan                           │
│                                          │
│  Locations                               │
│  5/10 used                          ✓   │
│  ███████████████░░░░░░░ 50%             │
│  50% used                                │
│                                          │
│  [For MSP Tier Only]                     │
│  Clients                                 │
│  8/25 used                          ⚠   │
│  ████████████░░░░░░░░░░░░ 32%           │
│  32% used                                │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │     Upgrade Plan (if >80%)         │ │
│  └────────────────────────────────────┘ │
│                                          │
│  Click for detailed breakdown            │
└─────────────────────────────────────────┘
```

### Color Logic

**Progress Bar Colors:**
- 🟢 Green: 0-69% usage (good)
- 🟡 Yellow: 70-89% usage (approaching limit)
- 🔴 Red: 90-100% usage (critical)

**Icons:**
- ✓ Check: <70% (healthy)
- ⚠ Warning: >90% (attention needed)

### States

**Loading:**
```
┌─────────────────────────────────────────┐
│  📊  [skeleton ████████]                │
│      [skeleton ████]                     │
│                                          │
│  [skeleton ████████████████]            │
│  [skeleton ████████████████]            │
└─────────────────────────────────────────┘
```

**Error:**
```
┌─────────────────────────────────────────┐
│            ⚠                             │
│     Failed to load usage stats           │
└─────────────────────────────────────────┘
```

---

## US-014: Billing Page Components

### Header Section

```
┌────────────────────────────────────────────────────────┐
│  Billing & Usage                   [Download CSV ⬇]    │
│  Manage your query bundles and view usage              │
└────────────────────────────────────────────────────────┘
```

### Tab Navigation

```
┌────────────────────────────────────────────────────────┐
│ [Usage Overview*] [Bundles] [Purchases] [Invoices]     │
└────────────────────────────────────────────────────────┘
     * = Active tab
```

### Usage Breakdown Component

```
┌────────────────────────────────────────────────────────┐
│  Usage Breakdown                                        │
│  January 1, 2026 - January 31, 2026                    │
│                                                         │
│  ┌─────────────────────┬─────────────────────┐        │
│  │ Current Period Cost │ Projected Monthly   │        │
│  │     $125.50        │       $155.00       │        │
│  └─────────────────────┴─────────────────────┘        │
│                                                         │
│  Locations (5)                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Location Name │ Policy    │ Created      │ Status│ │
│  ├──────────────┼───────────┼─────────────┼───────┤ │
│  │ 📍 HQ Office  │ Standard  │ Jan 15, 2026 │ ✓active│ │
│  │ 📍 Branch 1   │ Standard  │ Jan 18, 2026 │ ✓active│ │
│  │ 📍 Home       │ Family    │ Jan 20, 2026 │ ○inactive│
│  └──────────────┴───────────┴─────────────┴────────┘ │
└────────────────────────────────────────────────────────┘
```

### Usage Breakdown (MSP View)

```
┌────────────────────────────────────────────────────────┐
│  Usage Breakdown                                        │
│  January 1, 2026 - January 31, 2026                    │
│                                                         │
│  ┌─────────────────────┬─────────────────────┐        │
│  │ Current Period Cost │ Projected Monthly   │        │
│  │     $2,450.00      │       $3,100.00     │        │
│  └─────────────────────┴─────────────────────┘        │
│                                                         │
│  Clients (8)                                           │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Client Name │ Locations │ Created      │ Status  │ │
│  ├─────────────┼──────────┼──────────────┼─────────┤ │
│  │ 👥 Acme Corp │ 12 locs   │ Dec 5, 2025  │ ✓active │ │
│  │ 👥 Widget Inc│ 8 locs    │ Jan 12, 2026 │ ✓active │ │
│  │ 👥 Test Co   │ 2 locs    │ Jan 18, 2026 │ ○suspended│
│  └─────────────┴──────────┴──────────────┴─────────┘ │
└────────────────────────────────────────────────────────┘
```

### Usage History Chart

```
┌────────────────────────────────────────────────────────┐
│  Usage History                                          │
│  Last 6 months                                          │
│                                                         │
│   30 ┤                                              ╭─  │
│   25 ┤                                   ╭─────────╯   │
│   20 ┤                        ╭─────────╯             │
│   15 ┤              ╭─────────╯                       │
│   10 ┤    ╭─────────╯                                 │
│    5 ┤────╯                                           │
│    0 └┬─────┬─────┬─────┬─────┬─────┬─────           │
│       Aug   Sep   Oct   Nov   Dec   Jan              │
│                                                         │
│   Legend: ── Locations  ── Clients  ── Policies       │
│           ── Queries (M)                               │
└────────────────────────────────────────────────────────┘
```

### CSV Export Button

**Normal State:**
```
┌──────────────────┐
│ Download CSV ⬇  │
└──────────────────┘
```

**Loading State:**
```
┌──────────────────┐
│ Exporting... ⏳ │
└──────────────────┘
```

**Success State (3 seconds):**
```
┌──────────────────┐
│ ✓ Report downloaded │ [Download CSV ⬇]
└──────────────────┘
```

---

## Mobile Responsive Layouts

### Usage Widget (Mobile)

```
┌─────────────────────────┐
│  📊  Usage Overview   ↗ │
│      Home Plan          │
│                         │
│  Locations              │
│  5/10 used         ✓   │
│  ██████████░░ 50%      │
│                         │
│  [Stack vertically]     │
│                         │
│  ┌───────────────────┐ │
│  │   Upgrade Plan    │ │
│  └───────────────────┘ │
└─────────────────────────┘
```

### Usage Breakdown (Mobile)

```
┌─────────────────────────────┐
│  Usage Breakdown             │
│  Jan 1 - Jan 31, 2026       │
│                              │
│  Current Period: $125.50     │
│  Projected: $155.00          │
│                              │
│  Locations (5)               │
│                              │
│  Scroll horizontally → → →  │
│  ┌──────────────────────┐  │
│  │ HQ Office            │  │
│  │ Standard             │  │
│  │ Jan 15, 2026         │  │
│  │ ✓ active             │  │
│  └──────────────────────┘  │
└─────────────────────────────┘
```

---

## Interaction Flows

### 1. View Usage on Dashboard
```
User lands on Mission Control
    ↓
Sees Usage Widget with current stats
    ↓
Observes progress bar (green/yellow/red)
    ↓
[Optional] Clicks "Upgrade Plan" if >80%
    ↓
Navigates to Billing Page
```

### 2. View Detailed Breakdown
```
User clicks Usage Widget
    ↓
Navigates to Billing Page (Overview tab)
    ↓
Views detailed table of locations/clients
    ↓
Sees billing period and cost projections
    ↓
Scrolls to view Usage History chart
    ↓
Analyzes usage trends over 6 months
```

### 3. Export Usage Data
```
User on Billing Page
    ↓
Clicks "Download CSV" button
    ↓
Button shows "Exporting..." state
    ↓
CSV file downloads automatically
    ↓
Success message appears (3 seconds)
    ↓
Opens CSV in Excel/Numbers
```

---

## Data Flow Diagram

```
┌──────────────┐
│   Browser    │
└──────┬───────┘
       │ 1. useUsageStats()
       ↓
┌──────────────┐
│     SWR      │ (caching layer)
└──────┬───────┘
       │ 2. fetcher()
       ↓
┌──────────────┐
│  API Client  │
└──────┬───────┘
       │ 3. GET /api/v1/limits/usage
       ↓
┌──────────────┐
│   Backend    │
└──────┬───────┘
       │ 4. Response
       ↓
┌──────────────┐
│  Component   │ (UsageWidget / UsageBreakdown)
└──────────────┘
```

---

## Animation Sequences

### Widget Load Animation
```
1. Fade in container (opacity 0 → 1)
2. Slide in from top (y: -20 → 0)
3. Animate progress bars (width 0% → actual%)
Duration: 0.8s with easeOut
```

### Progress Bar Fill
```
1. Start at 0% width
2. Animate to actual percentage
3. Color transition based on threshold
Duration: 0.8s
```

### Upgrade Button Appearance
```
1. Check if usage > 80%
2. Fade in (opacity 0 → 1)
3. Slide up (y: -10 → 0)
Delay: 0.2s after widget load
```

---

## Accessibility Features

### Keyboard Navigation
- Tab through all interactive elements
- Enter/Space to click widget or buttons
- Focus indicators on all clickable areas

### Screen Reader Support
- Semantic HTML (table, thead, tbody)
- ARIA labels for progress bars
- Alt text for icons
- Status announcements for loading/success

### Color Accessibility
- Sufficient contrast ratios (WCAG AA)
- Color + icon for status (not color alone)
- Text alternatives for visual indicators

---

## Error States

### API Error
```
┌─────────────────────────────────────────┐
│            ⚠                             │
│     Failed to load usage stats           │
│                                          │
│     ┌─────────────────────┐             │
│     │    🔄 Retry         │             │
│     └─────────────────────┘             │
└─────────────────────────────────────────┘
```

### Empty State (No Data)
```
┌─────────────────────────────────────────┐
│     No locations yet                     │
│                                          │
│     Create your first location to        │
│     start protecting your network        │
└─────────────────────────────────────────┘
```

### Network Error
```
┌─────────────────────────────────────────┐
│     Unable to connect                    │
│     Please check your internet connection│
└─────────────────────────────────────────┘
```

---

## Performance Metrics

### Target Metrics
- Initial Load: < 1.5s
- Widget Animation: 0.8s
- API Response: < 500ms (cached)
- Chart Render: < 2s
- CSV Download: < 3s

### Optimization Strategies
- SWR caching (60s TTL)
- Lazy loading of Recharts
- Skeleton loading states
- Optimistic UI updates
- Debounced interactions

---

## Browser Compatibility Matrix

| Feature | Chrome | Firefox | Safari | Edge | Mobile |
|---------|--------|---------|--------|------|--------|
| Widget | ✓ | ✓ | ✓ | ✓ | ✓ |
| Charts | ✓ | ✓ | ✓ | ✓ | ✓ |
| CSV Export | ✓ | ✓ | ✓ | ✓ | ✓* |
| Animations | ✓ | ✓ | ✓ | ✓ | ✓ |

*Mobile: Downloads to system folder

---

This visual guide provides a complete reference for the UI implementation of US-013 and US-014.
