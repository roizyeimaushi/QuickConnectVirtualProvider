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
            'https://quickconnectvirtual.vercel.app',
            'https://virtualquickconnect.vercel.app',
            'http://localhost:3000',
        ],
        explode(',', env('CORS_ALLOWED_ORIGINS', ''))
    ))),

    'allowed_origins_patterns' => ['*.vercel.app'],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
