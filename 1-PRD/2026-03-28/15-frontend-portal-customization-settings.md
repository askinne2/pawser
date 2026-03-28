# PRD-15: Frontend Portal Customization Settings

> **Type:** Frontend PRD
> **Feature:** Portal Customization & Status Configuration
> **Priority:** High
> **Status:** 🟡 Partial
> **Last Updated:** 2026-03-28
> **Depends On:** PRD-11 (Organization Settings), PRD-04 (Data Sync), PRD-16 (Widget Embed Bundle)
>
> **Implementation Notes:**
> - The "portal customization" scope has shifted: the primary customization surface is the **Widget Builder** screen in the admin dashboard (`apps/admin/app/(dashboard)/widget-builder/page.tsx`), not a separate portal settings page.
> - ✅ Widget Builder UI exists: brand color picker, button/card style toggles, species checkboxes, animals-per-page, adoption URL, adoption process text
> - ✅ Live preview panel updates in real-time via React state
> - 🟡 Settings form does NOT yet save to `PUT /api/v1/organizations/:id/settings` — save button wired to local state only
> - 🟡 `primaryColor` from org settings not yet passed to widget at embed time
> - 🔲 Status discovery during sync (discoveredStatuses) not implemented
> - 🔲 Sync/display status multi-select UI not implemented
> - 🔲 Custom CSS injection not implemented
> - Note: This PRD originally consolidated WordPress plugin settings migration, which is now moot (PRD-03 superseded).

**Date:** 2016-01-14  
**Related PRDs:** PRD-11 (Organization Settings & White-Label), PRD-01 (Frontend Public Animal Portal)

## Overview

Migrate and enhance the customization settings from the original WordPress plugin to the Pawser multi-tenant SaaS platform. These settings allow each organization to customize their public-facing animal adoption portal's appearance, branding, and behavior without requiring code changes.

## Background

The original WordPress plugin (`shelterluv-react-app`) included comprehensive customization settings that allowed organizations to:
- Customize color palettes
- Adjust visual styles (buttons, cards)
- Add custom CSS
- Configure adoption process text
- Set organization-specific prefixes and URLs

These settings need to be ported to Pawser's multi-tenant architecture, where each organization can have their own independent settings stored in the database.

## Goals

1. **Migrate all customization settings** from WordPress plugin to Pawser
2. **Store settings per-organization** in the database (already have `OrganizationSetting` model)
3. **Apply settings to portal** dynamically based on organization
4. **Maintain backward compatibility** with existing portal styling
5. **Add new customization options** that weren't in the original plugin

## Requirements

### 1. General Settings

#### 1.1 Adoption Process Text
- **Field Type:** Rich text editor (HTML)
- **Purpose:** Display custom adoption process information on animal detail pages
- **Default:** Organization-specific adoption process text
- **Storage:** `OrganizationSetting.adoptionProcessText` (Text field)
- **Validation:** Sanitize HTML, allow common tags (h3, h4, p, ul, li, etc.)

#### 1.2 Adoption URL Base
- **Field Type:** URL input
- **Purpose:** Base URL for adoption links (links to ShelterLuv adoption forms)
- **Default:** `https://new.shelterluv.com/matchme/adopt/`
- **Storage:** `OrganizationSetting.adoptUrlBase` (VarChar 2048)
- **Validation:** Valid URL format

#### 1.3 Organization Prefix
- **Field Type:** Text input
- **Purpose:** ShelterLuv organization prefix (e.g., "GHHS-A-") for API calls
- **Default:** Empty (set during integration setup)
- **Storage:** Already in `DataSource.externalAccountId`
- **Validation:** Format: `[A-Z]{3,4}-A-` (uppercase, 3-4 letters, hyphen, A, hyphen)
- **Note:** This is already handled in integration credentials, but should be visible in settings

### 2. Animal Status Configuration

This feature allows organizations to control which ShelterLuv animal statuses are synced and displayed on their public portal. Different shelters may use different statuses for animals they want to show publicly.

#### 2.1 Status Discovery

**How It Works:**
1. During the **initial sync** (or on-demand), Pawser fetches animals from ShelterLuv with `status_type=publishable`
2. All unique `Status` values from the API response are collected and stored
3. These discovered statuses populate the organization's status configuration options

**Known ShelterLuv Statuses (examples):**
- `Available For Adoption` - Animals ready for adoption
- `Awaiting Vet Exam / Health Check` - Animals pending medical clearance
- `Available For Foster` - Animals available for fostering
- `Hold` - Animals on hold
- `Pending Adoption` - Animals with pending adoption applications
- `Transferred` - Animals transferred to another organization
- `Adopted` - Animals that have been adopted
- `Deceased` - Deceased animals (typically not displayed)

**Note:** The exact statuses available depend on each shelter's ShelterLuv configuration. Pawser dynamically discovers these rather than hardcoding.

#### 2.2 Discovered Statuses Storage

- **Field Type:** JSON array of strings
- **Purpose:** Store all statuses discovered from ShelterLuv API
- **Storage:** `OrganizationSetting.discoveredStatuses` (JSON)
- **Updated:** Automatically during sync, manually via "Refresh Statuses" button

```json
// Example discoveredStatuses value
[
  "Available For Adoption",
  "Awaiting Vet Exam / Health Check",
  "Available For Foster",
  "Hold",
  "Pending Adoption"
]
```

#### 2.3 Selected Sync Statuses

- **Field Type:** Multi-select checkbox list
- **Purpose:** Choose which statuses to sync from ShelterLuv to the database
- **Default:** `["Available For Adoption"]`
- **Storage:** `OrganizationSetting.syncStatuses` (JSON array)
- **UI:** Checkbox list populated from `discoveredStatuses`

**Behavior:**
- Only animals with a `Status` matching one of the selected values will be stored in the database
- Existing animals with statuses no longer selected will be soft-deleted on next sync
- At least one status must be selected

#### 2.4 Selected Display Statuses

- **Field Type:** Multi-select checkbox list
- **Purpose:** Choose which statuses to display on the public portal
- **Default:** `["Available For Adoption"]`
- **Storage:** `OrganizationSetting.displayStatuses` (JSON array)
- **UI:** Checkbox list (subset of `syncStatuses`)
- **Constraint:** Can only select from statuses that are being synced

**Use Case:**
An organization might sync multiple statuses (e.g., "Available For Adoption", "Hold") for internal tracking, but only display "Available For Adoption" on the public portal.

#### 2.5 Status Mapping to Internal Status

Since Pawser uses a simplified internal `status` enum (`available`, `pending`, `adopted`, `unavailable`), we need to map ShelterLuv statuses:

- **Field Type:** Key-value mapping
- **Storage:** `OrganizationSetting.statusMapping` (JSON object)
- **Default Mapping:**

```json
{
  "Available For Adoption": "available",
  "Available For Foster": "available",
  "Awaiting Vet Exam / Health Check": "pending",
  "Hold": "pending",
  "Pending Adoption": "pending",
  "Adopted": "adopted",
  "Transferred": "unavailable",
  "Deceased": "unavailable"
}
```

**UI:** For each discovered status, show a dropdown to map it to an internal status.

#### 2.6 Refresh Statuses Button

- **Purpose:** Manually trigger a status discovery without full sync
- **Endpoint:** `POST /api/v1/organizations/:id/discover-statuses`
- **Behavior:**
  1. Fetch first page of animals from ShelterLuv (`status_type=publishable&limit=100`)
  2. Extract unique `Status` values
  3. Merge with existing `discoveredStatuses` (don't remove old ones)
  4. Return updated list

### 3. Appearance Settings

#### 2.1 Color Palette
All colors should be hex color pickers with validation:

- **Primary Color**
  - Default: `#0f9eda`
  - Usage: Main brand color for primary buttons, links, accents
  - Storage: `OrganizationSetting.primaryColor` (already exists in `Organization.primaryColor`)

- **Secondary Color**
  - Default: `#137098`
  - Usage: Secondary buttons, hover states, secondary accents
  - Storage: `OrganizationSetting.secondaryColor` (VarChar 7)

- **Accent Color**
  - Default: `#07394f`
  - Usage: Highlights, special elements, borders
  - Storage: `OrganizationSetting.accentColor` (VarChar 7)

- **Light Color**
  - Default: `#e9f6fc`
  - Usage: Background colors for cards, sections, light backgrounds
  - Storage: `OrganizationSetting.lightColor` (VarChar 7)

- **Text Color**
  - Default: `#333333`
  - Usage: Main text color throughout the interface
  - Storage: `OrganizationSetting.textColor` (VarChar 7)

#### 2.2 Style Options

- **Button Style**
  - Options: `rounded`, `square`, `pill`
  - Default: `rounded`
  - Usage: Border radius for all buttons
  - Storage: `OrganizationSetting.buttonStyle` (VarChar 16)
  - Implementation: Apply CSS classes or inline styles based on selection

- **Card Style**
  - Options: `shadow`, `border`, `flat`
  - Default: `shadow`
  - Usage: Visual style for animal cards
  - Storage: `OrganizationSetting.cardStyle` (VarChar 16)
  - Implementation: Apply CSS classes or inline styles

#### 2.3 Custom CSS

- **Use Custom CSS**
  - Type: Boolean toggle
  - Default: `false`
  - Purpose: Enable/disable custom CSS injection
  - Storage: `OrganizationSetting.useCustomCss` (Boolean)

- **Custom CSS**
  - Type: Textarea (code editor)
  - Default: Empty
  - Purpose: Organization-specific CSS overrides
  - Storage: `OrganizationSetting.customCss` (Text)
  - Validation: 
    - Sanitize to remove potentially harmful content
    - Strip `javascript:` and other dangerous patterns
    - Allow standard CSS syntax
  - Security: CSS should be injected in a `<style>` tag scoped to the portal

### 3. Debug Settings (Organization-Level)

While debug settings were in the WordPress plugin, in Pawser they should be:
- **Super Admin only** - Debug settings should not be exposed to organization owners
- **System-wide** - Debug is a system configuration, not per-organization
- **Already implemented** - Debug logging is handled at the API level

**Note:** Skip migrating debug settings to organization settings. Keep them system-wide.

## Database Schema

### Update `OrganizationSetting` Model

Add new fields to the existing `OrganizationSetting` model in `schema.prisma`:

```prisma
model OrganizationSetting {
  // ... existing fields ...
  
  // General Settings
  adoptUrlBase        String?  @map("adopt_url_base") @db.VarChar(2048)
  adoptionProcessText String?  @map("adoption_process_text") @db.Text
  
  // Status Configuration (ShelterLuv Integration)
  discoveredStatuses  Json?    @map("discovered_statuses") @db.JsonB  // Array of status strings from ShelterLuv
  syncStatuses        Json?    @map("sync_statuses") @db.JsonB        // Array of statuses to sync (selected by user)
  displayStatuses     Json?    @map("display_statuses") @db.JsonB     // Array of statuses to display on portal
  statusMapping       Json?    @map("status_mapping") @db.JsonB       // Map ShelterLuv status -> internal status
  
  // Appearance Settings
  secondaryColor      String?  @map("secondary_color") @db.VarChar(7)
  accentColor         String?  @map("accent_color") @db.VarChar(7)
  lightColor          String?  @map("light_color") @db.VarChar(7)
  textColor           String?  @map("text_color") @db.VarChar(7)
  buttonStyle         String?  @map("button_style") @db.VarChar(16) // rounded, square, pill
  cardStyle           String?  @map("card_style") @db.VarChar(16) // shadow, border, flat
  useCustomCss        Boolean  @default(false) @map("use_custom_css")
  customCss           String?  @map("custom_css") @db.Text
}
```

**Note:** `primaryColor` already exists in the `Organization` model, so we can use that or add it to `OrganizationSetting` for consistency.

### Default Values

```typescript
// Default status configuration
const DEFAULT_SYNC_STATUSES = ['Available For Adoption'];
const DEFAULT_DISPLAY_STATUSES = ['Available For Adoption'];
const DEFAULT_STATUS_MAPPING = {
  'Available For Adoption': 'available',
  'Available For Foster': 'available',
  'Awaiting Vet Exam / Health Check': 'pending',
  'Hold': 'pending',
  'Pending Adoption': 'pending',
  'Adopted': 'adopted',
  'Transferred': 'unavailable',
  'Deceased': 'unavailable',
};
```

## API Endpoints

### GET `/api/v1/organizations/:id/settings`
Already exists (PRD-11). Should return all settings including new customization fields.

**Response includes:**
```json
{
  "discoveredStatuses": ["Available For Adoption", "Awaiting Vet Exam / Health Check", ...],
  "syncStatuses": ["Available For Adoption"],
  "displayStatuses": ["Available For Adoption"],
  "statusMapping": { "Available For Adoption": "available", ... },
  // ... other settings
}
```

### PATCH `/api/v1/organizations/:id/settings`
Already exists (PRD-11). Should accept and validate new customization fields.

**Request body can include:**
```json
{
  "syncStatuses": ["Available For Adoption", "Awaiting Vet Exam / Health Check"],
  "displayStatuses": ["Available For Adoption"],
  "statusMapping": { "Available For Adoption": "available", "Awaiting Vet Exam / Health Check": "pending" }
}
```

### POST `/api/v1/organizations/:id/discover-statuses` (NEW)

Manually trigger status discovery from ShelterLuv API.

**Authorization:** Owner or Admin role required

**Behavior:**
1. Fetches first page of animals from ShelterLuv (`status_type=publishable&limit=100`)
2. Extracts all unique `Status` values
3. Merges with existing `discoveredStatuses` (preserves old statuses)
4. Updates `OrganizationSetting.discoveredStatuses`

**Response:**
```json
{
  "success": true,
  "discoveredStatuses": ["Available For Adoption", "Awaiting Vet Exam / Health Check", "Hold", ...],
  "newStatuses": ["Hold"], // Statuses found that weren't previously discovered
  "totalAnimalsScanned": 100
}
```

### Validation Rules

- **Colors:** Must be valid hex color format (`#RRGGBB`)
- **Button Style:** Must be one of: `rounded`, `square`, `pill`
- **Card Style:** Must be one of: `shadow`, `border`, `flat`
- **Adopt URL Base:** Must be valid URL
- **Organization Prefix:** Must match pattern `[A-Z]{3,4}-A-`
- **Custom CSS:** Sanitized to remove dangerous patterns
- **syncStatuses:** Must be a non-empty array of strings; at least one status required
- **displayStatuses:** Must be subset of `syncStatuses`
- **statusMapping:** Keys must be valid ShelterLuv statuses; values must be one of: `available`, `pending`, `adopted`, `unavailable`

## Frontend Implementation

### Admin Dashboard

#### Settings Page Updates
Extend the existing organization settings page (`/organizations/[id]/settings`) with new tabs:

1. **General Tab** (existing)
   - Add: Adoption Process Text (rich text editor)
   - Add: Adoption URL Base (URL input)
   - Show: Organization Prefix (read-only, from integration)

2. **Branding Tab** (existing)
   - Already has: Primary Color
   - Add: Secondary Color
   - Add: Accent Color
   - Add: Light Color
   - Add: Text Color

3. **Portal Tab** (new or extend existing)
   - Button Style (dropdown)
   - Card Style (dropdown)
   - Use Custom CSS (toggle)
   - Custom CSS (code editor with syntax highlighting)

4. **Sync Settings Tab** (NEW)
   - **Statuses to Sync** - Multi-select checkbox list
     - Populated from `discoveredStatuses`
     - Shows count of animals per status if available
     - "Refresh Statuses" button to re-discover from ShelterLuv
   - **Statuses to Display** - Multi-select checkbox list
     - Only shows statuses that are selected for sync
     - Controls what appears on public portal
   - **Status Mapping** - For each discovered status:
     - Dropdown to map to internal status (`available`, `pending`, `adopted`, `unavailable`)
     - Shows the ShelterLuv status name
     - Default mappings pre-populated

#### Sync Settings UI Mockup

```
┌─────────────────────────────────────────────────────────────────┐
│ Sync Settings                                           [Save]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ STATUSES TO SYNC                          [🔄 Refresh Statuses] │
│ Select which ShelterLuv statuses to sync to your database       │
│                                                                 │
│ ☑ Available For Adoption (33 animals)                           │
│ ☐ Awaiting Vet Exam / Health Check (5 animals)                  │
│ ☐ Hold (2 animals)                                              │
│ ☐ Pending Adoption (0 animals)                                  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ STATUSES TO DISPLAY ON PORTAL                                   │
│ Select which synced statuses to show on your public portal      │
│                                                                 │
│ ☑ Available For Adoption                                        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ STATUS MAPPING                                                  │
│ Map ShelterLuv statuses to internal status for filtering        │
│                                                                 │
│ Available For Adoption      → [available    ▾]                  │
│ Awaiting Vet Exam...        → [pending      ▾]                  │
│ Hold                        → [pending      ▾]                  │
│ Pending Adoption            → [pending      ▾]                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Portal Application

#### Dynamic Style Injection

The portal should:
1. Fetch organization settings on page load
2. Apply color palette via CSS variables
3. Apply button/card styles via CSS classes
4. Inject custom CSS if enabled

**Implementation approach:**

```typescript
// In portal app, fetch settings and apply
const settings = await fetchOrganizationSettings(orgId);

// Apply CSS variables
document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
document.documentElement.style.setProperty('--secondary-color', settings.secondaryColor);
// ... etc

// Apply style classes
if (settings.buttonStyle === 'pill') {
  document.body.classList.add('button-style-pill');
}
// ... etc

// Inject custom CSS
if (settings.useCustomCss && settings.customCss) {
  const style = document.createElement('style');
  style.textContent = settings.customCss;
  document.head.appendChild(style);
}
```

#### Adoption Process Text

Display on animal detail pages:
- Fetch from organization settings
- Render as HTML (sanitized)
- Display in a dedicated section on the detail page

#### Adoption URL Links

Use `adoptUrlBase` when generating adoption links:
- Format: `${adoptUrlBase}${animalExternalId}`
- Apply to "Adopt" buttons and links

## Sync Process Integration

### How Status Configuration Affects Sync

The sync worker (`sync-animals.ts`) should be updated to use the organization's status settings:

```typescript
// In sync worker
async function syncAnimals(orgId: string, dataSourceId: string) {
  // 1. Get organization settings
  const settings = await prisma.organizationSetting.findUnique({
    where: { orgId },
    select: { syncStatuses: true, displayStatuses: true, statusMapping: true },
  });
  
  // 2. Use defaults if not configured
  const syncStatuses = settings?.syncStatuses || ['Available For Adoption'];
  const statusMapping = settings?.statusMapping || DEFAULT_STATUS_MAPPING;
  
  // 3. Fetch animals from ShelterLuv
  const animals = await shelterLuvService.getAnimals({ status_type: 'publishable' });
  
  // 4. Filter to only configured statuses
  const filteredAnimals = animals.filter(animal => 
    syncStatuses.includes(animal.Status)
  );
  
  // 5. Discover and store any new statuses
  const discoveredStatuses = [...new Set(animals.map(a => a.Status))];
  await updateDiscoveredStatuses(orgId, discoveredStatuses);
  
  // 6. Transform and save animals with mapped status
  for (const animal of filteredAnimals) {
    const internalStatus = statusMapping[animal.Status] || 'available';
    const isPublished = displayStatuses.includes(animal.Status);
    
    await prisma.animal.upsert({
      // ... animal data
      status: internalStatus,
      published: isPublished,
    });
  }
}
```

### Status Discovery During Sync

Every sync should automatically discover new statuses:

1. Extract all unique `Status` values from fetched animals
2. Merge with existing `discoveredStatuses` (don't remove old ones)
3. Save updated list to `OrganizationSetting.discoveredStatuses`

This ensures the status options stay up-to-date without manual intervention.

### Portal Query Updates

The portal should query based on `displayStatuses`:

```typescript
// In portal animals page
const settings = await getOrganizationSettings(orgId);
const displayStatuses = settings.displayStatuses || ['Available For Adoption'];

const animals = await prisma.animal.findMany({
  where: {
    orgId,
    published: true, // Only show animals with status in displayStatuses
    deletedAt: null,
  },
});
```

**Note:** The `published` flag is set based on whether the animal's ShelterLuv status is in `displayStatuses`. This allows the portal query to remain simple (`published: true`) while the sync handles the complexity.

## Migration Strategy

### For Existing Organizations

1. **Default Values:** Apply WordPress plugin defaults to all existing organizations
2. **Primary Color:** Migrate from `Organization.primaryColor` if exists
3. **Other Colors:** Set to WordPress plugin defaults
4. **Styles:** Set to WordPress plugin defaults (`rounded`, `shadow`)

### Data Migration Script

Create a migration script to:
1. Set default values for all organizations
2. Migrate any existing `primaryColor` values
3. Ensure all required fields have defaults

## Testing Requirements

### Unit Tests
- Settings validation (colors, styles, URLs)
- CSS sanitization
- Organization prefix validation
- Status filtering logic (sync statuses, display statuses)
- Status mapping validation
- `displayStatuses` must be subset of `syncStatuses`

### Integration Tests
- Settings API endpoints
- Settings application in portal
- Custom CSS injection (security)
- Adoption URL generation
- Status discovery endpoint
- Sync respects configured statuses
- Portal only shows animals with display statuses

### Manual Testing
- Color palette changes reflect in portal
- Button/card style changes
- Custom CSS applies correctly
- Adoption process text displays
- Adoption links use correct base URL
- Status checkbox changes affect which animals sync
- "Refresh Statuses" button discovers new statuses
- Changing display statuses updates portal immediately
- Status mapping correctly maps ShelterLuv → internal status

## Security Considerations

1. **Custom CSS:** 
   - Sanitize to prevent XSS
   - Strip `javascript:` and `data:` URLs
   - Consider CSP (Content Security Policy) headers

2. **Adoption Process Text:**
   - Sanitize HTML (allow safe tags only)
   - Prevent script injection

3. **URL Validation:**
   - Validate all URLs before storage
   - Prevent open redirects

## Future Enhancements

1. **Theme Presets:** Pre-defined color/style combinations
2. **Font Customization:** Custom font families
3. **Layout Options:** Different portal layouts (grid, list, etc.)
4. **Logo Upload:** Already in PRD-11, ensure it's integrated
5. **Favicon Upload:** Already in PRD-11, ensure it's integrated

## Success Metrics

- All organizations can customize their portal appearance
- Settings persist and apply correctly
- No security vulnerabilities from custom CSS/HTML
- Portal loads with customizations within 100ms of default

## Dependencies

- PRD-11 (Organization Settings & White-Label) - Settings API exists
- PRD-01 (Frontend Public Animal Portal) - Portal to apply settings to
- Database migration for new `OrganizationSetting` fields

## Notes

- The WordPress plugin had `root_url` setting - this is not needed in Pawser as each organization has their own subdomain
- Debug settings are system-wide in Pawser, not per-organization
- Organization prefix is already handled in integration credentials, but should be visible/editable in settings UI
- **Status Configuration:** ShelterLuv's `status_type=publishable` API parameter returns ALL publishable animals regardless of their individual `Status` value. The actual `Status` field contains values like "Available For Adoption", "Hold", etc. Pawser filters these after fetching.
- **Why not filter at API level?** ShelterLuv API does not support filtering by individual `Status` values - only by `status_type` (publishable, all, etc.). We must fetch all publishable animals and filter in our code.
- **Status Discovery:** New statuses are automatically discovered during each sync, so if a shelter starts using a new status in ShelterLuv, it will appear in their Pawser settings after the next sync.
