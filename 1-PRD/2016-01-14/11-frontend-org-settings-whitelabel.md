# Organization Settings & White-Label

> **Type:** Frontend PRD  
> **Feature:** Organization Settings & White-Label Customization  
> **Priority:** P0 (Critical)  
> **Status:** 🟡 Scaffolded  
> **Depends On:** PRD-08 (Database Schema)
>
> **Implementation Notes:**
> - ✅ API routes created at `apps/api/src/routes/settings.ts`
> - ✅ Settings page at `apps/admin/app/(dashboard)/organizations/[id]/settings/page.tsx`
> - ✅ Tabbed interface (General, Branding, Portal, Domains)
> - 🟡 Logo/favicon upload needs testing
> - 🟡 Settings persistence needs testing
> - See PRD-15 for extended customization settings (colors, styles, status config)

---

## Feature Overview

Enable organization owners to customize their public portal appearance and manage organization settings. Provides white-label branding (logo, colors, fonts), contact information, and portal configuration. Settings apply in real-time to the public-facing animal portal.

## Requirements

### Access & RBAC

| Role | Permissions |
|------|-------------|
| Super Admin | Full access to any org's settings |
| Owner | Full access to own org settings |
| Admin | View settings, edit portal appearance only |
| Viewer | No access |

### Settings Page (`/organizations/[id]/settings`)

**Tab Navigation:**
1. General
2. Branding
3. Portal
4. Domains
5. Integrations

---

### General Tab

**Organization Profile:**
| Field | Type | Notes |
|-------|------|-------|
| Name | text | Required, 2-100 chars |
| Slug | text | lowercase, alphanumeric + hyphens, unique |
| Contact Email | email | Public contact for adopters |
| Phone | tel | Optional, formatted display |
| Address | textarea | Optional, city/state only shown publicly |
| Timezone | select | Dropdown of IANA timezones |
| Locale | select | en-US (future: more locales) |

**Social Links:**
| Field | Type |
|-------|------|
| Website URL | url |
| Facebook URL | url |
| Instagram URL | url |
| Twitter/X URL | url |

---

### Branding Tab

**Logo:**
- Upload area (drag-drop or click)
- Accepted formats: PNG, JPG, SVG
- Max size: 2MB
- Preview at header size (max 200px width)
- Delete button to remove

**Favicon:**
- Upload area
- Accepted formats: PNG, ICO
- Max size: 100KB
- 32x32 or 64x64 recommended
- Preview

**Colors:**
| Token | Type | Default | Used For |
|-------|------|---------|----------|
| Primary Color | color picker | #3B82F6 | Buttons, links, accents |
| Secondary Color | color picker | #64748B | Secondary actions |
| Background | color picker | #F9FAFB | Page background |
| Text Primary | color picker | #111827 | Main text |
| Text Secondary | color picker | #6B7280 | Muted text |

**Typography:**
| Field | Options |
|-------|---------|
| Heading Font | System, Inter, Poppins, Montserrat, Playfair Display |
| Body Font | System, Inter, Open Sans, Roboto, Lato |

**Live Preview:**
- Side panel showing mock portal header with current settings
- Updates in real-time as values change

---

### Portal Tab

**Header Configuration:**
| Field | Type | Notes |
|-------|------|-------|
| Show Logo | toggle | Default: on |
| Show Org Name | toggle | Default: on |
| Navigation Links | repeater | Label + URL pairs |

**Navigation Links Builder:**
- Add/remove custom links
- Drag to reorder
- Preset options: About, Contact, Donate, Volunteer
- Max 5 custom links

**Footer Configuration:**
| Field | Type |
|-------|------|
| Show Contact Info | toggle |
| Show Social Links | toggle |
| Custom Footer Text | textarea (markdown) |
| Copyright Text | text |

**Call-to-Action:**
| Field | Type | Notes |
|-------|------|-------|
| CTA Button Text | text | Default: "Apply to Adopt" |
| CTA Button URL | url | ShelterLuv apply link or custom |
| CTA Button Style | select | Primary / Secondary / Outline |

---

### Domains Tab

**Subdomain:**
- Current: `{slug}.pawser.app`
- Editable slug with availability check
- Rules: 3-63 chars, lowercase alphanumeric + hyphens
- Cooldown: 1 change per 7 days

**Custom Domains:**
| Column | Description |
|--------|-------------|
| Domain | e.g., `adopt.mysheker.org` |
| Status | Pending / Verified / Failed |
| Primary | Toggle (one primary) |
| Actions | Verify / Remove |

**Add Custom Domain Flow:**
1. Enter domain
2. Show DNS instructions (CNAME record)
3. "Verify" button to check DNS
4. On success: SSL auto-provisioned

---

### Integrations Tab

**ShelterLuv API:**
| Field | Type | Notes |
|-------|------|-------|
| API Key | password | Masked, "Update" to change |
| Status | badge | Connected / Error / Not configured |
| Last Validated | timestamp | |
| Test Connection | button | Verify API key works |

**Sync Settings:**
| Field | Type | Notes |
|-------|------|-------|
| Auto Sync | toggle | Enable scheduled sync |
| Sync Interval | read-only | Based on subscription tier |
| Last Sync | timestamp + status | |
| Next Sync | timestamp | |
| Manual Sync | button | "Sync Now" |

---

### Database Schema Additions

```prisma
model OrganizationSettings {
  id            String   @id @default(uuid())
  orgId         String   @unique
  organization  Organization @relation(fields: [orgId], references: [id])
  
  // General
  contactEmail  String?
  phone         String?
  address       String?
  timezone      String   @default("America/New_York")
  locale        String   @default("en-US")
  
  // Social
  websiteUrl    String?
  facebookUrl   String?
  instagramUrl  String?
  twitterUrl    String?
  
  // Branding
  logoUrl       String?
  faviconUrl    String?
  primaryColor  String   @default("#3B82F6")
  secondaryColor String  @default("#64748B")
  backgroundColor String @default("#F9FAFB")
  textPrimary   String   @default("#111827")
  textSecondary String   @default("#6B7280")
  headingFont   String   @default("system")
  bodyFont      String   @default("system")
  
  // Portal
  showLogo      Boolean  @default(true)
  showOrgName   Boolean  @default(true)
  navLinks      Json     @default("[]")  // [{label, url}]
  showContactInfo Boolean @default(true)
  showSocialLinks Boolean @default(true)
  footerText    String?
  copyrightText String?
  ctaButtonText String   @default("Apply to Adopt")
  ctaButtonUrl  String?
  ctaButtonStyle String  @default("primary")
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### API Endpoints

```
GET    /api/v1/organizations/:id/settings
       Response: { settings: OrganizationSettings }

PUT    /api/v1/organizations/:id/settings
       Body: Partial<OrganizationSettings>
       Response: { settings: OrganizationSettings }

POST   /api/v1/organizations/:id/settings/logo
       Body: FormData (file)
       Response: { url: string }

DELETE /api/v1/organizations/:id/settings/logo
       Response: { success: true }

POST   /api/v1/organizations/:id/settings/favicon
       Body: FormData (file)
       Response: { url: string }
```

### CSS Variables (Portal)

Settings translate to CSS custom properties:

```css
:root {
  --color-primary: var(--org-primary-color, #3B82F6);
  --color-secondary: var(--org-secondary-color, #64748B);
  --color-background: var(--org-background, #F9FAFB);
  --color-text-primary: var(--org-text-primary, #111827);
  --color-text-secondary: var(--org-text-secondary, #6B7280);
  --font-heading: var(--org-heading-font, system-ui);
  --font-body: var(--org-body-font, system-ui);
}
```

### UI Components

**Radix:** Tabs, Dialog, Toggle, Tooltip

**Custom:**
- Color picker (react-colorful)
- File upload with preview
- DNS instruction card
- Live preview panel

### Accessibility
- Tab navigation between sections
- Form field labels and descriptions
- Color contrast warnings if chosen colors fail WCAG
- Keyboard-accessible color picker

## User Stories

1. As an owner, I can upload my shelter's logo to brand my portal.
2. As an owner, I can customize colors to match my organization's brand.
3. As an owner, I can add custom navigation links to my portal header.
4. As an owner, I can configure the "Apply to Adopt" button to link to my application.
5. As an admin, I can update branding but cannot change organization-level settings.
6. As an adopter, I see the shelter's branded portal that matches their website.

## Technical Considerations

- Image uploads to Cloudflare R2: `tenant/{orgId}/branding/{logo|favicon}.{ext}`
- Settings cached in Redis with 5-minute TTL
- Invalidate cache on settings update
- Portal SSR reads settings at request time (with cache)
- Font loading: Google Fonts CDN or self-hosted subset
- Color picker: validate hex format, prevent pure white/black for accessibility
- Live preview uses iframe with postMessage for real-time updates

## Success Criteria

| Metric | Target |
|--------|--------|
| Settings save latency | < 1s |
| Logo upload time | < 3s for 2MB file |
| Portal cache hit rate | ≥ 95% |
| Branding applied correctly | 100% of portal pages |
| Color accessibility | Warn if contrast < 4.5:1 |
| Custom domain SSL | Provisioned within 5 minutes |
