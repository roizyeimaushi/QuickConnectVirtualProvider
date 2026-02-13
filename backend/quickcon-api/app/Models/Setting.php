<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'value',
        'group',
        'type', // 'string', 'boolean', 'json', 'integer'
    ];

    /**
     * Get a setting value with caching for performance.
     */
    public static function getCached($key, $default = null)
    {
        return \Illuminate\Support\Facades\Cache::remember("setting_{$key}", 3600, function () use ($key, $default) {
            $setting = static::where('key', $key)->first();
            return $setting ? $setting->value : $default;
        });
    }
}
