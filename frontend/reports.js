/* ==========================================
   reports.js - Part 1
   Student Attendance Reporting System
========================================== */

let reportStudents = [];
let reportAttendance = [];
let generatedReport = [];


/* ==========================================
   INITIALIZE REPORT PAGE
========================================== */

document.addEventListener("DOMContentLoaded", function () {

    initializeReports();

});


/* ==========================================
   INITIALIZE
========================================== */

async function initializeReports() {
    try {
        reportStudents = await AttendanceAPI.getStudents();
    } catch (error) {
        alert(`Could not load students: ${error.message}`);
        reportStudents = [];
    }

    populateStudentDropdown();

    setDefaultReportDates();

    updateReportStatistics([]);

}


/* ==========================================
   POPULATE STUDENT DROPDOWN
========================================== */

function populateStudentDropdown() {

    const select =
        document.getElementById("reportStudent");

    if (!select) return;


    select.innerHTML = `

        <option value="all">
            All Students
        </option>

    `;


    reportStudents.forEach(function (student) {

        const option =
            document.createElement("option");

        option.value = student.id;

        option.textContent =
        `${student.roll_no} - ${student.name}`;

        select.appendChild(option);

    });

}


/* ==========================================
   DEFAULT REPORT DATES
========================================== */

function setDefaultReportDates() {

    const fromDate =
        document.getElementById("fromDate");

    const toDate =
        document.getElementById("toDate");


    const today = localISODate();


    if (fromDate && !fromDate.value) {

        fromDate.value = today;

    }


    if (toDate && !toDate.value) {

        toDate.value = today;

    }

}


/* ==========================================
   GENERATE REPORT BUTTON
========================================== */

const generateReportButton =
    document.getElementById("generateReport");


if (generateReportButton) {

    generateReportButton.addEventListener(
        "click",
        generateAttendanceReport
    );

}


/* ==========================================
   GENERATE ATTENDANCE REPORT
========================================== */

async function generateAttendanceReport() {

    const studentSelect =
        document.getElementById(
            "reportStudent"
        );

    const fromDate =
        document.getElementById(
            "fromDate"
        );

    const toDate =
        document.getElementById(
            "toDate"
        );


    const studentId =
        studentSelect
            ? studentSelect.value
            : "all";


    const startDate =
        fromDate
            ? fromDate.value
            : "";


    const endDate =
        toDate
            ? toDate.value
            : "";


    /* Validate dates */

    if (!startDate || !endDate) {

        alert(
            "Please select both From Date and To Date."
        );

        return;

    }


    if (startDate > endDate) {

        alert(
            "From Date cannot be after To Date."
        );

        return;

    }


    try {
        reportAttendance = await AttendanceAPI.getRange(startDate, endDate);
    } catch (error) {
        alert(`Could not load report: ${error.message}`);
        return;
    }

    generatedReport = reportAttendance.filter(function (record) {
        return studentId === "all" || String(record.studentId) === String(studentId);
    });


    /* Render report */

    renderReportTable(
        generatedReport
    );


    updateReportStatistics(
        generatedReport
    );


    renderStudentSummary(
        generatedReport,
        studentId
    );


    updateReportHeader(
        studentId,
        startDate,
        endDate
    );

}


/* ==========================================
   RENDER REPORT TABLE
========================================== */

function renderReportTable(records) {

    const table =
        document.getElementById(
            "reportTable"
        );


    if (!table) return;


    table.innerHTML = "";


    if (records.length === 0) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    style="text-align:center;">

                    No attendance records
                    found for the selected criteria.

                </td>

            </tr>

        `;

        return;

    }


    records.forEach(function (record, index) {

        const row =
            document.createElement("tr");


        const statusClass =
            record.status === "Present"
                ? "present"
                : "absent";


        row.innerHTML = `

            <td>
                ${index + 1}
            </td>

            <td>
                ${formatReportDate(record.date)}
            </td>

            <td>
                ${escapeReportHTML(record.roll)}
            </td>

            <td>
                ${escapeReportHTML(record.name)}
            </td>

            <td>
                    ${escapeReportHTML(record.branch)}
            </td>

            <td>

                <span class="status ${statusClass}">

                    ${escapeReportHTML(record.status)}

                </span>

            </td>

        `;


        table.appendChild(row);

    });

}


/* ==========================================
   FORMAT DATE
========================================== */

function formatReportDate(dateString) {

    if (!dateString) return "-";


    const date =
        new Date(
            dateString + "T00:00:00"
        );


    if (isNaN(date.getTime())) {

        return dateString;

    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


/* ==========================================
   HTML ESCAPE
========================================== */

function escapeReportHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}
/* ==========================================
   reports.js - Part 2
   Statistics • Summary
========================================== */


/* ==========================================
   UPDATE REPORT STATISTICS
========================================== */

function updateReportStatistics(records) {

    let present = 0;
    let absent = 0;


    /* Count Present / Absent */

    records.forEach(function (record) {

        if (record.status === "Present") {

            present++;

        }

        else if (record.status === "Absent") {

            absent++;

        }

    });


    /*
       Calculate total attendance days.

       For all students, count unique dates.
       For one student, records themselves
       represent the attendance days.
    */

    const uniqueDates =
        new Set(
            records.map(function (record) {

                return record.date;

            })
        );


    const totalDays =
        uniqueDates.size;


    /*
       Attendance percentage
    */

    const totalMarked =
        present + absent;


    const percentage =
        totalMarked === 0
            ? 0
            : Math.round(
                (present / totalMarked) * 100
            );


    /* ======================================
       Main Statistics Cards
    ====================================== */

    setReportValue(
        "totalDays",
        totalDays
    );


    setReportValue(
        "reportPresent",
        present
    );


    setReportValue(
        "reportAbsent",
        absent
    );


    setReportValue(
        "reportPercentage",
        percentage + "%"
    );


    /* ======================================
       Summary Panel
    ====================================== */

    setReportValue(
        "summaryPresent",
        present
    );


    setReportValue(
        "summaryAbsent",
        absent
    );


    setReportValue(
        "summaryPercentage",
        percentage + "%"
    );

}


/* ==========================================
   SET ELEMENT VALUE
========================================== */

function setReportValue(id, value) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent = value;

    }

}


/* ==========================================
   STUDENT-WISE SUMMARY
========================================== */

function renderStudentSummary(
    records,
    selectedStudentId
) {

    const table =
        document.getElementById(
            "studentSummaryTable"
        );


    if (!table) return;


    table.innerHTML = "";


    /*
       If a particular student is selected,
       create summary only for that student.
    */

    let studentsForSummary;


    if (selectedStudentId === "all") {

        studentsForSummary =
            reportStudents;

    }

    else {

        studentsForSummary =
            reportStudents.filter(
                function (student) {

                    return String(student.id) ===
                        String(selectedStudentId);

                }
            );

    }


    if (studentsForSummary.length === 0) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    style="text-align:center;">

                    No student data available.

                </td>

            </tr>

        `;

        return;

    }


    /*
       Create summary for each student.
    */

    studentsForSummary.forEach(
        function (student) {

            const studentRecords =
                records.filter(
                    function (record) {

                        return String(
                            record.studentId
                        ) === String(student.id);

                    }
                );


            let present = 0;
            let absent = 0;


            studentRecords.forEach(
                function (record) {

                    if (
                        record.status === "Present"
                    ) {

                        present++;

                    }

                    else if (
                        record.status === "Absent"
                    ) {

                        absent++;

                    }

                }
            );


            const total =
                present + absent;


            const percentage =
                total === 0
                    ? 0
                    : Math.round(
                        (present / total) * 100
                    );


            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>

                    ${escapeReportHTML(
                        student.roll_no
                    )}

                </td>


                <td>

                    ${escapeReportHTML(
                        student.name
                    )}

                </td>


                <td>

                    ${total}

                </td>


                <td>

                    <span class="status present">

                        ${present}

                    </span>

                </td>


                <td>

                    <span class="status absent">

                        ${absent}

                    </span>

                </td>


                <td>

                    <strong>

                        ${percentage}%

                    </strong>

                </td>

            `;


            table.appendChild(row);

        }
    );

}


/* ==========================================
   UPDATE REPORT HEADER
========================================== */

function updateReportHeader(
    studentId,
    startDate,
    endDate
) {

    const studentNameElement =
        document.getElementById(
            "selectedStudentName"
        );


    const periodElement =
        document.getElementById(
            "reportPeriod"
        );


    const statusElement =
        document.getElementById(
            "reportStatus"
        );


    /*
       Student name
    */

    let studentName =
        "All Students";


    if (studentId !== "all") {

        const student =
            reportStudents.find(
                function (item) {

                    return String(item.id) ===
                        String(studentId);

                }
            );


        if (student) {

            studentName =
                `${student.roll_no} - ${student.name}`;

        }

    }


    if (studentNameElement) {

        studentNameElement.textContent =
            studentName;

    }


    /*
       Report period
    */

    const period =
        `${formatReportDate(startDate)} - ` +
        `${formatReportDate(endDate)}`;


    if (periodElement) {

        periodElement.textContent =
            period;

    }


    /*
       Report status
    */

    if (statusElement) {

        statusElement.textContent =
            generatedReport.length > 0
                ? "Report generated successfully"
                : "No records found";

    }

}


/* ==========================================
   STUDENT SELECTION CHANGE
========================================== */

const reportStudentSelect =
    document.getElementById(
        "reportStudent"
    );


if (reportStudentSelect) {

    reportStudentSelect.addEventListener(
        "change",
        function () {

            /*
               Automatically regenerate the
               report when student changes.
            */

            const fromDate =
                document.getElementById(
                    "fromDate"
                );

            const toDate =
                document.getElementById(
                    "toDate"
                );


            if (
                fromDate &&
                toDate &&
                fromDate.value &&
                toDate.value
            ) {

                generateAttendanceReport();

            }

        }
    );

}

const exportReportButton = document.getElementById("exportReport");
if (exportReportButton) {
    exportReportButton.addEventListener("click", function () {
        if (!generatedReport.length) {
            alert("Generate a report with records before exporting.");
            return;
        }
        const rows = [["Date", "SAT ID", "Roll No", "Name", "Branch", "Semester", "Status"]];
        generatedReport.forEach(record => rows.push([
            record.date, record.student_id_code || record.sat_id || "", record.roll,
            record.name, record.branch, record.semester, record.status
        ]));
        const csv = rows.map(row => row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "attendance-report.csv";
        link.click();
        URL.revokeObjectURL(url);
    });
}
