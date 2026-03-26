<?php

namespace Pawser;

/**
 * API Client for connecting to Pawser platform
 */
class API_Client {
    private $api_url;
    private $tenant;
    private $organization_id;

    public function __construct() {
        $this->api_url = get_option('pawser_api_url', 'https://api.pawser.app');
        $this->tenant = get_option('pawser_tenant', '');
        $this->organization_id = get_option('pawser_organization_id', '');
    }

    /**
     * Get all animals for the organization
     */
    public function get_animals($params = []) {
        $url = $this->api_url . '/api/v1/animals';

        // Add query parameters
        if (!empty($params)) {
            $url .= '?' . http_build_query($params);
        }

        $response = wp_remote_get($url, [
            'headers' => [
                'Host' => $this->get_organization_host(),
            ],
            'timeout' => 15,
        ]);

        if (is_wp_error($response)) {
            return [
                'success' => false,
                'error' => $response->get_error_message(),
            ];
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        return $data;
    }

    /**
     * Get a single animal by ID
     */
    public function get_animal($id) {
        $url = $this->api_url . '/api/v1/animals/' . urlencode($id);

        $response = wp_remote_get($url, [
            'headers' => [
                'Host' => $this->get_organization_host(),
            ],
            'timeout' => 15,
        ]);

        if (is_wp_error($response)) {
            return [
                'success' => false,
                'error' => $response->get_error_message(),
            ];
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        return $data;
    }

    /**
     * Get organization host for tenant resolution
     * This should be set based on the organization's custom domain or subdomain
     */
    private function get_organization_host() {
        // Use tenant slug if set
        if ($this->tenant) {
            return $this->tenant . '.pawser.app';
        }

        // Fallback to custom domain if set
        $custom_domain = get_option('pawser_custom_domain', '');
        if ($custom_domain) {
            return $custom_domain;
        }

        // Default fallback
        return 'localhost';
    }
}
