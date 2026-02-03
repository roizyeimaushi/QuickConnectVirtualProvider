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

class BreakUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $record;
    public $action;
    public $breakType;

    /**
     * Create a new event instance.
     */
    public function __construct(AttendanceRecord $record, string $action = 'started', string $breakType = 'break')
    {
        $this->record = $record->load('user');
        $this->action = $action;
        $this->breakType = $breakType;
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
        return 'break.updated';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'attendance_id' => $this->record->id,
            'user_id' => $this->record->user_id,
            'break_start' => $this->record->break_start,
            'break_end' => $this->record->break_end,
            'break_type' => $this->breakType,
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
