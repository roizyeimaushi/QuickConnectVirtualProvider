<?php

namespace App\Events;

use App\Models\AttendanceRecord;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AttendanceUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $record;
    public $action;

    /**
     * Create a new event instance.
     */
    public function __construct(AttendanceRecord $record, string $action = 'updated')
    {
        $this->record = $record->load(['user', 'session']);
        $this->action = $action;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('attendance'),
            new PrivateChannel('user.' . $this->record->user_id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'attendance.updated';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->record->id,
            'user_id' => $this->record->user_id,
            'session_id' => $this->record->session_id,
            'status' => $this->record->status,
            'time_in' => $this->record->time_in,
            'time_out' => $this->record->time_out,
            'break_start' => $this->record->break_start,
            'break_end' => $this->record->break_end,
            'minutes_late' => $this->record->minutes_late,
            'action' => $this->action,
            'user' => $this->record->user ? [
                'id' => $this->record->user->id,
                'first_name' => $this->record->user->first_name,
                'last_name' => $this->record->user->last_name,
            ] : null,
            'timestamp' => now()->toISOString(),
        ];
    }
}
