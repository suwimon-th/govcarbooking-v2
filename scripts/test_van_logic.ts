
/**
 * Test Script for Week 3 Monday Logic
 * Run with: npx tsx scripts/test_van_logic.ts
 */

function checkRestriction(dateStr: string) {
    const bookingDate = new Date(dateStr);
    const dayOfWeek = bookingDate.getDay();
    const dayOfMonth = bookingDate.getDate();

    // 1. Calculate Offset (Day of week of the 1st)
    const firstDayOfMonth = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), 1);
    const offset = firstDayOfMonth.getDay();

    // 2. Calculate Row Number
    const weekNumber = Math.ceil((dayOfMonth + offset) / 7);

    const isMonday = dayOfWeek === 1;
    const isRestricted = isMonday && weekNumber === 3;

    console.log(`Date: ${dateStr} | Day: ${dayOfMonth} | WeekRow: ${weekNumber} | Mon: ${isMonday} -> Restricted: ${isRestricted}`);
    return isRestricted;
}

console.log("--- Testing User Scenarios ---");
// User Case 1: Jan 12, 2026 (Mon) -> Should be Week 3
// Jan 1, 2026 is Thursday (Offset 4).
// Row 1: 1-3
// Row 2: 4-10
// Row 3: 11-17 (Contains 12)
checkRestriction("2026-01-12");

// User Case 2: Feb 16, 2026 (Mon) -> Should be Week 3
// Feb 1, 2026 is Sunday (Offset 0).
// Row 1: 1-7
// Row 2: 8-14
// Row 3: 15-21 (Contains 16)
checkRestriction("2026-02-16");

// User Case 3: Mar 16, 2026 (Mon) -> Should be Week 3
checkRestriction("2026-03-16");

console.log("\n--- Testing Control ---");
checkRestriction("2026-01-05"); // Week 2 Mon
checkRestriction("2026-01-19"); // Week 4 Mon
checkRestriction("2026-02-09"); // Week 2 Mon
