<?php

namespace App\Exports;

use App\Models\AttendanceRecord;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class AttendanceDetailSheet implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithStyles, WithTitle
{
    protected $startDate;
    protected $endDate;
    protected $userId;
    protected $options;
    protected $title;

    public function __construct($startDate, $endDate, $userId = null, $options = [], $title = 'Attendance Details')
    {
        $this->startDate = $startDate;
        $this->endDate = $endDate;
        $this->userId = $userId;
        $this->options = $options;
        $this->title = $title;
    }

    public function title(): string
    {
        return $this->title;
    }

    public function collection()
    {
        $statuses = [];
        if ($this->options['include_present'] ?? true) {
            $statuses[] = 'present';
            $statuses[] = 'excused';
        }
        if ($this->options['include_late'] ?? true) {
            $statuses[] = 'late';
            $statuses[] = 'left_early';
        }
        if ($this->options['include_absent'] ?? true) {
            $statuses[] = 'absent';
            $statuses[] = 'pending';
        }

        $query = AttendanceRecord::with(['user', 'session.schedule'])
            ->whereBetween('attendance_date', [$this->startDate, $this->endDate]);

        if ($this->userId) {
            $query->where('user_id', $this->userId);
        }

        if (empty($statuses)) {
            $query->whereRaw('1 = 0');
        } else {
            $query->whereIn('status', $statuses);
        }

        return $query->orderBy('user_id', 'asc')
                     ->orderBy('attendance_date', 'asc')
                     ->get();
    }

    public function headings(): array
    {
        $headers = [
            'ID',
            'Employee Name',
            'Date',
            'Schedule',
        ];

        if ($this->options['include_times'] ?? true) {
            $headers[] = 'Time In';
        }

        if ($this->options['include_breaks'] ?? true) {
            $headers[] = 'Break Start';
            $headers[] = 'Break End';
        }

        if ($this->options['include_times'] ?? true) {
            $headers[] = 'Time Out';
        }

        $headers[] = 'Status';
        $headers[] = 'Mins Late';
        $headers[] = 'Hours Worked';

        return $headers;
    }

    public function map($record): array
    {
        $employeeId = $record->user?->employee_id ?? 'N/A';
        $employeeName = $record->user?->full_name ?? 'Unknown';
        $date = $record->attendance_date?->format('Y-m-d') 
            ?? $record->session?->date?->format('Y-m-d') 
            ?? 'N/A';
        $scheduleName = $record->session?->schedule?->name ?? 'N/A';

        $row = [
            $employeeId,
            $employeeName,
            $date,
            $scheduleName,
        ];

        $timeFormatSetting = \App\Models\Setting::where('key', 'time_format')->value('value') ?? '24h';
        $format = ($timeFormatSetting === '12h') ? 'h:i A' : 'H:i';

        if ($this->options['include_times'] ?? true) {
            $row[] = $record->time_in?->format($format) ?? '—';
        }

        if ($this->options['include_breaks'] ?? true) {
            $row[] = $record->break_start?->format($format) ?? '—';
            $row[] = $record->break_end?->format($format) ?? '—';
        }

        if ($this->options['include_times'] ?? true) {
            $row[] = $record->time_out?->format($format) ?? '—';
        }

        $row[] = ucfirst($record->status);
        $row[] = $record->minutes_late ?? 0;
        $row[] = $record->calculateHoursWorked();

        return $row;
    }

    public function styles(Worksheet $sheet)
    {
        // Bold headers with gray background
        $sheet->getStyle('1')->getFont()->setBold(true);
        $sheet->getStyle('1')->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)->getStartColor()->setARGB('EEEEEE');

        return [
            1 => ['font' => ['size' => 11]],
            'C:Z' => ['alignment' => ['horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER]],
            'B' => ['alignment' => ['horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_LEFT]],
        ];
    }
}
