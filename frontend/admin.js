const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[char]);
let adminTeachers = [];
let adminSubjects = [];
let adminStudents = [];
let messageTimer;

function showAdminMessage(text, type = "success") {
    const box = $("#adminMessage");
    box.textContent = text;
    box.className = `message show ${type}`;
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => box.className = "message", 5000);
}

function setView(name) {
    document.querySelectorAll(".view").forEach(view => view.classList.toggle("active", view.id === `view-${name}`));
    document.querySelectorAll(".portal-nav [data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === name));
    if (name === "students") loadStudents();
    if (name === "subjects") loadSubjects();
    if (name === "teachers") loadTeachers();
    if (name === "appearance") loadSiteSettings();
}

<<<<<<< HEAD
function updateOverviewProgress(summary) {
    $("#setupStudents").textContent = Number(summary.students) > 0 ? "Directory is ready" : "Add your first students";
    $("#setupSubjects").textContent = Number(summary.subjects) > 0 ? "Subjects are configured" : "Create your first subject";
    $("#setupTeachers").textContent = Number(summary.teachers) > 0 ? "Teaching team is in place" : "Add your teaching team";
}

=======
>>>>>>> origin/main
async function loadSiteSettings() {
    try {
        const {settings} = await PortalAPI.admin.siteSettings();
        $("#siteName").value = settings.site_name;
        $("#homeTitle").value = settings.home_title;
        $("#homeTagline").value = settings.home_tagline;
        $("#primaryColor").value = settings.primary_color;
        $("#accentColor").value = settings.accent_color;
    } catch (error) { showAdminMessage(error.message, "error"); }
}

async function loadAdmin() {
    try {
        const {user} = await PortalAPI.me();
        if (user.role !== "admin") return location.replace("teacher.html");
        $("#adminIdentity").textContent = `${user.name} · ${user.username || user.email || "Administrator"}`;
        if (user.password_change_required) {
            setView("security");
            showAdminMessage("Set a new password to finish securing your account.", "error");
            return;
        }
        setView("overview");
        const summary = await PortalAPI.admin.summary();
        $("#statStudents").textContent = summary.students;
        $("#statSubjects").textContent = summary.subjects;
        $("#statTeachers").textContent = summary.teachers;
<<<<<<< HEAD
        updateOverviewProgress(summary);
=======
>>>>>>> origin/main
        await Promise.all([loadStudents(), loadTeachers(), loadSubjects()]);
    } catch (_) { location.replace("admin-login.html"); }
}

async function loadStudents(q = "") {
    try {
        const result = await PortalAPI.admin.students(q);
        adminStudents = result.students;
        $("#studentsRows").innerHTML = adminStudents.length ? adminStudents.map(student => `<tr><td>${esc(student.name)}</td><td>${esc(student.sat_id)}</td><td>${esc(student.roll_no)}</td><td>${esc(student.branch)}</td><td>${esc(student.semester)}</td><td>${esc(student.batch)}</td><td><button class="btn secondary small" data-edit-student="${student.id}">Edit</button> <button class="btn danger small" data-delete-student="${student.id}">Delete</button></td></tr>`).join("") : '<tr><td colspan="7" class="muted">No students have been added.</td></tr>';
    } catch (error) { showAdminMessage(error.message, "error"); }
}

async function loadTeachers() {
    try {
        const result = await PortalAPI.admin.teachers();
        adminTeachers = result.teachers;
        $("#teachersRows").innerHTML = adminTeachers.length ? adminTeachers.map(teacher => `<tr><td><strong>${esc(teacher.name)}</strong><br><span class="muted">${esc(teacher.teacher_id)}</span></td><td>${esc(teacher.email)}</td><td>${esc(teacher.phone)}</td><td>${teacher.subject_count}</td><td><span class="pill ${teacher.active ? "green" : "orange"}">${teacher.active ? "Active" : "Paused"}</span></td><td><button class="btn secondary small" data-edit-teacher="${teacher.id}">Edit</button> <button class="btn secondary small" data-reset-teacher="${teacher.id}">Set password</button> <button class="btn ${teacher.active ? "danger" : "secondary"} small" data-toggle-teacher="${teacher.id}" data-active="${teacher.active ? 1 : 0}">${teacher.active ? "Pause" : "Activate"}</button> <button class="btn danger small" data-delete-teacher="${teacher.id}">Delete</button></td></tr>`).join("") : '<tr><td colspan="6" class="muted">No teacher accounts yet.</td></tr>';
        $("#teacherChecks").innerHTML = adminTeachers.filter(t => t.active).map(teacher => `<label class="teacher-check"><input type="checkbox" name="assignedTeacher" value="${teacher.id}"> ${esc(teacher.name)} <span class="muted">${esc(teacher.teacher_id)}</span></label>`).join("") || '<span class="muted">Create active teacher accounts before assigning subjects.</span>';
    } catch (error) { showAdminMessage(error.message, "error"); }
}

async function loadSubjects() {
    try {
        const result = await PortalAPI.admin.subjects();
        adminSubjects = result.subjects;
        $("#subjectsRows").innerHTML = adminSubjects.length ? adminSubjects.map(subject => {
            const range = subject.range_mode === "full" ? "Full cohort" : `Roll ${String(subject.roll_start).padStart(2,"0")}–${String(subject.roll_end).padStart(2,"0")}`;
            return `<tr><td><strong>${esc(subject.name)}</strong></td><td>${esc(subject.branch)} · Sem ${esc(subject.semester)} · ${esc(subject.batch)}</td><td>${range}</td><td>${subject.teachers.map(t => esc(t.name)).join(", ") || '<span class="muted">Unassigned</span>'}</td><td><button class="btn secondary small" data-edit-subject="${subject.id}">Edit</button> <button class="btn secondary small" data-assign-subject="${subject.id}">Teachers</button> <button class="btn danger small" data-delete-subject="${subject.id}">Delete</button></td></tr>`;
        }).join("") : '<tr><td colspan="5" class="muted">No subjects have been created.</td></tr>';
    } catch (error) { showAdminMessage(error.message, "error"); }
}

document.addEventListener("DOMContentLoaded", () => {
    loadAdmin();
    document.querySelectorAll(".portal-nav [data-view], [data-go]").forEach(button => button.addEventListener("click", () => setView(button.dataset.view || button.dataset.go)));
    $("#logoutButton").addEventListener("click", async () => { await PortalAPI.logout(); location.replace("admin-login.html"); });
    $("#rangeMode").addEventListener("change", event => document.querySelectorAll(".custom-range").forEach(el => el.hidden = event.target.value !== "custom"));

    $("#studentForm").addEventListener("submit", async event => {
        event.preventDefault();
        const id = $("#studentRowId").value;
        const data = {name:$("#studentName").value,registration_no:$("#registrationNo").value,roll_no:$("#rollNo").value,branch:$("#studentBranch").value,semester:$("#studentSemester").value,batch:$("#studentBatch").value};
        try {
            if (id) await PortalAPI.admin.updateStudent(id, data); else await PortalAPI.admin.createStudent(data);
            event.target.reset(); $("#studentRowId").value = ""; $("#studentFormTitle").textContent = "Add a student"; $("#saveStudentButton").textContent = "Save student"; $("#cancelStudentEdit").hidden = true;
<<<<<<< HEAD
            showAdminMessage(id ? "Student updated." : "Student added."); await loadStudents(); const s = await PortalAPI.admin.summary(); $("#statStudents").textContent = s.students; updateOverviewProgress(s);
=======
            showAdminMessage(id ? "Student updated." : "Student added."); await loadStudents(); const s = await PortalAPI.admin.summary(); $("#statStudents").textContent = s.students;
>>>>>>> origin/main
        } catch (error) { showAdminMessage(error.message, "error"); }
    });
    $("#cancelStudentEdit").addEventListener("click", () => { $("#studentForm").reset(); $("#studentRowId").value = ""; $("#studentFormTitle").textContent = "Add a student"; $("#saveStudentButton").textContent = "Save student"; $("#cancelStudentEdit").hidden = true; });
    $("#studentSearch").addEventListener("input", event => loadStudents(event.target.value.trim()));
    $("#studentsRows").addEventListener("click", async event => {
        const edit = event.target.closest("[data-edit-student]");
        const remove = event.target.closest("[data-delete-student]");
        if (edit) {
            const student = adminStudents.find(item => item.id === Number(edit.dataset.editStudent));
            if (!student) return;
            $("#studentRowId").value = student.id; $("#studentName").value = student.name; $("#registrationNo").value = student.sat_id; $("#rollNo").value = student.roll_no; $("#studentBranch").value = student.branch; $("#studentSemester").value = student.semester; $("#studentBatch").value = student.batch || "";
            $("#studentFormTitle").textContent = "Edit student"; $("#saveStudentButton").textContent = "Save changes"; $("#cancelStudentEdit").hidden = false; window.scrollTo({top:0,behavior:"smooth"});
        }
        if (remove && confirm("Delete this student and their attendance history?")) {
<<<<<<< HEAD
            try { await PortalAPI.admin.deleteStudent(remove.dataset.deleteStudent); await loadStudents(); const s = await PortalAPI.admin.summary(); $("#statStudents").textContent = s.students; updateOverviewProgress(s); showAdminMessage("Student deleted."); }
=======
            try { await PortalAPI.admin.deleteStudent(remove.dataset.deleteStudent); await loadStudents(); const s = await PortalAPI.admin.summary(); $("#statStudents").textContent = s.students; showAdminMessage("Student deleted."); }
>>>>>>> origin/main
            catch (error) { showAdminMessage(error.message, "error"); }
        }
    });

    $("#teacherForm").addEventListener("submit", async event => {
        event.preventDefault();
        const data = {name:$("#teacherName").value,teacher_id:$("#teacherId").value,phone:$("#teacherPhone").value,email:$("#teacherEmail").value,password:$("#teacherPassword").value};
<<<<<<< HEAD
        try { await PortalAPI.admin.createTeacher(data); event.target.reset(); showAdminMessage("Teacher account created."); await loadTeachers(); const s = await PortalAPI.admin.summary(); $("#statTeachers").textContent = s.teachers; updateOverviewProgress(s); }
        catch (error) { showAdminMessage(error.message, "error"); }
    });
    document.querySelectorAll("[data-close-dialog]").forEach(button => button.addEventListener("click", () => document.getElementById(button.dataset.closeDialog).close()));
    $("#teacherEditForm").addEventListener("submit", async event => {
        event.preventDefault();
        const id = $("#editTeacherRowId").value;
        const data = {name:$("#editTeacherName").value.trim(),teacher_id:$("#editTeacherId").value.trim(),phone:$("#editTeacherPhone").value.trim(),email:$("#editTeacherEmail").value.trim()};
        try {
            await PortalAPI.admin.updateTeacherProfile(id, data);
            $("#teacherEditDialog").close(); event.target.reset();
            await loadTeachers(); showAdminMessage("Teacher profile updated.");
        } catch (error) { showAdminMessage(error.message, "error"); }
    });
    $("#resetTeacherPasswordForm").addEventListener("submit", async event => {
        event.preventDefault();
        const id = $("#resetTeacherRowId").value;
        const password = $("#resetTeacherPassword").value;
        if (password !== $("#confirmTeacherPassword").value) return showAdminMessage("The passwords do not match.", "error");
        try {
            await PortalAPI.admin.updateTeacher(id, {password});
            $("#resetTeacherPasswordDialog").close(); event.target.reset();
            showAdminMessage("Teacher password updated.");
        } catch (error) { showAdminMessage(error.message, "error"); }
    });
=======
        try { await PortalAPI.admin.createTeacher(data); event.target.reset(); showAdminMessage("Teacher account created."); await loadTeachers(); const s = await PortalAPI.admin.summary(); $("#statTeachers").textContent = s.teachers; }
        catch (error) { showAdminMessage(error.message, "error"); }
    });
>>>>>>> origin/main
    $("#teachersRows").addEventListener("click", async event => {
        const reset = event.target.closest("[data-reset-teacher]");
        const toggle = event.target.closest("[data-toggle-teacher]");
        const edit = event.target.closest("[data-edit-teacher]");
        const remove = event.target.closest("[data-delete-teacher]");
        try {
            if (edit) {
                const teacher = adminTeachers.find(item => item.id === Number(edit.dataset.editTeacher));
<<<<<<< HEAD
                if (!teacher) return;
                $("#editTeacherRowId").value = teacher.id; $("#editTeacherName").value = teacher.name;
                $("#editTeacherId").value = teacher.teacher_id; $("#editTeacherPhone").value = teacher.phone;
                $("#editTeacherEmail").value = teacher.email; $("#teacherEditDialog").showModal();
                return;
            }
            if (reset) {
                $("#resetTeacherRowId").value = reset.dataset.resetTeacher;
                $("#resetTeacherPasswordForm").reset(); $("#resetTeacherPasswordDialog").showModal();
                return;
            }
=======
                const name = prompt("Teacher name:", teacher.name); if (name === null) return;
                const teacher_id = prompt("Teacher ID / username:", teacher.teacher_id); if (teacher_id === null) return;
                const phone = prompt("Phone number:", teacher.phone); if (phone === null) return;
                const email = prompt("Email address:", teacher.email); if (email === null) return;
                await PortalAPI.admin.updateTeacherProfile(teacher.id, {name, teacher_id, phone, email});
                showAdminMessage("Teacher profile updated.");
            }
            if (reset) { const password = prompt("Enter a new temporary password (minimum 10 characters):"); if (password === null) return; await PortalAPI.admin.updateTeacher(reset.dataset.resetTeacher, {password}); showAdminMessage("Teacher password updated."); }
>>>>>>> origin/main
            if (toggle) { await PortalAPI.admin.updateTeacher(toggle.dataset.toggleTeacher, {active:toggle.dataset.active !== "1"}); showAdminMessage("Teacher access updated."); }
            if (remove) {
                if (!confirm("Permanently remove this teacher account? Attendance history remains, but subject assignments and schedule are removed.")) return;
                await PortalAPI.admin.deleteTeacher(remove.dataset.deleteTeacher);
                showAdminMessage("Teacher account removed.");
            }
            await loadTeachers(); await loadSubjects();
        } catch (error) { showAdminMessage(error.message, "error"); }
    });
    $("#subjectForm").addEventListener("submit", async event => {
        event.preventDefault();
        const data = {name:$("#subjectName").value,branch:$("#subjectBranch").value,semester:$("#subjectSemester").value,batch:$("#subjectBatch").value,range_mode:$("#rangeMode").value,roll_start:$("#rollStart").value,roll_end:$("#rollEnd").value,teacher_ids:[...document.querySelectorAll("[name=assignedTeacher]:checked")].map(input => Number(input.value))};
        const id = $("#subjectRowId").value;
<<<<<<< HEAD
        try { if (id) await PortalAPI.admin.updateSubject(id, data); else await PortalAPI.admin.createSubject(data); event.target.reset(); $("#subjectRowId").value = ""; $("#subjectFormTitle").textContent = "Create a subject"; $("#saveSubjectButton").textContent = "Create subject & assignments"; $("#cancelSubjectEdit").hidden = true; document.querySelectorAll(".custom-range").forEach(el => el.hidden = true); showAdminMessage(id ? "Subject updated." : "Subject and teacher assignments saved."); await loadSubjects(); const s = await PortalAPI.admin.summary(); $("#statSubjects").textContent = s.subjects; updateOverviewProgress(s); }
=======
        try { if (id) await PortalAPI.admin.updateSubject(id, data); else await PortalAPI.admin.createSubject(data); event.target.reset(); $("#subjectRowId").value = ""; $("#subjectFormTitle").textContent = "Create a subject"; $("#saveSubjectButton").textContent = "Create subject & assignments"; $("#cancelSubjectEdit").hidden = true; document.querySelectorAll(".custom-range").forEach(el => el.hidden = true); showAdminMessage(id ? "Subject updated." : "Subject and teacher assignments saved."); await loadSubjects(); const s = await PortalAPI.admin.summary(); $("#statSubjects").textContent = s.subjects; }
>>>>>>> origin/main
        catch (error) { showAdminMessage(error.message, "error"); }
    });
    $("#subjectsRows").addEventListener("click", async event => {
        const assign = event.target.closest("[data-assign-subject]");
        const edit = event.target.closest("[data-edit-subject]");
        const remove = event.target.closest("[data-delete-subject]");
        if (edit) {
            const subject = adminSubjects.find(item => item.id === Number(edit.dataset.editSubject)); if (!subject) return;
            $("#subjectRowId").value = subject.id; $("#subjectName").value = subject.name; $("#subjectBranch").value = subject.branch; $("#subjectSemester").value = subject.semester; $("#subjectBatch").value = subject.batch; $("#rangeMode").value = subject.range_mode; $("#rollStart").value = subject.roll_start ?? ""; $("#rollEnd").value = subject.roll_end ?? "";
            document.querySelectorAll(".custom-range").forEach(el => el.hidden = subject.range_mode !== "custom");
            document.querySelectorAll("[name=assignedTeacher]").forEach(input => input.checked = subject.teachers.some(t => t.id === Number(input.value)));
            $("#subjectFormTitle").textContent = "Edit subject"; $("#saveSubjectButton").textContent = "Save subject changes"; $("#cancelSubjectEdit").hidden = false; window.scrollTo({top:0,behavior:"smooth"}); return;
        }
        if (assign) {
            const subject = adminSubjects.find(item => item.id === Number(assign.dataset.assignSubject));
            if (!subject) return;
            $("#assignmentTitle").textContent = `Teachers · ${subject.name}`;
            $("#assignmentTeacherChecks").innerHTML = adminTeachers.filter(t => t.active).map(teacher => `<label class="teacher-check"><input type="checkbox" name="reassignedTeacher" value="${teacher.id}" ${subject.teachers.some(item => item.id === teacher.id) ? "checked" : ""}> ${esc(teacher.name)} <span class="muted">${esc(teacher.teacher_id)}</span></label>`).join("") || '<span class="muted">No active teacher accounts available.</span>';
            $("#saveAssignments").dataset.subjectId = subject.id;
            $("#assignmentDialog").showModal();
            return;
        }
        if (!remove || !confirm("Delete this subject? Existing attendance for it will be kept without a subject link.")) return;
<<<<<<< HEAD
        try { await PortalAPI.admin.deleteSubject(remove.dataset.deleteSubject); await loadSubjects(); const s = await PortalAPI.admin.summary(); $("#statSubjects").textContent = s.subjects; updateOverviewProgress(s); showAdminMessage("Subject deleted."); }
=======
        try { await PortalAPI.admin.deleteSubject(remove.dataset.deleteSubject); await loadSubjects(); const s = await PortalAPI.admin.summary(); $("#statSubjects").textContent = s.subjects; showAdminMessage("Subject deleted."); }
>>>>>>> origin/main
        catch (error) { showAdminMessage(error.message, "error"); }
    });
    $("#cancelSubjectEdit").addEventListener("click", () => { $("#subjectForm").reset(); $("#subjectRowId").value = ""; $("#subjectFormTitle").textContent = "Create a subject"; $("#saveSubjectButton").textContent = "Create subject & assignments"; $("#cancelSubjectEdit").hidden = true; document.querySelectorAll(".custom-range").forEach(el => el.hidden = true); });
    $("#saveAssignments").addEventListener("click", async event => {
        const id = event.currentTarget.dataset.subjectId;
        const teacherIds = [...document.querySelectorAll("[name=reassignedTeacher]:checked")].map(input => Number(input.value));
        try { await PortalAPI.admin.assignTeachers(id, teacherIds); $("#assignmentDialog").close(); await loadSubjects(); showAdminMessage("Teacher assignments updated."); }
        catch (error) { showAdminMessage(error.message, "error"); }
    });
    $("#passwordForm").addEventListener("submit", async event => {
        event.preventDefault();
        if ($("#newPassword").value !== $("#confirmPassword").value) return showAdminMessage("The new passwords do not match.", "error");
        try { await PortalAPI.changePassword($("#currentPassword").value, $("#newPassword").value); event.target.reset(); showAdminMessage("Your password has been changed."); if (new URLSearchParams(location.search).has("first")) location.replace("admin.html"); else { await loadAdmin(); setView("overview"); } }
        catch (error) { showAdminMessage(error.message, "error"); }
    });
    $("#siteSettingsForm").addEventListener("submit", async event => {
        event.preventDefault();
        const settings = {site_name:$("#siteName").value.trim(),home_title:$("#homeTitle").value.trim(),home_tagline:$("#homeTagline").value.trim(),primary_color:$("#primaryColor").value,accent_color:$("#accentColor").value};
        try { await PortalAPI.admin.saveSiteSettings(settings); showAdminMessage("Website wording and colors saved."); }
        catch (error) { showAdminMessage(error.message, "error"); }
    });
});
