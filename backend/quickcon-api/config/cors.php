<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter(array_merge(
        [
            'https://quickconnect-frontend.onrender.com', // Updated to Render
            'http://localhost:3000',
        ],
        explode(',', env('CORS_ALLOWED_ORIGINS', ''))
    ))),

    'allowed_origins_patterns' => [
        'https://quickconnect-frontend-*.onrender.com', // Preview deployments only
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
