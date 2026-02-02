<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class EnsureAdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $adminEmail = 'admin@quickconn.net';
        
        $exists = User::where('email', $adminEmail)->exists();

        if (!$exists) {
            User::create([
                'employee_id' => 'SYSADM-001',
                'first_name' => 'Admin',
                'last_name' => 'User',
                'email' => $adminEmail,
                'password' => Hash::make('password123'),
                'role' => 'admin',
                'position' => 'System Administrator',
                'status' => 'active',
            ]);
            
            $this->command->info('Default Admin user created successfully.');
        } else {
            $this->command->info('Admin user already exists. Skipping.');
        }
    }
}
