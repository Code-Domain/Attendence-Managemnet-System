/* ==========================================
   students.js
   Student Attendance Reporting System
========================================== */

let students = [];
let editStudentId = null;


/* ==========================================
   PAGE INITIALIZATION
========================================== */

document.addEventListener("DOMContentLoaded", async function () {

    console.log("Students page loaded");

    try {
        students = await AttendanceAPI.getStudents();
    } catch (error) {
        alert(`Could not load students: ${error.message}`);
        students = [];
    }

    renderStudents();

    updateStatistics();

    setupStudentForm();

    setupStudentSearch();

});


/* ==========================================
   LOAD STUDENTS
========================================== */

function loadStudents() {
    return AttendanceAPI.getStudents().then(function (items) {
        students = items;
        renderStudents();
        updateStatistics();
    }).catch(function (error) {
        alert(`Could not load students: ${error.message}`);
    });
}


/* ==========================================
   DISPLAY STUDENTS
========================================== */

function renderStudents(list = students) {

    const table =
        document.getElementById("studentTable");

    if (!table) {

        console.error(
            "studentTable element not found."
        );

        return;

    }


    table.innerHTML = "";


    if (list.length === 0) {

        table.innerHTML = `

            <tr>

                <td colspan="7"
                    style="text-align:center;">

                    No students added yet.

                </td>

            </tr>

        `;

        return;

    }


    list.forEach(function (student, index) {

        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>
                ${index + 1}
            </td>

            <td>
                ${escapeHTML(student.name)}
            </td>

            <td>
                ${escapeHTML(student.student_id)}
            </td>

            <td>
                ${escapeHTML(student.roll)}
            </td>

            <td>
                ${escapeHTML(student.branch)}
            </td>

            <td>${escapeHTML(student.semester)}</td>

            <td>

                <button
                    class="btn-primary"
                    onclick="editStudent(${student.id})">

                    <i class="fas fa-edit"></i>

                </button>

                <button
                    class="btn-secondary"
                    onclick="deleteStudent(${student.id})">

                    <i class="fas fa-trash"></i>

                </button>

            </td>

        `;


        table.appendChild(row);

    });

}


/* ==========================================
   SETUP STUDENT FORM
========================================== */

function setupStudentForm() {

    const form =
        document.getElementById("studentForm");


    if (!form) {

        console.error(
            "studentForm element not found."
        );

        return;

    }


    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            await saveStudent();

        }
    );

    form.addEventListener("reset", function () {
        editStudentId = null;
        const submitButton = form.querySelector("button[type='submit']");
        if (submitButton) submitButton.innerHTML = '<i class="fas fa-plus-circle"></i><span>Add Student</span><i class="fas fa-arrow-right arrow-icon"></i>';
    });

}


/* ==========================================
   ADD / UPDATE STUDENT
========================================== */

async function saveStudent() {

    const name =
        document
            .getElementById("studentName")
            .value
            .trim();


    const roll =
        document
            .getElementById("rollNo")
            .value
            .trim();


    const branch =
        document
            .getElementById("branch")
            .value
            .trim();


    const semester =
        document
            .getElementById("semester")
            .value
            .trim();


    /* ======================================
       VALIDATION
    ====================================== */

    if (!name) {

        alert("Please enter student name.");

        return;

    }


    if (!roll) {

        alert("Please enter roll number.");

        return;

    }

    if (!document.getElementById("satId").value.trim()) {
        alert("Please enter the student ID.");
        return;
    }

    if (!semester) {
        alert("Please select a semester.");
        return;
    }


    if (!branch) {

        alert("Please select a branch.");

        return;

    }


    /* ======================================
       DUPLICATE ROLL NUMBER
    ====================================== */

    const duplicate =
        students.find(function (student) {

            return (
                String(student.roll_no)
                    .toLowerCase() ===
                roll.toLowerCase()
                &&
                student.id !== editStudentId
            );

        });


    if (duplicate) {

        alert(
            "This roll number already exists."
        );

        return;

    }


    const studentData = {

        name: name,

        sat_id: document.getElementById("satId").value.trim(),

        roll_no: roll,

        branch: branch,

        semester: semester

    };


    /* ======================================
       UPDATE
    ====================================== */

    try {
    if (editStudentId !== null) {

        await AttendanceAPI.updateStudent(
            editStudentId,
            studentData
        );


        alert(
            "Student updated successfully."
        );


        editStudentId = null;

    }


    /* ======================================
       ADD
    ====================================== */

    else {

        await AttendanceAPI.createStudent(
            studentData
        );


        alert(
            "Student added successfully."
        );

    }
    } catch (error) {
        alert(`Could not save student: ${error.message}`);
        return;
    }


    /* ======================================
       RESET FORM
    ====================================== */

    document
        .getElementById("studentForm")
        .reset();


    const submitButton =
        document.querySelector(
            "#studentForm button[type='submit']"
        );


    if (submitButton) {

        submitButton.innerHTML = `

            <i class="fas fa-plus"></i>

            Add Student

        `;

    }


    /* ======================================
       RELOAD DATA
    ====================================== */

    students = await AttendanceAPI.getStudents();


    renderStudents();

    updateStatistics();

}


/* ==========================================
   EDIT STUDENT
========================================== */

function editStudent(id) {

    const student =
        students.find(function (item) {

            return String(item.id) ===
                String(id);

        });


    if (!student) {

        alert("Student not found.");

        return;

    }


    editStudentId = student.id;


    document.getElementById(
        "studentName"
    ).value = student.name;


    document.getElementById(
        "rollNo"
    ).value = student.roll;


    document.getElementById("branch").value = student.branch;


    document.getElementById("semester").value = student.semester;

    document.getElementById("satId").value = student.student_id || "";


    const button =
        document.querySelector(
            "#studentForm button[type='submit']"
        );


    if (button) {

        button.innerHTML = `

            <i class="fas fa-save"></i>

            Update Student

        `;

    }


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


/* ==========================================
   DELETE STUDENT
========================================== */

async function deleteStudent(id) {

    const student =
        students.find(function (item) {

            return String(item.id) ===
                String(id);

        });


    if (!student) return;


    const confirmed =
        confirm(
            `Delete ${student.name}?`
        );


    if (!confirmed) return;


    try {
        await AttendanceAPI.deleteStudent(id);
    } catch (error) {
        alert(`Could not delete student: ${error.message}`);
        return;
    }


    students = await AttendanceAPI.getStudents();


    renderStudents();

    updateStatistics();


    alert(
        "Student deleted successfully."
    );

}


/* ==========================================
   SEARCH STUDENTS
========================================== */

function setupStudentSearch() {

    const search =
        document.getElementById(
            "searchStudent"
        );


    if (!search) return;


    search.addEventListener(
        "input",
        function () {

            const keyword =
                this.value
                    .toLowerCase()
                    .trim();


            const filtered =
                students.filter(
                    function (student) {

                        return (

                            String(student.name)
                                .toLowerCase()
                                .includes(keyword)

                            ||

                            String(student.roll_no)
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

                    }
                );


            renderStudents(filtered);

        }
    );

}


/* ==========================================
   UPDATE STATISTICS
========================================== */

function updateStatistics() {

    const total =
        students.length;


    const totalElement =
        document.getElementById(
            "totalStudents"
        );


    const activeElement =
        document.getElementById(
            "activeStudents"
        );


    const newElement =
        document.getElementById(
            "newStudents"
        );


    if (totalElement) {

        totalElement.textContent =
            total;

    }


    if (activeElement) {

        activeElement.textContent =
            total;

    }


    if (newElement) {

        newElement.textContent =
            total;

    }

}


/* ==========================================
   HTML SECURITY
========================================== */

function escapeHTML(value) {

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
