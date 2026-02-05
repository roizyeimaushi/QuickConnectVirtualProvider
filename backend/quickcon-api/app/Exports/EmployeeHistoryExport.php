<?php

namespace App\Exports;

use App\Models\AttendanceRecord;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class EmployeeHistoryExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithStyles, WithEvents
{
    protected $userId;
    protected $user;

    public function __construct($user)
    {
        $this->user = $user;
        $this->userId = $user->id;
    }

    public function collection()
    {
        return AttendanceRecord::with(['session.schedule'])
            ->where('user_id', $this->userId)
            ->orderBy('attendance_date', 'desc')
            ->get();
    }

    public function headings(): array
    {
        return [
            ['Employee Attendance Report'],
            [
                'Employee ID: ' . $this->user->employee_id,
                'Name: ' . $this->user->full_name,
                'Position: ' . $this->user->position
            ],
            [],
            [
                'Date',
                'Schedule',
                'Check-in',
                'Check-out',
                'Break Start',
                'Break End',
                'Status',
                'Late (mins)',
                'Worked (hrs)'
            ]
        ];
    }

    public function map($record): array
    {
        // FIXED HOURS ON THE FLY (History Export)
        $hoursWorked = $record->hours_worked;
        if ($record->time_in && $record->time_out && !in_array($record->status, ['pending', 'absent'])) {
             $totalMinutes = $record->time_in->diffInMinutes($record->time_out, false);
             if ($totalMinutes < 0) $totalMinutes += 1440;
             
             $breakMinutes = $record->breaks()->sum('duration_minutes');
             if ($breakMinutes == 0 && $record->break_start && $record->break_end) {
                 $bDiff = $record->break_start->diffInMinutes($record->break_end, false);
                 $breakMinutes = $bDiff < 0 ? $bDiff + 1440 : $bDiff;
             }
             
             $hoursWorked = round(max(0, $totalMinutes - $breakMinutes) / 60, 2);
        }

        return [
            $record->attendance_date->format('Y-m-d'),
            $record->session->schedule->name ?? 'N/A',
            $record->time_in ? $record->time_in->format('H:i') : '-',
            $record->time_out ? $record->time_out->format('H:i') : '-',
            $record->break_start ? $record->break_start->format('H:i') : '-',
            $record->break_end ? $record->break_end->format('H:i') : '-',
            ucfirst($record->status),
            $record->minutes_late,
            $hoursWorked,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true, 'size' => 16]],
            2 => ['font' => ['bold' => true]],
            4 => ['font' => ['bold' => true, 'color' => ['argb' => 'FFFFFF']], 'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['argb' => '4caf50']]],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function(AfterSheet $event) {
                $event->sheet->mergeCells('A1:I1');
                $event->sheet->mergeCells('A2:I2');
            },
        ];
    }
}
