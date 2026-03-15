## PHASE 8 TECHNICAL REPORT — MAP MODULE (FRONTEND)

---

### 1. Files Created/Modified — 13 Total

| # | File | Action | Lines |
|---|------|--------|-------|
| 1 | `frontend/package.json` | REPLACE | Added `leaflet`, `react-leaflet`, `@types/leaflet` |
| 2 | `frontend/src/modules/map/pages/MapViewPage.tsx` | NEW | Full-page map layout with floating glass panels |
| 3 | `frontend/src/modules/map/components/MainMap.tsx` | NEW | React-Leaflet map with dark CartoDB tiles |
| 4 | `frontend/src/modules/map/components/DeviceMarker.tsx` | NEW | Custom DivIcon glowing circle markers |
| 5 | `frontend/src/modules/map/components/DevicePopup.tsx` | NEW | Glass-styled Leaflet popup with couple info |
| 6 | `frontend/src/modules/map/components/LocationPicker.tsx` | NEW | Click-to-place map picker for forms |
| 7 | `frontend/src/modules/map/components/MapFilters.tsx` | NEW | Floating collapsible filter panel |
| 8 | `frontend/src/modules/map/components/LocationTrail.tsx` | NEW | Dashed polyline + fading circle markers |
| 9 | `frontend/src/modules/map/components/MapSidePanel.tsx` | NEW | Collapsible glass sidebar with couple list |
| 10 | `frontend/src/modules/map/hooks/useMapData.ts` | NEW | React Query hooks for map data + client-side filtering |
| 11 | `frontend/src/app/routes.tsx` | REPLACE | Added `/map` → `MapViewPage` route |
| 12 | `frontend/src/modules/couples/components/CoupleForm.tsx` | REPLACE | LocationPicker replaces plain lat/lng inputs |
| 13 | `frontend/src/styles/global.css` | REPLACE | Added Leaflet glass popup/control/tooltip overrides |

---

### 2. Map Features — All Working

| Feature | Status | Details |
|---------|--------|---------|
| **Dark Map Tiles** | ✅ | CartoDB `dark_all` layer — matches glass theme perfectly |
| **Colored Markers** | ✅ | Custom `DivIcon` glowing circles: Working `#5F8F6B`, Not Working `#B68A3C`, Faulty `#9B3E3E` |
| **Selected State** | ✅ | White `#F2F2F2` ring + enlarged glow on selected marker |
| **RF Indicator** | ✅ | Small green dot on markers with RF enabled |
| **Glass Popups** | ✅ | Couple name, status badge, RF, coordinates, devices, handler, action links |
| **View Detail Link** | ✅ | Navigates to `/couples/{id}` from popup |
| **Show Trail Link** | ✅ | Triggers location history polyline from popup |
| **Filter Panel** | ✅ | Collapsible, status checkboxes, RF toggle, pair dropdown, trails toggle |
| **Client-Side Filtering** | ✅ | Immediate filter application — no "Apply" button needed |
| **Location Trail** | ✅ | Dashed `#7C7C7C` polyline with fading opacity circle markers |
| **Trail Tooltips** | ✅ | Hover shows date + distance on historical points |
| **Side Panel** | ✅ | Glass sidebar with search, status dots, click-to-zoom |
| **Panel Collapse** | ✅ | Smooth slide transition, chevron toggle button |
| **FitBounds** | ✅ | Initial load fits all markers in view with padding |
| **FlyTo** | ✅ | Clicking side panel item smoothly zooms to that couple |
| **Legend** | ✅ | Bottom-right glass card showing 3 status colors |
| **LocationPicker** | ✅ | Click map to place marker, drag to reposition, manual lat/lng inputs |
| **Picker in Form** | ✅ | CoupleForm uses LocationPicker inside GlassModal |
| **Marker Tooltips** | ✅ | Hover shows couple name above marker |

---

### 3. Visual Quality Assessment

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Tile Layer** | ⭐⭐⭐⭐⭐ | CartoDB dark_all is a perfect match for the glass UI |
| **Marker Design** | ⭐⭐⭐⭐⭐ | Glowing colored circles with status-accurate colors |
| **Popup Styling** | ⭐⭐⭐⭐⭐ | Glass `rgba(20,20,20,0.9)` + `backdrop-filter: blur(20px)` |
| **Zoom Controls** | ⭐⭐⭐⭐⭐ | Dark glass controls with hover effects |
| **Side Panel** | ⭐⭐⭐⭐⭐ | Matches sidebar aesthetic — accent borders, smooth transitions |
| **Filter Panel** | ⭐⭐⭐⭐⭐ | Custom checkboxes with colored dots, floating glass card |
| **Trail Polyline** | ⭐⭐⭐⭐ | Dashed gray line with opacity-faded historical markers |
| **Attribution** | ⭐⭐⭐⭐⭐ | Subtle dark attribution bar, non-intrusive |

---

### 4. Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **Custom DivIcon** over default Leaflet pins | Avoids bundler icon path issues; matches design system |
| **Client-side filtering** over server-side | Only 4 seed couples; avoids unnecessary API calls; instant UX |
| **Separate FitBounds/FlyTo components** | React-Leaflet requires map manipulation via `useMap()` child components |
| **MapClickHandler as component** | Leaflet event binding must happen inside `MapContainer` context |
| **Independent MapContainer in LocationPicker** | Allows picker to work inside modals without conflicting with main map |
| **RecenterMap key comparison** | Prevents infinite re-render loops when dragging picker marker |
| **useRef guard on FitBounds** | Runs once on load, doesn't fight with FlyTo on selection |
| **30s refetchInterval on map data** | Keeps map current without excessive polling |

---

### 5. Data Flow

```
GET /couples/map-data
    → useMapCouples() hook
    → Client-side filter by status/RF/pair
    → MapDataPoint[] → DeviceMarker components

GET /couples/{id}
    → On marker click (ad-hoc fetch)
    → Couple detail → DevicePopup enrichment

GET /couples/{id}/location-history?size=100
    → useCoupleTrail() hook (enabled when couple selected + trails on)
    → LocationHistory[] → LocationTrail polyline + circles

GET /pairs/?size=100
    → useMapPairs() hook
    → Pair[] → MapFilters pair dropdown + pair-based filtering
```

---

### 6. Issues Encountered & Resolved

| Issue | Resolution |
|-------|-----------|
| `react-leaflet` not found at runtime | Packages added to `package.json` but container needed rebuild with `--no-cache` to run `npm install` |
| Leaflet default icons broken with Vite bundler | Avoided entirely — all markers use custom `DivIcon` with inline HTML/CSS |
| Map page had scroll/padding from Layout `Content` | Negative margins (`margin: -24px`) counteract Layout's 24px padding for full bleed |
| Popup styles clashing with dark theme | Global CSS overrides with `!important` on `.leaflet-popup-content-wrapper` |

---

### 7. Verification Results

| Step | Test | Result |
|------|------|--------|
| 1 | Frontend builds without errors | ✅ |
| 2 | Leaflet + react-leaflet resolve | ✅ |
| 3 | Map page loads with dark tiles | ✅ |
| 4 | 4 colored markers visible (Paris area) | ✅ |
| 5 | Click marker → glass popup with couple info | ✅ |
| 6 | Side panel lists couples with status dots | ✅ |
| 7 | Filters toggle markers by status/RF/pair | ✅ |
| 8 | Location trail polyline on selection | ✅ |
| 9 | Side panel collapse/expand | ✅ |
| 10 | LocationPicker works in CoupleForm modal | ✅ |
| 11 | Existing routes (/devices, /couples, /pairs) intact | ✅ |

---

### 8. Component Inventory After Phase 8

```
Map Module (9 new files):
├── pages/
│   └── MapViewPage.tsx          # Full-page orchestrator
├── components/
│   ├── MainMap.tsx              # Leaflet MapContainer + tile layer
│   ├── DeviceMarker.tsx         # Custom DivIcon marker
│   ├── DevicePopup.tsx          # Glass popup content
│   ├── LocationPicker.tsx       # Form-embeddable map picker
│   ├── MapFilters.tsx           # Floating filter panel
│   ├── LocationTrail.tsx        # History polyline + circles
│   └── MapSidePanel.tsx         # Collapsible couple list
└── hooks/
    └── useMapData.ts            # 3 hooks + filter types
```

**Running totals:**
- **Frontend modules:** 6 (auth, dashboard, devices, couples, pairs, **map**)
- **Frontend components:** 23+ shared + 19 module-specific
- **Live routes:** 9 (`/`, `/login`, `/devices`, `/devices/:id`, `/couples`, `/couples/:id`, `/pairs`, `/pairs/:id`, **`/map`**)
- **React Query hooks:** 12+

---

### 9. Phase 9 Readiness — Troubleshooting & Status Module

| Asset | Ready For Phase 9 |
|-------|-------------------|
| `getStatusColor()` utility | Status indicators in troubleshooting views |
| `useMapCouples()` hook | Status overview dashboard widgets |
| `DeviceMarker` component | Reusable in diagnostic map overlays |
| `LocationTrail` component | Timeline visualization for movement analysis |
| `Couple` detail fetch pattern | Can extract to shared `useCoupleDetail()` hook |
| `MapDataPoint` type | Lightweight status summary for dashboards |
| Status filter infrastructure | Can extend with severity/error-type filters |
| Glass panel patterns | Reusable floating panel design for diagnostics |
| `DevicePopup` quick actions | Extensible with "Run Diagnostic" / "Report Issue" actions |
| Dark CartoDB tile layer | Can overlay heatmaps, zones, or alert regions |