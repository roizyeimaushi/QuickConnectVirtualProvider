
export const holidays2026 = [
    { date: '2026-01-01', name: "New Year's Day", type: 'regular' },
    { date: '2026-02-17', name: "Chinese New Year", type: 'special' },
    { date: '2026-02-25', name: "EDSA Revolution Anniversary", type: 'special' },
    { date: '2026-04-02', name: "Maundy Thursday", type: 'regular' },
    { date: '2026-04-03', name: "Good Friday", type: 'regular' },
    { date: '2026-04-04', name: "Black Saturday", type: 'special' },
    { date: '2026-04-09', name: "Araw ng Kagitingan", type: 'regular' },
    { date: '2026-05-01', name: "Labor Day", type: 'regular' },
    { date: '2026-06-12', name: "Independence Day", type: 'regular' },
    { date: '2026-08-21', name: "Ninoy Aquino Day", type: 'special' },
    { date: '2026-08-31', name: "National Heroes Day", type: 'regular' },
    { date: '2026-11-01', name: "All Saints' Day", type: 'special' },
    { date: '2026-11-30', name: "Bonifacio Day", type: 'regular' },
    { date: '2026-12-08', name: "Feast of the Immaculate Conception", type: 'special' },
    { date: '2026-12-25', name: "Christmas Day", type: 'regular' },
    { date: '2026-12-30', name: "Rizal Day", type: 'regular' },
    { date: '2026-12-31', name: "Last Day of the Year", type: 'special' },
];

export function getHoliday(date) {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    // Ideally we'd support other years, but keeping it simple for 2026 as requested
    return holidays2026.find(h => h.date === dateString);
}

export function isHoliday(date) {
    return !!getHoliday(date);
}
