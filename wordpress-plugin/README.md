# Pawser Client - WordPress Plugin

Embed your Pawser animal adoption portal into any WordPress site with a simple shortcode.

## Installation

1. Download the plugin zip file
2. Go to **Plugins > Add New** in your WordPress admin
3. Click **Upload Plugin** and select the zip file
4. Activate the plugin
5. Go to **Settings > Pawser** to configure

## Quick Start

1. Get your **tenant slug** from your Pawser account (e.g., `demo` for `demo.pawser.app`)
2. Enter the tenant slug in **Settings > Pawser**
3. Add `[pawser_portal]` to any page or post

## Shortcode Usage

### Basic

```
[pawser_portal]
```

Uses the tenant configured in settings.

### With Tenant Override

```
[pawser_portal tenant="happypaws"]
```

Explicitly specify the tenant slug.

### With Filters

```
[pawser_portal species="dog" sex="female" size="small"]
```

Pre-filter the animals displayed.

### With Theme Options

```
[pawser_portal theme="dark" color="#e11d48"]
```

Customize the appearance.

### With Display Options

```
[pawser_portal height="800px" ratio="16/9" lazy="false"]
```

Control the iframe dimensions and loading behavior.

## Shortcode Attributes

| Attribute | Description | Default | Example |
|-----------|-------------|---------|---------|
| `tenant` | Tenant slug | (from settings) | `tenant="demo"` |
| `species` | Filter by species | (all) | `species="cat"` |
| `sex` | Filter by sex | (all) | `sex="male"` |
| `size` | Filter by size | (all) | `size="large"` |
| `theme` | Color theme | (auto) | `theme="dark"` |
| `color` | Primary color (hex) | (from portal) | `color="#3b82f6"` |
| `height` | Minimum height | `600px` | `height="800px"` |
| `ratio` | Aspect ratio | `4/3` | `ratio="16/9"` |
| `lazy` | Lazy load iframe | `true` | `lazy="false"` |
| `width` | Max width | `100%` | `width="800px"` |
| `src` | Custom embed URL | (auto) | `src="https://..."` |

## Settings

Navigate to **Settings > Pawser** to configure:

- **Tenant Slug** (required): Your organization's slug on Pawser
- **Base Domain**: The Pawser domain (default: `pawser.app`)
- **Default Height**: Minimum height for embedded portals
- **Default Theme**: Light, dark, or auto
- **Primary Color**: Override the portal's accent color

## Examples

### Dogs Only Page

```
[pawser_portal species="dog"]
```

### Cats Only Page

```
[pawser_portal species="cat"]
```

### Dark Theme with Custom Color

```
[pawser_portal theme="dark" color="#9333ea"]
```

### Full-Width Tall Embed

```
[pawser_portal height="100vh" width="100%"]
```

### Multiple Species Sections

On a single page, you can use multiple shortcodes:

```html
<h2>Our Dogs</h2>
[pawser_portal species="dog" height="500px"]

<h2>Our Cats</h2>
[pawser_portal species="cat" height="500px"]
```

## Responsive Design

The embedded portal is fully responsive. The iframe uses aspect ratio-based sizing with a minimum height fallback. On smaller screens, the minimum height is automatically adjusted for better mobile viewing.

## Requirements

- WordPress 5.0+
- PHP 7.4+
- A valid Pawser account with an active tenant

## Troubleshooting

### Portal Not Loading

1. Check that your tenant slug is correct in settings
2. Verify your Pawser account is active
3. Check browser console for errors

### Wrong Animals Showing

1. Verify the tenant slug matches your organization
2. Check filter attributes in the shortcode

### Styling Issues

1. Try setting explicit `height` and `width` values
2. Check for CSS conflicts with your theme
3. Use the `ratio` attribute for consistent sizing

## Support

For issues with the WordPress plugin, please open an issue on GitHub.

For Pawser platform support, contact support@pawser.app.

## License

GPL-2.0+
