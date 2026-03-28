# Portal Filter & UX Enhancements

> **Type:** Frontend PRD
> **Feature:** Public Portal Filter System & UX Improvements
> **Priority:** P2 (Nice to Have)
> **Status:** ❌ Superseded
> **Last Updated:** 2026-03-28
> **Depends On:** PRD-01 (Public Animal Portal) — which is itself superseded
>
> **Implementation Notes:**
> - This PRD was scoped to the Next.js hosted-portal approach (PRD-01), which is superseded.
> - Filter components were built and are now owned by `apps/widget`:
>   - `FilterSidebar` → `apps/widget/src/components/FilterSidebar.tsx`
>   - `FilterDrawer` (mobile) → `apps/widget/src/components/FilterDrawer.tsx`
> - The original portal-level `apps/portal/app/[domain]/animals/FilterSidebar.tsx` is retained for the demo/preview environment only.
> - All future filter UX investment should target `apps/widget`, not `apps/portal`.
> - Scope of filter features (species, sex, size, age, breed, good-with, special-needs) applies equally to the widget — see PRD-16.
> - 🟡 Age range slider needs testing
> - 🟡 Good-with toggles need testing
> - 🟡 Share/print functionality not implemented

---

## Feature Overview

Enhance the public animal portal with advanced filtering capabilities, improved mobile UX, and additional engagement features. Includes expanded filter options (good-with, special needs, breed, color), desktop sidebar layout, mobile filter drawer, share/print functionality, and shelter contact integration.

## Requirements

### Filter System

#### Current Filters (Implemented)
- Species (dog, cat, other)
- Sex (male, female)
- Size (small, medium, large, extra-large)
- Sort (newest, oldest, name A-Z, name Z-A)

#### New Filters to Add

| Filter | Type | Options | Notes |
|--------|------|---------|-------|
| Age | range slider | 0-20 years | "Puppy/Kitten", "Young", "Adult", "Senior" presets |
| Breed | searchable multi-select | From data | Primary + secondary breeds |
| Color | multi-select | From data | Top 10 colors dynamically |
| Good With Dogs | toggle | yes/any | |
| Good With Cats | toggle | yes/any | |
| Good With Kids | toggle | yes/any | |
| Special Needs | toggle | yes/any | Animals with medical/behavioral notes |
| House Trained | toggle | yes/any | |
| Spayed/Neutered | toggle | yes/any | |
| Name Search | text | debounced | 300ms debounce |

#### Filter Data Source

Filters derive from animal `attributes` JSONB:
```json
{
  "goodWithDogs": true,
  "goodWithCats": false,
  "goodWithKids": true,
  "houseTrained": true,
  "specialNeeds": false,
  "specialNeedsNotes": "",
  "spayedNeutered": true
}
```

### Desktop Layout (≥1024px)

```
+------------------+--------------------------------+
|                  |                                |
|   FILTERS        |        RESULTS GRID            |
|   (Sticky)       |                                |
|                  |   [Card] [Card] [Card] [Card]  |
|   Species        |   [Card] [Card] [Card] [Card]  |
|   [ ] Dog        |   [Card] [Card] [Card] [Card]  |
|   [ ] Cat        |                                |
|   [ ] Other      |        [Pagination]            |
|                  |                                |
|   Age            |                                |
|   [====o====]    |                                |
|   0yr      20yr  |                                |
|                  |                                |
|   Good With      |                                |
|   [x] Dogs       |                                |
|   [ ] Cats       |                                |
|   [x] Kids       |                                |
|                  |                                |
|   [Clear All]    |                                |
+------------------+--------------------------------+
```

**Sidebar specs:**
- Width: 280px fixed
- Position: sticky, top: 80px (below header)
- Max height: calc(100vh - 100px)
- Overflow: auto with custom scrollbar
- Background: white with subtle shadow

### Mobile Layout (<1024px)

**Filter Bar:**
```
+----------------------------------------+
| [Filters (3)] [Sort: Newest ▼]         |
+----------------------------------------+
```

**Filter Drawer (full screen):**
```
+----------------------------------------+
| ← Filters                    [Clear]   |
+----------------------------------------+
|                                        |
|   Species                              |
|   [Dog] [Cat] [Other]                  |
|                                        |
|   Age                                  |
|   [====o====]                          |
|                                        |
|   Good With                            |
|   [Dogs ✓] [Cats] [Kids ✓]            |
|                                        |
|   ... more filters ...                 |
|                                        |
+----------------------------------------+
|        [Show 24 Results]               |
+----------------------------------------+
```

**Drawer behavior:**
- Slide in from bottom (80% height)
- Backdrop overlay
- "Show X Results" button with live count
- Scroll within drawer
- Close on backdrop click or X

### Search Enhancement

**Search bar:**
- Prominent placement above filters (desktop) or in filter bar (mobile)
- Placeholder: "Search by name or ID..."
- Debounce: 300ms
- Clear button when has value
- Search icon

**Behavior:**
- Searches `name` and `externalId` fields
- Case-insensitive
- Partial match

### Share Functionality (Detail Page)

**Share button placement:**
- Desktop: In header actions area
- Mobile: Sticky footer bar

**Share options:**
```
+------------------+
| Share            |
+------------------+
| 📋 Copy Link     |
| 📘 Facebook      |
| 🐦 Twitter/X     |
| 📧 Email         |
+------------------+
```

**Implementation:**
```typescript
// Copy link
await navigator.clipboard.writeText(window.location.href);
showToast('Link copied!');

// Facebook
window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);

// Twitter
window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`);

// Email
window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
```

### Print Functionality (Detail Page)

**Print button:** In header actions

**Print stylesheet:**
```css
@media print {
  /* Hide navigation, footer, CTAs */
  header, footer, .cta-bar, .share-buttons { display: none; }
  
  /* Optimize layout */
  .animal-detail { max-width: 100%; }
  .gallery { page-break-inside: avoid; }
  
  /* Show all photos in grid */
  .gallery-thumbnails { display: grid; grid-template-columns: repeat(3, 1fr); }
  
  /* Include contact info */
  .shelter-contact { display: block !important; }
}
```

### Shelter Contact Section (Detail Page)

**Placement:** Below animal details, above footer

**Content:**
```
+----------------------------------------+
| 🏠 About {Shelter Name}                |
+----------------------------------------+
| [Logo]                                 |
|                                        |
| 📍 City, State                         |
| 📞 (555) 123-4567                      |
| ✉️ adopt@shelter.org                   |
| 🕐 Open: Mon-Sat 10am-6pm             |
|                                        |
| [Visit Website]                        |
+----------------------------------------+
```

**Data source:** OrganizationSettings (from PRD-11)

### Animal Status Badges

**Badge types:**
| Status | Badge Color | Text |
|--------|-------------|------|
| Adoptable | Green | "Available" |
| Coming Soon | Blue | "Coming Soon" |
| Adoption Pending | Orange | "Adoption Pending" |
| On Hold | Yellow | "On Hold" |

**Good-with badges:**
| Attribute | Badge |
|-----------|-------|
| goodWithDogs | 🐕 Dog Friendly |
| goodWithCats | 🐱 Cat Friendly |
| goodWithKids | 👶 Kid Friendly |
| houseTrained | 🏠 House Trained |
| specialNeeds | ❤️ Special Needs |

### URL State Management

All filters sync to URL query params:

```
/animals?species=dog&age=0-5&goodWithKids=true&sort=newest&page=2
```

**Benefits:**
- Shareable filter states
- Browser back/forward works
- Bookmarkable searches
- SEO for filtered pages

### Performance Optimizations

**Filter panel:**
- Memoize filter counts
- Debounce API calls
- Optimistic UI updates

**Results grid:**
- Virtualize for large result sets (>100 items)
- Intersection Observer for lazy load
- Skeleton loading states

**Images:**
- srcset for responsive images
- Low-quality placeholder (LQIP)
- Lazy load below fold

### API Changes

**Updated endpoint:** `GET /api/v1/animals`

**New query params:**
```
age_min: number (years)
age_max: number (years)
breed: string (comma-separated)
color: string (comma-separated)
good_with_dogs: boolean
good_with_cats: boolean
good_with_kids: boolean
special_needs: boolean
house_trained: boolean
spayed_neutered: boolean
q: string (name/ID search)
```

**Response additions:**
```json
{
  "items": [...],
  "total": 150,
  "page": 1,
  "pageSize": 24,
  "facets": {
    "species": { "dog": 80, "cat": 60, "other": 10 },
    "breed": { "labrador": 25, "golden retriever": 20, ... },
    "color": { "black": 40, "brown": 35, ... },
    "goodWithDogs": 90,
    "goodWithCats": 70,
    "goodWithKids": 100,
    "specialNeeds": 15
  }
}
```

### Components to Create

```
components/
  portal/
    FilterSidebar.tsx       # Desktop sidebar
    FilterDrawer.tsx        # Mobile drawer
    FilterBar.tsx           # Mobile filter trigger
    AgeRangeSlider.tsx      # Age range input
    MultiSelectFilter.tsx   # Breed/color select
    ToggleFilter.tsx        # Boolean toggles
    SearchInput.tsx         # Debounced search
    ShareMenu.tsx           # Share dropdown
    PrintButton.tsx         # Print trigger
    ShelterContact.tsx      # Contact section
    StatusBadge.tsx         # Animal status
    AttributeBadges.tsx     # Good-with badges
```

## User Stories

1. As an adopter, I can filter animals by "good with kids" to find family-friendly pets.
2. As an adopter, I can search by name if I saw an animal on social media.
3. As an adopter, I can share an animal's page with my family to discuss.
4. As an adopter, I can print an animal's profile to bring to a shelter visit.
5. As an adopter, I can see the shelter's contact info to ask questions.
6. As an adopter on mobile, I can easily access filters without leaving the results page.
7. As an adopter, I can bookmark a filtered search to check back later.

## Technical Considerations

- **SSR compatibility:** Filter state hydrated from URL on server
- **Accessibility:** Filter toggles have proper labels and focus states
- **Analytics events:**
  - `filter_apply` (with filter type and value)
  - `search_query`
  - `share_click` (with platform)
  - `print_click`
  - `contact_click`
- **Mobile performance:** Lazy load filter drawer component
- **Facet calculation:** Cache facet counts, invalidate on sync

## Success Criteria

| Metric | Target |
|--------|--------|
| Filter usage rate | ≥ 30% of sessions |
| Search usage rate | ≥ 15% of sessions |
| Share click rate | ≥ 2% of detail views |
| Mobile filter completion | ≥ 80% (open → apply) |
| Filter latency | < 500ms response |
| Core Web Vitals | Pass (LCP < 2.5s) |
