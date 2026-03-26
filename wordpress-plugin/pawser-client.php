<?php
/**
 * Plugin Name: Pawser Client
 * Plugin URI: https://github.com/askinne2/pawser
 * Description: Connect your WordPress site to the Pawser platform to display adoptable animals
 * Version: 1.0.0
 * Author: Andrew Skinner
 * Author URI: https://github.com/askinne2
 * License: GPL-2.0+
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain: pawser-client
 */

// If this file is called directly, abort.
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('PAWSER_VERSION', '1.0.0');
define('PAWSER_PLUGIN_URL', plugin_dir_url(__FILE__));
define('PAWSER_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('PAWSER_PLUGIN_FILE', __FILE__);

// Autoload classes
spl_autoload_register(function ($class_name) {
    if (strpos($class_name, 'Pawser\\') !== 0) {
        return;
    }

    $class_file = str_replace('Pawser\\', '', $class_name);
    $class_file = str_replace('_', '-', $class_file);
    $class_file = strtolower($class_file);

    $paths = [
        PAWSER_PLUGIN_PATH . 'includes/class-' . $class_file . '.php',
    ];

    foreach ($paths as $path) {
        if (file_exists($path)) {
            require_once $path;
            return;
        }
    }
});

/**
 * Initialize the plugin
 */
function pawser_init() {
    $api_client = new Pawser\API_Client();
    $shortcode = new Pawser\Shortcode($api_client);
    $settings = new Pawser\Settings();

    // Register shortcodes
    add_shortcode('pawser_portal', [$shortcode, 'render']);
    add_shortcode('pawser_animals', [$shortcode, 'render']); // Alias for backwards compatibility

    // Register admin menu
    if (is_admin()) {
        add_action('admin_menu', [$settings, 'add_admin_menu']);
        add_action('admin_init', [$settings, 'register_settings']);
    }
}

add_action('plugins_loaded', 'pawser_init');

/**
 * Plugin activation hook
 */
function pawser_activate() {
    // Set default options
    add_option('pawser_api_url', 'https://api.pawser.app');
    add_option('pawser_tenant', '');
    add_option('pawser_organization_id', '');
}

register_activation_hook(__FILE__, 'pawser_activate');

/**
 * Plugin deactivation hook
 */
function pawser_deactivate() {
    // Clean up if needed
}

register_deactivation_hook(__FILE__, 'pawser_deactivate');
