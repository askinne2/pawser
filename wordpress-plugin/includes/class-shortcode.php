<?php

namespace Pawser;

/**
 * Shortcode handler for embedding Pawser portals via iframe
 * 
 * Usage: [pawser_portal tenant="demo"]
 * 
 * Attributes:
 * - tenant (required): The tenant slug (e.g., "demo" for demo.pawser.app)
 * - src: Custom URL to embed (overrides tenant)
 * - view: "list" or "detail" (default: list)
 * - species: Filter by species (dog, cat, etc.)
 * - theme: Theme name (light, dark, custom)
 * - color: Primary color hex code (e.g., "#3b82f6")
 * - lazy: Enable lazy loading (default: true)
 * - ratio: Aspect ratio for container (default: "4/3")
 * - height: Fallback min-height (default: "600px")
 * - width: Container max-width (default: "100%")
 */
class Shortcode {
    private $api_client;

    public function __construct(API_Client $api_client) {
        $this->api_client = $api_client;
    }

    /**
     * Render the shortcode
     * 
     * @param array $atts Shortcode attributes
     * @return string HTML output
     */
    public function render($atts) {
        $atts = shortcode_atts([
            'tenant' => get_option('pawser_tenant', ''),
            'src' => '',
            'view' => 'list',
            'species' => '',
            'sex' => '',
            'size' => '',
            'status' => 'available',
            'theme' => '',
            'color' => '',
            'lazy' => 'true',
            'ratio' => '4/3',
            'height' => '600px',
            'width' => '100%',
            'title' => '',
            // Legacy support
            'limit' => '',
        ], $atts, 'pawser_portal');

        // Validate tenant
        $tenant_slug = sanitize_title($atts['tenant']);
        if (empty($tenant_slug) && empty($atts['src'])) {
            return $this->render_error('The "tenant" attribute is required for the [pawser_portal] shortcode. Configure it in Settings > Pawser or add tenant="your-slug" to the shortcode.');
        }

        // Build embed URL
        $embed_url = $this->build_embed_url($atts, $tenant_slug);

        // Sanitize display options
        $lazy_load = filter_var($atts['lazy'], FILTER_VALIDATE_BOOLEAN);
        $aspect_ratio = $this->sanitize_aspect_ratio($atts['ratio']);
        $fallback_height = sanitize_text_field($atts['height']);
        $max_width = sanitize_text_field($atts['width']);
        $title = !empty($atts['title']) 
            ? esc_attr($atts['title']) 
            : sprintf('Pawser Animal Portal - %s', esc_attr($tenant_slug));

        // Generate unique ID for this instance
        $container_id = 'pawser-portal-' . wp_rand(1000, 9999);

        // Start output buffering
        ob_start();
        ?>
        <div 
            id="<?php echo esc_attr($container_id); ?>" 
            class="pawser-portal-container"
            style="
                position: relative;
                width: 100%;
                max-width: <?php echo esc_attr($max_width); ?>;
                margin: 0 auto;
            "
        >
            <div 
                class="pawser-portal-wrapper"
                style="
                    position: relative;
                    width: 100%;
                    padding-bottom: <?php echo esc_attr($this->calculate_padding($aspect_ratio)); ?>;
                    min-height: <?php echo esc_attr($fallback_height); ?>;
                    background-color: #f3f4f6;
                    border-radius: 8px;
                    overflow: hidden;
                "
            >
                <iframe
                    src="<?php echo esc_url($embed_url); ?>"
                    style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        border: none;
                    "
                    <?php if ($lazy_load): ?>loading="lazy"<?php endif; ?>
                    title="<?php echo $title; ?>"
                    allow="fullscreen"
                    referrerpolicy="no-referrer-when-downgrade"
                ></iframe>
            </div>
            <noscript>
                <p style="padding: 1rem; text-align: center;">
                    Your browser does not support iframes. 
                    <a href="<?php echo esc_url($embed_url); ?>" target="_blank" rel="noopener noreferrer">
                        Click here to view adoptable animals
                    </a>.
                </p>
            </noscript>
        </div>
        <?php

        // Add responsive styles (only once per page)
        $this->enqueue_styles();

        return ob_get_clean();
    }

    /**
     * Build the embed URL with query parameters
     */
    private function build_embed_url($atts, $tenant_slug) {
        // Use custom src if provided
        if (!empty($atts['src'])) {
            return $atts['src'];
        }

        // Build base URL from tenant slug
        $base_domain = get_option('pawser_base_domain', 'pawser.app');
        $base_url = sprintf('https://%s.%s', $tenant_slug, $base_domain);

        // Determine path based on view
        $path = '/animals';
        if ($atts['view'] === 'detail' && !empty($atts['animal_id'])) {
            $path = '/animals/' . sanitize_title($atts['animal_id']);
        }

        $url = $base_url . $path;

        // Build query parameters
        $query_params = [];

        // Filter parameters
        if (!empty($atts['species'])) {
            $query_params['species'] = sanitize_text_field($atts['species']);
        }
        if (!empty($atts['sex'])) {
            $query_params['sex'] = sanitize_text_field($atts['sex']);
        }
        if (!empty($atts['size'])) {
            $query_params['size'] = sanitize_text_field($atts['size']);
        }
        if (!empty($atts['status']) && $atts['status'] !== 'available') {
            $query_params['status'] = sanitize_text_field($atts['status']);
        }

        // Theme parameters
        if (!empty($atts['theme'])) {
            $query_params['theme'] = sanitize_text_field($atts['theme']);
        }
        if (!empty($atts['color'])) {
            // Ensure color is a valid hex code
            $color = ltrim(sanitize_hex_color($atts['color']), '#');
            if ($color) {
                $query_params['color'] = $color;
            }
        }

        // Embed mode flag (tells portal it's in iframe)
        $query_params['embed'] = '1';

        // Add query string if we have parameters
        if (!empty($query_params)) {
            $url .= '?' . http_build_query($query_params);
        }

        return $url;
    }

    /**
     * Sanitize aspect ratio input
     */
    private function sanitize_aspect_ratio($ratio) {
        // Accept formats like "4/3", "16/9", "1/1"
        if (preg_match('/^(\d+)\/(\d+)$/', $ratio, $matches)) {
            return $ratio;
        }
        // Accept decimal format
        if (is_numeric($ratio)) {
            return floatval($ratio);
        }
        return '4/3'; // Default
    }

    /**
     * Calculate padding-bottom percentage from aspect ratio
     */
    private function calculate_padding($ratio) {
        if (is_numeric($ratio)) {
            return (100 / floatval($ratio)) . '%';
        }
        if (preg_match('/^(\d+)\/(\d+)$/', $ratio, $matches)) {
            $width = intval($matches[1]);
            $height = intval($matches[2]);
            if ($width > 0) {
                return (($height / $width) * 100) . '%';
            }
        }
        return '75%'; // Default to 4:3
    }

    /**
     * Render an error message
     */
    private function render_error($message) {
        return sprintf(
            '<div class="pawser-error" style="padding: 1rem; background: #fee2e2; color: #991b1b; border-radius: 8px; margin: 1rem 0;">
                <strong>Pawser Portal Error:</strong> %s
            </div>',
            esc_html($message)
        );
    }

    /**
     * Enqueue responsive styles
     */
    private function enqueue_styles() {
        static $styles_enqueued = false;
        
        if ($styles_enqueued) {
            return;
        }

        add_action('wp_footer', function() {
            ?>
            <style>
                .pawser-portal-container {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
                }
                .pawser-portal-wrapper {
                    transition: opacity 0.3s ease;
                }
                @media (max-width: 768px) {
                    .pawser-portal-wrapper {
                        min-height: 500px !important;
                    }
                }
                @media (max-width: 480px) {
                    .pawser-portal-wrapper {
                        min-height: 400px !important;
                    }
                }
            </style>
            <?php
        });

        $styles_enqueued = true;
    }
}
