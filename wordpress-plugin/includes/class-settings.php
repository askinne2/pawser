<?php

namespace Pawser;

/**
 * Settings page for Pawser WordPress plugin
 */
class Settings {
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_options_page(
            'Pawser Settings',
            'Pawser',
            'manage_options',
            'pawser',
            [$this, 'render_settings_page']
        );
    }

    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('pawser_settings', 'pawser_tenant', [
            'type' => 'string',
            'sanitize_callback' => 'sanitize_title',
        ]);
        register_setting('pawser_settings', 'pawser_base_domain', [
            'type' => 'string',
            'default' => 'pawser.app',
            'sanitize_callback' => 'sanitize_text_field',
        ]);
        register_setting('pawser_settings', 'pawser_default_height', [
            'type' => 'string',
            'default' => '600px',
            'sanitize_callback' => 'sanitize_text_field',
        ]);
        register_setting('pawser_settings', 'pawser_default_theme', [
            'type' => 'string',
            'default' => '',
            'sanitize_callback' => 'sanitize_text_field',
        ]);
        register_setting('pawser_settings', 'pawser_primary_color', [
            'type' => 'string',
            'sanitize_callback' => 'sanitize_hex_color',
        ]);
    }

    /**
     * Render settings page
     */
    public function render_settings_page() {
        if (!current_user_can('manage_options')) {
            return;
        }

        if (isset($_GET['settings-updated'])) {
            add_settings_error('pawser_messages', 'pawser_message', 'Settings Saved', 'updated');
        }

        settings_errors('pawser_messages');

        $tenant = get_option('pawser_tenant', '');
        $base_domain = get_option('pawser_base_domain', 'pawser.app');
        $default_height = get_option('pawser_default_height', '600px');
        $default_theme = get_option('pawser_default_theme', '');
        $primary_color = get_option('pawser_primary_color', '');
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            
            <form action="options.php" method="post">
                <?php settings_fields('pawser_settings'); ?>

                <h2>Connection Settings</h2>
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="pawser_tenant">Tenant Slug <span style="color: #dc2626;">*</span></label>
                        </th>
                        <td>
                            <input
                                type="text"
                                id="pawser_tenant"
                                name="pawser_tenant"
                                value="<?php echo esc_attr($tenant); ?>"
                                class="regular-text"
                                placeholder="your-shelter"
                                required
                            />
                            <p class="description">
                                Your organization's slug on Pawser (e.g., <code>demo</code> for <code>demo.pawser.app</code>)
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="pawser_base_domain">Base Domain</label>
                        </th>
                        <td>
                            <input
                                type="text"
                                id="pawser_base_domain"
                                name="pawser_base_domain"
                                value="<?php echo esc_attr($base_domain); ?>"
                                class="regular-text"
                            />
                            <p class="description">
                                The Pawser base domain. Default: <code>pawser.app</code>
                            </p>
                        </td>
                    </tr>
                </table>

                <h2>Display Settings</h2>
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="pawser_default_height">Default Height</label>
                        </th>
                        <td>
                            <input
                                type="text"
                                id="pawser_default_height"
                                name="pawser_default_height"
                                value="<?php echo esc_attr($default_height); ?>"
                                class="regular-text"
                                placeholder="600px"
                            />
                            <p class="description">
                                Minimum height for the portal iframe (e.g., <code>600px</code>, <code>80vh</code>)
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="pawser_default_theme">Default Theme</label>
                        </th>
                        <td>
                            <select id="pawser_default_theme" name="pawser_default_theme">
                                <option value="" <?php selected($default_theme, ''); ?>>Auto (inherit from portal)</option>
                                <option value="light" <?php selected($default_theme, 'light'); ?>>Light</option>
                                <option value="dark" <?php selected($default_theme, 'dark'); ?>>Dark</option>
                            </select>
                            <p class="description">
                                Theme to use for embedded portal
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="pawser_primary_color">Primary Color</label>
                        </th>
                        <td>
                            <input
                                type="text"
                                id="pawser_primary_color"
                                name="pawser_primary_color"
                                value="<?php echo esc_attr($primary_color); ?>"
                                class="regular-text"
                                placeholder="#3b82f6"
                            />
                            <p class="description">
                                Override the portal's primary color (hex format, e.g., <code>#3b82f6</code>)
                            </p>
                        </td>
                    </tr>
                </table>

                <?php submit_button('Save Settings'); ?>
            </form>

            <hr />

            <h2>Usage Guide</h2>
            
            <h3>Basic Usage</h3>
            <p>Add the shortcode to any page or post:</p>
            <pre style="background: #f3f4f6; padding: 1rem; border-radius: 4px;"><code>[pawser_portal]</code></pre>
            
            <h3>Shortcode Attributes</h3>
            <table class="widefat striped" style="margin-top: 1rem;">
                <thead>
                    <tr>
                        <th>Attribute</th>
                        <th>Description</th>
                        <th>Example</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>tenant</code></td>
                        <td>Tenant slug (overrides settings)</td>
                        <td><code>tenant="demo"</code></td>
                    </tr>
                    <tr>
                        <td><code>species</code></td>
                        <td>Filter by species</td>
                        <td><code>species="dog"</code></td>
                    </tr>
                    <tr>
                        <td><code>sex</code></td>
                        <td>Filter by sex</td>
                        <td><code>sex="female"</code></td>
                    </tr>
                    <tr>
                        <td><code>size</code></td>
                        <td>Filter by size</td>
                        <td><code>size="small"</code></td>
                    </tr>
                    <tr>
                        <td><code>theme</code></td>
                        <td>Color theme</td>
                        <td><code>theme="dark"</code></td>
                    </tr>
                    <tr>
                        <td><code>color</code></td>
                        <td>Primary color override</td>
                        <td><code>color="#e11d48"</code></td>
                    </tr>
                    <tr>
                        <td><code>height</code></td>
                        <td>Minimum height</td>
                        <td><code>height="800px"</code></td>
                    </tr>
                    <tr>
                        <td><code>ratio</code></td>
                        <td>Aspect ratio</td>
                        <td><code>ratio="16/9"</code></td>
                    </tr>
                    <tr>
                        <td><code>lazy</code></td>
                        <td>Lazy load iframe</td>
                        <td><code>lazy="false"</code></td>
                    </tr>
                </tbody>
            </table>

            <h3>Examples</h3>
            <pre style="background: #f3f4f6; padding: 1rem; border-radius: 4px; margin-top: 1rem;"><code>[pawser_portal tenant="happypaws" species="dog"]</code></pre>
            <p class="description">Show only dogs from the Happy Paws shelter</p>

            <pre style="background: #f3f4f6; padding: 1rem; border-radius: 4px; margin-top: 1rem;"><code>[pawser_portal theme="dark" height="800px"]</code></pre>
            <p class="description">Dark theme with taller container</p>

            <pre style="background: #f3f4f6; padding: 1rem; border-radius: 4px; margin-top: 1rem;"><code>[pawser_portal color="#e11d48" ratio="1/1"]</code></pre>
            <p class="description">Custom accent color with square aspect ratio</p>

            <?php if (!empty($tenant)): ?>
            <h3>Preview</h3>
            <p>Your portal URL: <a href="https://<?php echo esc_attr($tenant); ?>.<?php echo esc_attr($base_domain); ?>" target="_blank" rel="noopener noreferrer">https://<?php echo esc_attr($tenant); ?>.<?php echo esc_attr($base_domain); ?></a></p>
            <?php endif; ?>
        </div>
        <?php
    }
}
