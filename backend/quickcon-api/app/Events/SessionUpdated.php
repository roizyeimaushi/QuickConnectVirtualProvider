<?php

namespace App\Events;

use App\Models\AttendanceSession;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SessionUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $session;
    public $action;

    /**
     * Create a new event instance.
     */
    public function __construct(AttendanceSession $session, string $action = 'updated')
    {
        $this->session = $session->load('schedule');
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
            new Channel('sessions'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'session.updated';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->session->id,
            'date' => $this->session->date,
            'schedule_id' => $this->session->schedule_id,
            'status' => $this->session->status,
            'action' => $this->action,
            'schedule' => $this->session->schedule ? [
                'id' => $this->session->schedule->id,
                'name' => $this->session->schedule->name,
                'time_in' => $this->session->schedule->time_in,
                'time_out' => $this->session->schedule->time_out,
            ] : null,
            'timestamp' => now()->toISOString(),
        ];
    }
}
