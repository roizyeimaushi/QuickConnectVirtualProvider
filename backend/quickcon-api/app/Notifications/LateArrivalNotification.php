<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Setting;
use App\Models\AttendanceRecord;

class LateArrivalNotification extends Notification
{
    use Queueable;

    protected $record;

    /**
     * Create a new notification instance.
     */
    public function __construct(AttendanceRecord $record)
    {
        $this->record = $record;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = [];
        $inapp = filter_var(Setting::where('key', 'notify_inapp')->value('value'), FILTER_VALIDATE_BOOLEAN);
        $email = filter_var(Setting::where('key', 'notify_email')->value('value'), FILTER_VALIDATE_BOOLEAN);

        if ($inapp) $channels[] = 'database';
        if ($email) $channels[] = 'mail';

        return $channels;
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $employeeName = $this->record->user->first_name . ' ' . $this->record->user->last_name;
        $minutes = $this->record->minutes_late;

        return (new MailMessage)
            ->subject("Late Arrival Alert: $employeeName")
            ->line("$employeeName arrived $minutes minutes late on " . $this->record->attendance_date->format('Y-m-d'))
            ->action('View Attendance', url('/admin/attendance'))
            ->line('Please review the attendance record.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'late_arrival',
            'title' => 'Late Arrival',
            'message' => "{$this->record->user->first_name} was {$this->record->minutes_late}m late.",
            'record_id' => $this->record->id,
            'user_id' => $this->record->user_id,
            'time' => now(),
        ];
    }
}
