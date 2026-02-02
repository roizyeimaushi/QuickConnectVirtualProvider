<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AbsentNotification extends Notification
{
    use Queueable;

    protected $record;

    public function __construct($record)
    {
        $this->record = $record;
    }

    public function via(object $notifiable): array
    {
        $channels = [];
        $inapp = filter_var(\App\Models\Setting::where('key', 'notify_inapp')->value('value'), FILTER_VALIDATE_BOOLEAN);
        $email = filter_var(\App\Models\Setting::where('key', 'notify_email')->value('value'), FILTER_VALIDATE_BOOLEAN);

        if ($inapp) $channels[] = 'database';
        if ($email) $channels[] = 'mail';

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $employee = $this->record->user;
        $name = $employee->first_name . ' ' . $employee->last_name;
        $date = $this->record->attendance_date->format('M d, Y');

        return (new MailMessage)
            ->subject("Absent Alert: $name")
            ->line("$name was marked as absent for $date.")
            ->action('View Record', url('/admin/attendance/' . $this->record->id))
            ->line('Please review the attendance record.');
    }

    public function toArray(object $notifiable): array
    {
        $employee = $this->record->user;
        return [
            'type' => 'absent',
            'title' => 'Absent Alert',
            'message' => "{$employee->first_name} marked absent for {$this->record->attendance_date->format('M d')}.",
            'record_id' => $this->record->id,
            'user_id' => $this->record->user_id,
            'time' => now(),
        ];
    }
}
