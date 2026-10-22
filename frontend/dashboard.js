document.addEventListener("DOMContentLoaded", async function () {
    const table = document.getElementById("attendanceTable");
    try {
        const date = localISODate();
        const [summary, records] = await Promise.all([
            AttendanceAPI.getDashboard(date),
            AttendanceAPI.getByDate(date)
        ]);

        document.getElementById("totalStudents").textContent = summary.students;
        document.getElementById("presentStudents").textContent = summary.present;
        document.getElementById("absentStudents").textContent = summary.absent;
        document.getElementById("attendancePercent").textContent = `${summary.attendance_rate}%`;

        if (!table) return;
        if (!records.length) {
            table.innerHTML = '<tr><td colspan="4">No attendance records found for today.</td></tr>';
            return;
        }
        table.innerHTML = records.map(record => `
            <tr>
                <td>${escapeDashboardHTML(record.roll)}</td>
                <td>${escapeDashboardHTML(record.name)}</td>
                <td>${escapeDashboardHTML(record.class)}</td>
                <td>${escapeDashboardHTML(record.status)}</td>
            </tr>
        `).join("");
    } catch (error) {
        if (table) table.innerHTML = `<tr><td colspan="4">${escapeDashboardHTML(error.message)}</td></tr>`;
        console.error("Dashboard data could not be loaded:", error);
    }
});

function escapeDashboardHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[char]);
}
