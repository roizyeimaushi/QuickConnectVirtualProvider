<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Concerns\Exportable;
use App\Models\User;

class AttendanceExport implements WithMultipleSheets
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
        $this->options = $options;
    }

    /**
     * @return array
     */
    public function sheets(): array
    {
        $sheets = [];

        // 1. Summary Sheet (Always first)
        $sheets[] = new AttendanceSummarySheet($this->startDate, $this->endDate, $this->userId, $this->options);

        // 2. Master Detailed Sheet (Optional, but good for data processing)
        $sheets[] = new AttendanceDetailSheet($this->startDate, $this->endDate, $this->userId, $this->options, 'All Records');

        // 3. Individual Employee Sheets (Tabs)
        if (!$this->userId) {
            // Get all employees who have records in this range to avoid empty sheets
            $employees = User::whereHas('attendanceRecords', function($q) {
                $q->whereBetween('attendance_date', [$this->startDate, $this->endDate]);
            })->where('role', 'employee')->get();

            // Limit to e.g. 50 employees to avoid extreme tab counts
            foreach ($employees->take(50) as $employee) {
                $sheets[] = new AttendanceDetailSheet(
                    $this->startDate, 
                    $this->endDate, 
                    $employee->id, 
                    $this->options, 
                    substr($employee->first_name . ' ' . $employee->last_name, 0, 30) // Excel limit
                );
            }
        }

        return $sheets;
    }
}
