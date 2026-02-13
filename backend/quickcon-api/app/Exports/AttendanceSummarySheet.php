<?php

namespace App\Exports;

use App\Models\AttendanceRecord;
use App\Models\User;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Illuminate\Support\Facades\DB;

class AttendanceSummarySheet implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithStyles, WithTitle
{
    protected $startDate;
    protected $endDate;
    protected $userId;
    protected $options;

    public function __construct($startDate, $endDate, $userId = null, $options = [])
    {
        $this->startDate = $startDate;
        $this->endDate = $endDate;
        $this->userId = $userId;
        $this->options = $options;
    }

    public function title(): string
    {
        return 'Attendance Summary';
    }

    public function collection()
    {
        $query = User::where('role', 'employee')
            ->withCount(['attendanceRecords as total_days' => function ($q) {
                $q->whereBetween('attendance_date', [$this->startDate, $this->endDate])
                  ->whereIn('status', ['present', 'late', 'excused', 'left_early']);
            }])
            ->withCount(['attendanceRecords as late_count' => function ($q) {
                $q->whereBetween('attendance_date', [$this->startDate, $this->endDate])
                  ->where('status', 'late');
            }])
            ->with(['attendanceRecords' => function ($q) {
                $q->whereBetween('attendance_date', [$this->startDate, $this->endDate]);
            }]);

        if ($this->userId) {
            $query->where('id', $this->userId);
        }

        return $query->get()->map(function($user) {
            $user->total_hours = $user->attendanceRecords->sum(function($record) {
                return (float) $record->calculateHoursWorked();
            });
            return $user;
        });
    }

    public function headings(): array
    {
        return [
            'Employee ID',
            'Full Name',
            'Days Present',
            'Times Late',
            'Total Hours Worked',
            'Average Hours/Day',
        ];
    }

    public function map($user): array
    {
        $avgHours = $user->total_days > 0 ? round($user->total_hours / $user->total_days, 2) : 0;
        
        return [
            $user->employee_id,
            $user->full_name,
            $user->total_days,
            $user->late_count,
            $user->total_hours,
            $avgHours,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        $sheet->getStyle('1')->getFont()->setBold(true);
        $sheet->getStyle('1')->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)->getStartColor()->setARGB('C6EFCE');

        return [
            1 => ['font' => ['size' => 12]],
            'C:F' => ['alignment' => ['horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER]],
        ];
    }
}
