/* ==========================================
   attendance.js - Part 1
   Student Attendance Reporting System
========================================== */

let attendanceStudents = [];
let attendanceRecords = [];
let attendanceSelections = new Map();

let selectedAttendanceDate = "";


/* ==========================================
   INITIALIZE ATTENDANCE PAGE
========================================== */

document.addEventListener("DOMContentLoaded", function () {
    initializeAttendance().catch(function (error) {
        alert(`Could not initialize attendance: ${error.message}`);
    });

});


/* ==========================================
   INITIALIZE
========================================== */

async function initializeAttendance() {

    /* Get students from Local Storage */

    attendanceStudents = await AttendanceAPI.getStudents();


    /* Get attendance records */


    /* Set today's date */

    const dateInput =
        document.getElementById("attendanceDate");


    if (dateInput) {

        if (!dateInput.value) {

            const today = localISODate();

            dateInput.value = today;

        }

        selectedAttendanceDate =
            dateInput.value;

    }


    /* Display students */

    renderAttendanceStudents();


    /* Update statistics */

    updateAttendanceSummary();


    /* Load previously saved attendance */

    await loadSavedAttendance();

}


/* ==========================================
   GET SELECTED DATE
========================================== */

function getSelectedAttendanceDate() {

    const dateInput =
        document.getElementById("attendanceDate");


    if (!dateInput) {

        return localISODate();

    }


    return dateInput.value;

}


/* ==========================================
   RENDER STUDENTS
========================================== */

function renderAttendanceStudents(
    filteredStudents = attendanceStudents
) {

    const table =
        document.getElementById("attendanceTable");


    if (!table) return;


    table.querySelectorAll('input[type="radio"]:checked').forEach(function (radio) {
        attendanceSelections.set(String(radio.dataset.studentId), radio.value);
    });
    table.innerHTML = "";


    /* No students */

    if (filteredStudents.length === 0) {

        table.innerHTML = `

            <tr>

            <td colspan="7"
                    style="text-align:center;">

                    No students found.

                </td>

            </tr>

        `;

        updateAttendanceSummary();

        return;

    }


    /* Create rows */

    filteredStudents.forEach(function (student, index) {

        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>
                ${index + 1}
            </td>

            <td>${escapeHTML(student.student_id)}</td>
            <td>${escapeHTML(student.roll)}</td>
            <td>${escapeHTML(student.name)}</td>
            <td>${escapeHTML(student.branch)}</td>
            <td>${escapeHTML(student.semester)}</td>

            <td>

                <div class="attendance-options">

                    <label>

                        <input
                            type="radio"
                            name="status-${student.id}"
                            value="Present"
                            data-student-id="${student.id}"
                            ${attendanceSelections.get(String(student.id)) === "Present" ? "checked" : ""}>

                        <span>
                            Present
                        </span>

                    </label>


                    <label>

                        <input
                            type="radio"
                            name="status-${student.id}"
                            value="Absent"
                            data-student-id="${student.id}"
                            ${attendanceSelections.get(String(student.id)) === "Absent" ? "checked" : ""}>

                        <span>
                            Absent
                        </span>

                    </label>

                </div>

            </td>

        `;


        table.appendChild(row);

    });


    /* Listen for status changes */

    const radios =
        table.querySelectorAll(
            'input[type="radio"]'
        );


    radios.forEach(function (radio) {

        radio.addEventListener(
            "change",
            function () {
                attendanceSelections.set(String(radio.dataset.studentId), radio.value);
                updateAttendanceSummary();
            }
        );

    });

}


/* ==========================================
   HTML SECURITY HELPER
========================================== */

function escapeHTML(value) {

    if (value === null ||
        value === undefined) {

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
   attendance.js - Part 2
   Save • Load • Summary
========================================== */


/* ==========================================
   UPDATE ATTENDANCE SUMMARY
========================================== */

function updateAttendanceSummary() {

    const total =
        attendanceStudents.length;

    let present = 0;
    let absent = 0;


    /*
       Count only students whose
       attendance status has been selected.
    */

    attendanceStudents.forEach(function (student) {

        const selected =
            document.querySelector(
                `input[name="status-${student.id}"]:checked`
            );


        const status = selected ? selected.value : attendanceSelections.get(String(student.id));
        if (!status) return;


        if (status === "Present") {

            present++;

        }

        else if (status === "Absent") {

            absent++;

        }

    });


    /*
       Calculate percentage
    */

    const percentage =
        total === 0
            ? 0
            : Math.round((present / total) * 100);


    /* ======================================
       Update Main Statistics
    ====================================== */

    const totalElement =
        document.getElementById("totalStudents");

    const presentElement =
        document.getElementById("presentCount");

    const absentElement =
        document.getElementById("absentCount");

    const percentageElement =
        document.getElementById("attendancePercent");


    if (totalElement) {

        totalElement.textContent = total;

    }


    if (presentElement) {

        presentElement.textContent = present;

    }


    if (absentElement) {

        absentElement.textContent = absent;

    }


    if (percentageElement) {

        percentageElement.textContent =
            percentage + "%";

    }


    /* ======================================
       Update Summary Panel
    ====================================== */

    const summaryTotal =
        document.getElementById("summaryTotal");

    const summaryPresent =
        document.getElementById("summaryPresent");

    const summaryAbsent =
        document.getElementById("summaryAbsent");

    const summaryPercentage =
        document.getElementById("summaryPercentage");


    if (summaryTotal) {

        summaryTotal.textContent = total;

    }


    if (summaryPresent) {

        summaryPresent.textContent = present;

    }


    if (summaryAbsent) {

        summaryAbsent.textContent = absent;

    }


    if (summaryPercentage) {

        summaryPercentage.textContent =
            percentage + "%";

    }

}


/* ==========================================
   SAVE ATTENDANCE
========================================== */

const saveAttendanceButton =
    document.getElementById("saveAttendance");


if (saveAttendanceButton) {

    saveAttendanceButton.addEventListener(
        "click",
        saveDailyAttendance
    );

}


/* ==========================================
   SAVE DAILY ATTENDANCE
========================================== */

async function saveDailyAttendance() {

    const date =
        getSelectedAttendanceDate();


    if (!date) {

        alert("Please select an attendance date.");

        return;

    }


    /*
       Check whether every student
       has been marked.
    */

    const unmarkedStudents =
        attendanceStudents.filter(function (student) {

            return !attendanceSelections.has(String(student.id)) && !document.querySelector(
                `input[name="status-${student.id}"]:checked`
            );

        });


    if (unmarkedStudents.length > 0) {

        alert(
            `Please mark attendance for all students.\n\n` +
            `${unmarkedStudents.length} student(s) are unmarked.`
        );

        return;

    }


    const records = attendanceStudents.map(function (student) {
        const selected = document.querySelector(
            `input[name="status-${student.id}"]:checked`
        );
        return { student_id: student.id, status: selected ? selected.value : attendanceSelections.get(String(student.id)) };
    });

    try {
        await AttendanceAPI.saveBulk(date, records);
        attendanceRecords = await AttendanceAPI.getByDate(date);
        alert("Attendance saved successfully!");
        updateAttendanceSummary();
    } catch (error) {
        alert(`Could not save attendance: ${error.message}`);
    }

}


/* ==========================================
   LOAD SAVED ATTENDANCE
========================================== */

async function loadSavedAttendance() {

    const date =
        getSelectedAttendanceDate();


    if (!date) return;


    try {
        attendanceRecords = await AttendanceAPI.getByDate(date);
    } catch (error) {
        attendanceRecords = [];
        alert(`Could not load attendance: ${error.message}`);
    }
    const savedRecords = attendanceRecords;


    /*
       If there is no saved attendance
    */

    if (savedRecords.length === 0) {

        updateAttendanceSummary();

        return;

    }


    /*
       Apply saved Present / Absent
       status to radio buttons.
    */

    savedRecords.forEach(function (record) {

        attendanceSelections.set(String(record.studentId), record.status);

        const radio =
            document.querySelector(
                `input[name="status-${record.studentId}"][value="${record.status}"]`
            );


        if (radio) {

            radio.checked = true;

        }

    });


    updateAttendanceSummary();

}


/* ==========================================
   CHANGE DATE
========================================== */

const attendanceDateInput =
    document.getElementById("attendanceDate");


if (attendanceDateInput) {

    attendanceDateInput.addEventListener(
        "change",
        async function () {

            selectedAttendanceDate =
                this.value;
            attendanceSelections.clear();
            document.querySelectorAll('#attendanceTable input[type="radio"]:checked').forEach(function (radio) {
                radio.checked = false;
            });


            /*
               Reload students so that
               saved status is applied.
            */

            renderAttendanceStudents();


            /*
               Load saved records for
               selected date.
            */

            await loadSavedAttendance();


            updateAttendanceSummary();

        }
    );

}
/* ==========================================
   attendance.js - Part 3
   Search • Mark All • Reset • Export
========================================== */


/* ==========================================
   SEARCH STUDENTS
========================================== */

const attendanceSearch =
    document.getElementById("searchAttendance");


if (attendanceSearch) {

    attendanceSearch.addEventListener(
        "input",
        async function () {

            const keyword =
                this.value.toLowerCase().trim();


            const filteredStudents =
                attendanceStudents.filter(function (student) {

                    return (

                        String(student.name)
                            .toLowerCase()
                            .includes(keyword)

                        ||

                        String(student.roll)
                            .toLowerCase()
                            .includes(keyword)

                        ||

                        String(student.student_id || "")
                            .toLowerCase()
                            .includes(keyword)

                        ||

                        String(student.branch)
                            .toLowerCase()
                            .includes(keyword)

                        ||

                        String(student.semester || "")
                            .toLowerCase()
                            .includes(keyword)

                    );

                });


            renderAttendanceStudents(
                filteredStudents
            );


            /*
               Loading saved attendance again ensures
               the selected status remains visible
               after searching.
            */

            updateAttendanceSummary();

        }
    );

}


/* ==========================================
   MARK ALL STUDENTS PRESENT
========================================== */

const markAllButton =
    document.getElementById("markAllPresent");


if (markAllButton) {

    markAllButton.addEventListener(
        "click",
        function () {

            attendanceStudents.forEach(
                function (student) {

                    const presentRadio =
                        document.querySelector(
                            `input[name="status-${student.id}"][value="Present"]`
                        );


                    if (presentRadio) {

                        presentRadio.checked = true;

                    }
                    attendanceSelections.set(String(student.id), "Present");

                }
            );


            updateAttendanceSummary();

        }
    );

}


/* ==========================================
   RESET ATTENDANCE
========================================== */

const resetButton =
    document.getElementById("resetAttendance");


if (resetButton) {

    resetButton.addEventListener(
        "click",
        function (event) {

            event.stopImmediatePropagation();

            const confirmed =
                confirm(
                    "Reset all attendance selections?"
                );


            if (!confirmed) return;


            const radios =
                document.querySelectorAll(
                    '#attendanceTable input[type="radio"]'
                );


            radios.forEach(function (radio) {

                radio.checked = false;

            });
            attendanceSelections.clear();


            updateAttendanceSummary();

        }
    );

}


/* ==========================================
   EXPORT DAILY ATTENDANCE
========================================== */

function exportAttendance() {

    const date =
        getSelectedAttendanceDate();


    if (!date) {

        alert("Please select a date.");

        return;

    }


    const records = attendanceRecords.filter(record => record.date === date);


    if (records.length === 0) {

        alert(
            "No saved attendance found for this date."
        );

        return;

    }


    let csv =
        "Roll No,Student Name,Class,Section,Date,Status\n";


    records.forEach(function (record) {

        csv +=
            `"${escapeCSV(record.roll)}",` +
            `"${escapeCSV(record.name)}",` +
            `"${escapeCSV(record.class)}",` +
            `"${escapeCSV(record.section)}",` +
            `"${escapeCSV(record.date)}",` +
            `"${escapeCSV(record.status)}"\n`;

    });


    const blob =
        new Blob(
            [csv],
            { type: "text/csv;charset=utf-8;" }
        );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");


    link.href = url;

    link.download =
        `attendance-${date}.csv`;


    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);


    URL.revokeObjectURL(url);

}


/* ==========================================
   CSV SECURITY / FORMATTING
========================================== */

function escapeCSV(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .replace(/"/g, '""');

}


/* ==========================================
   REFRESH ATTENDANCE
========================================== */

async function refreshAttendance() {

    attendanceStudents = await AttendanceAPI.getStudents();


    renderAttendanceStudents();


    await loadSavedAttendance();


    updateAttendanceSummary();

}


/* ==========================================
   DELETE ATTENDANCE FOR SELECTED DATE
========================================== */

async function deleteAttendanceForDate() {

    const date =
        getSelectedAttendanceDate();


    if (!date) return;


    const records = await AttendanceAPI.getByDate(date);
    const exists = records.length > 0;


    if (!exists) {

        alert(
            "No attendance record exists for this date."
        );

        return;

    }


    const confirmed =
        confirm(
            `Delete attendance for ${date}?`
        );


    if (!confirmed) return;


    await AttendanceAPI.deleteDate(date);
    attendanceRecords = [];
    attendanceSelections.clear();


    /*
       Clear displayed selections
    */

    const radios =
        document.querySelectorAll(
            '#attendanceTable input[type="radio"]'
        );


    radios.forEach(function (radio) {

        radio.checked = false;

    });


    updateAttendanceSummary();


    alert(
        "Attendance record deleted successfully."
    );

}


/* ==========================================
   DISPLAY CURRENT DATE
========================================== */

function formatAttendanceDate(dateString) {

    if (!dateString) return "-";


    const date =
        new Date(dateString + "T00:00:00");


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
   UPDATE DATE LABEL
========================================== */

function updateDateLabel() {

    const date =
        getSelectedAttendanceDate();


    const label =
        document.getElementById(
            "selectedDateLabel"
        );


    if (label && date) {

        label.textContent =
            formatAttendanceDate(date);

    }

}


/* ==========================================
   DATE LABEL UPDATE
========================================== */

if (attendanceDateInput) {

    attendanceDateInput.addEventListener(
        "change",
        updateDateLabel
    );

}


/* ==========================================
   INITIAL DATE LABEL
========================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        updateDateLabel();

    }
);
