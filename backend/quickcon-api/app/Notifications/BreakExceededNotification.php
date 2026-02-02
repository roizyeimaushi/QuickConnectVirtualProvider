<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Setting;
use App\Models\AttendanceRecord;

class BreakExceededNotification extends Notification
{
    use Queueable;

    protected $record;
    protected $excessMinutes;

    /**
     * Create a new notification instance.
     */
    public function __construct(AttendanceRecord $record, int $excessMinutes)
    {
        $this->record = $record;
        $this->excessMinutes = $excessMinutes;
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

        return (new MailMessage)
            ->subject("Break Overtime Alert: $employeeName")
            ->line("$employeeName exceeded their break limit by {$this->excessMinutes} minutes.")
            ->action('View Attendance', url('/admin/attendance'))
            ->line('Please review the break policy enforcement.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'break_overtime',
            'title' => 'Break Limit Exceeded',
            'message' => "{$this->record->user->first_name} exceeded break by {$this->excessMinutes} min.",
            'record_id' => $this->record->id,
            'user_id' => $this->record->user_id,
            'time' => now(),
        ];
    }
}
