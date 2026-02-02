<?php

namespace App\Exports;

use App\Models\AttendanceRecord;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\Exportable;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class AttendanceExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithStyles
{
    use Exportable;

    protected $startDate;
    protected $endDate;
    protected $userId;
    protected $options;

    public function __construct($startDate, $endDate, $userId = null, $options = [])
    {
        $this->startDate = $startDate;
        $this->endDate = $endDate;
        $this->userId = $userId;
        $this->options = array_merge([
            'include_present' => true,
            'include_late' => true,
            'include_absent' => true,
            'include_times' => true,
            'include_breaks' => true,
        ], $options);
    }

    public function collection()
    {
        $statuses = [];
        if ($this->options['include_present']) {
            $statuses[] = 'present';
            $statuses[] = 'excused';
        }
        if ($this->options['include_late']) {
            $statuses[] = 'late';
            $statuses[] = 'left_early';
        }
        if ($this->options['include_absent']) {
            $statuses[] = 'absent';
            $statuses[] = 'pending'; // Include pending records (not yet checked in)
        }

        $query = AttendanceRecord::with(['user', 'session.schedule'])
            ->whereBetween('attendance_date', [$this->startDate, $this->endDate]);

        if ($this->userId) {
            $query->where('user_id', $this->userId);
        }

        if (empty($statuses)) {
             // User selected nothing, so return no records
            $query->whereRaw('1 = 0');
        } else {
            $query->whereIn('status', $statuses);
        }

        // Order by employee first, then by date for proper chronological history per employee
        return $query->orderBy('user_id', 'asc')
                     ->orderBy('attendance_date', 'asc')
                     ->get();
    }

    public function headings(): array
    {
        $headers = [
            'Employee ID',
            'Name',
            'Date',
            'Schedule',
        ];

        if ($this->options['include_times']) {
            $headers[] = 'Time In';
        }

        if ($this->options['include_breaks']) {
            $headers[] = 'Break Start';
            $headers[] = 'Break End';
        }

        if ($this->options['include_times']) {
            $headers[] = 'Time Out';
        }

        $headers[] = 'Status';
        $headers[] = 'Minutes Late';
        $headers[] = 'Hours Worked';

        return $headers;
    }

    public function map($record): array
    {
        $row = [
            $record->user->employee_id,
            $record->user->full_name,
            $record->attendance_date?->format('Y-m-d') ?? $record->session->date->format('Y-m-d'),
            $record->session->schedule->name ?? 'N/A',
        ];

        // Fetch time format setting
        $timeFormatSetting = \App\Models\Setting::where('key', 'time_format')->value('value') ?? '24h';
        $format = ($timeFormatSetting === '12h') ? 'h:i A' : 'H:i';

        if ($this->options['include_times']) {
            $row[] = $record->time_in?->format($format);
        }

        if ($this->options['include_breaks']) {
            $row[] = $record->break_start?->format($format);
            $row[] = $record->break_end?->format($format);
        }

        if ($this->options['include_times']) {
            $row[] = $record->time_out?->format($format);
        }

        $row[] = ucfirst($record->status);
        $row[] = $record->minutes_late;
        $row[] = $record->hours_worked;

        return $row;
    }

    public function styles(Worksheet $sheet)
    {
        // Dynamic column alignment
        // Status/Minutes/Hours are always at the end.
        // We need to calculate which columns to center.
        
        // Base columns: A, B, C, D (4 cols)
        // Opt cols: TimeIn (1), Break (2), TimeOut (1)
        // Max cols: 4 + 1 + 2 + 1 + 3 = 11 (K)
        
        // Let's just center everything from C onwards
        return [
            1    => ['font' => ['bold' => true, 'size' => 12]],
            'C:Z' => ['alignment' => ['horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER]], // Safe bet to cover dynamic range
            'B' => ['alignment' => ['horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_LEFT]],
        ];
    }
}
