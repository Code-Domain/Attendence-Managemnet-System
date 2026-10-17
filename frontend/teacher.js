const teacher$ = selector => document.querySelector(selector);
const teacherEsc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[char]);
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
let teacherSubjects = [];
let scheduleItems = [];
let reportData = null;
let noticeTimer;

function teacherNotice(text, type="success") {
    const box = teacher$("#teacherMessage"); box.textContent = text; box.className = `message show ${type}`;
    clearTimeout(noticeTimer); noticeTimer = setTimeout(() => box.className = "message", 5000);
}
function teacherView(name) {
    document.querySelectorAll(".view").forEach(view => view.classList.toggle("active", view.id === `view-${name}`));
    document.querySelectorAll(".portal-nav [data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === name));
}
function populateSubjectSelects() {
    const options = teacherSubjects.map(s => `<option value="${s.id}">${teacherEsc(s.name)} · ${teacherEsc(s.branch)} · Sem ${teacherEsc(s.semester)} · ${teacherEsc(s.batch)}</option>`).join("");
    ["#attendanceSubject", "#reportSubject"].forEach(id => { const el = teacher$(id); el.innerHTML = options || '<option value="">No assigned subjects</option>'; });
}
async function startTeacher() {
    try {
        const {user} = await PortalAPI.me();
        if (user.role !== "teacher") return location.replace("admin.html");
        teacher$("#teacherIdentity").textContent = `${user.name} · ${user.username || user.teacher_id || user.email}`;
        if (user.password_change_required) {
            teacherView("security");
            teacherNotice("Set your new password before continuing.", "error");
            return;
        }
        const data = await PortalAPI.teacher.subjects(); teacherSubjects = data.subjects; populateSubjectSelects(); renderScheduleChoices(); renderScheduleGrid();
        const schedule = await PortalAPI.teacher.schedule(); scheduleItems = schedule.schedule.map(row => ({...row,day_of_week:Number(row.day_of_week),start_time:String(row.start_time).slice(0,5),end_time:String(row.end_time).slice(0,5)})); renderScheduleGrid();
        const today = localISODate(); teacher$("#attendanceDate").value = today; teacher$("#reportFrom").value = today; teacher$("#reportTo").value = today;
    } catch (_) { location.replace("teacher-login.html"); }
}
function renderScheduleChoices() {
    const box = teacher$("#scheduleSubjects");
    box.innerHTML = teacherSubjects.map(s => `<div class="draggable-subject" draggable="true" data-subject-id="${s.id}">${teacherEsc(s.name)} · ${teacherEsc(s.branch)} S${teacherEsc(s.semester)}</div>`).join("") || '<span class="muted">No subjects assigned. Ask your administrator to assign subjects.</span>';
}
function timeLabel(hour) { return `${String(hour).padStart(2,"0")}:00`; }
function renderScheduleGrid() {
    const body = teacher$("#scheduleGrid");
    const rows = [];
    for (let hour=8; hour<18; hour++) {
        const cells = DAYS.map((_, index) => {
            const day = index + 1, start = timeLabel(hour);
            const item = scheduleItems.find(s => s.day_of_week === day && s.start_time === start);
            const name = item ? (teacherSubjects.find(s => s.id === Number(item.subject_id))?.name || item.custom_title || "Subject") : "";
            return `<td class="drop-slot" data-day="${day}" data-start="${start}">${item ? `<div class="schedule-block">${teacherEsc(name)}<button type="button" title="Remove" data-remove-slot="${day}:${start}">×</button></div>` : '<span class="muted">Drop here</span>'}</td>`;
        }).join("");
        rows.push(`<tr><th>${timeLabel(hour)}–${timeLabel(hour+1)}</th>${cells}</tr>`);
    }
    body.innerHTML = rows.join("");
}
function addScheduleEntry(day,start,payload) {
    scheduleItems = scheduleItems.filter(item => !(item.day_of_week === day && item.start_time === start));
    scheduleItems.push({day_of_week:day,start_time:start,end_time:timeLabel(Number(start.slice(0,2))+1),subject_id:payload.subject_id || null,custom_title:payload.custom_title || null});
    renderScheduleGrid();
}
function renderStudents(rows) {
    teacher$("#lookupRows").innerHTML = rows.length ? rows.map(s => `<tr><td>${teacherEsc(s.name)}</td><td>${teacherEsc(s.sat_id)}</td><td>${teacherEsc(s.roll_no)}</td><td>${teacherEsc(s.branch)} / ${teacherEsc(s.semester)}</td><td>${teacherEsc(s.batch)}</td><td><button class="btn secondary small" data-history="${s.id}">View attendance</button></td></tr>`).join("") : '<tr><td colspan="6" class="muted">No matching students in your assigned cohorts.</td></tr>';
}
async function loadStudentLookup() {
    try { const {students} = await PortalAPI.teacher.students(teacher$("#studentLookup").value.trim()); renderStudents(students); }
    catch (error) { teacherNotice(error.message,"error"); }
}
function csvCell(value) { return `"${String(value ?? "").replace(/"/g,'""')}"`; }
function downloadCSV(rows, filename) {
    const csv = rows.map(row => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], {type:"text/csv;charset=utf-8"}));
    const link = document.createElement("a"); link.href=url; link.download=filename; link.click(); URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", () => {
    startTeacher();
    document.querySelectorAll(".portal-nav [data-view]").forEach(button => button.addEventListener("click", () => teacherView(button.dataset.view)));
    teacher$("#logoutButton").addEventListener("click", async () => { await PortalAPI.logout(); location.replace("teacher-login.html"); });
    teacher$("#scheduleSubjects").addEventListener("dragstart", event => {
        const source = event.target.closest("[data-subject-id]"); if (!source) return;
        event.dataTransfer.setData("application/json", JSON.stringify({subject_id:Number(source.dataset.subjectId)}));
    });
    teacher$("#addCustomSchedule").addEventListener("click", () => {
        const title = teacher$("#customScheduleTitle").value.trim(); if (!title) return teacherNotice("Enter a label for the custom schedule item.","error");
        const node = document.createElement("div"); node.className="draggable-subject"; node.draggable=true; node.dataset.customTitle=title; node.textContent=`${title} · Custom`;
        teacher$("#scheduleSubjects").appendChild(node); teacher$("#customScheduleTitle").value="";
    });
    teacher$("#scheduleSubjects").addEventListener("dragstart", event => {
        const source = event.target.closest("[data-custom-title]"); if (source) event.dataTransfer.setData("application/json",JSON.stringify({custom_title:source.dataset.customTitle}));
    });
    teacher$("#scheduleGrid").addEventListener("dragover", event => { const cell=event.target.closest(".drop-slot"); if(cell){event.preventDefault();cell.classList.add("drag-over");} });
    teacher$("#scheduleGrid").addEventListener("dragleave", event => event.target.closest(".drop-slot")?.classList.remove("drag-over"));
    teacher$("#scheduleGrid").addEventListener("drop", event => {
        const cell=event.target.closest(".drop-slot"); if(!cell)return; event.preventDefault(); cell.classList.remove("drag-over");
        try { addScheduleEntry(Number(cell.dataset.day),cell.dataset.start,JSON.parse(event.dataTransfer.getData("application/json"))); } catch (_) { teacherNotice("Could not add that schedule block.","error"); }
    });
    teacher$("#scheduleGrid").addEventListener("click", event => { const remove=event.target.closest("[data-remove-slot]"); if(remove){const [day,start]=remove.dataset.removeSlot.split(":");scheduleItems=scheduleItems.filter(item=>!(item.day_of_week===Number(day)&&item.start_time===start));renderScheduleGrid();} });
    teacher$("#saveSchedule").addEventListener("click", async () => {
        try { const result=await PortalAPI.teacher.saveSchedule(scheduleItems); teacherNotice(`Schedule saved (${result.count} blocks).`); }
        catch(error){teacherNotice(error.message,"error");}
    });

    teacher$("#loadClass").addEventListener("click", async () => {
        const id=teacher$("#attendanceSubject").value, date=teacher$("#attendanceDate").value;
        if(!id||!date)return teacherNotice("Choose an assigned subject and class date.","error");
        try {
            const result=await PortalAPI.teacher.subjectAttendance(id,date);
            teacher$("#attendanceMeta").hidden=false;
            const subject=teacherSubjects.find(s=>s.id===Number(id)); teacher$("#attendanceMeta").textContent=`${subject.name} · ${subject.branch} · Semester ${subject.semester} · Batch ${subject.batch} · ${result.students.length} eligible students`;
            teacher$("#attendanceRows").innerHTML=result.students.length?result.students.map(s=>{const selected=result.attendance[String(s.id)];return `<tr><td>${teacherEsc(s.roll_no)}</td><td>${teacherEsc(s.sat_id)}</td><td>${teacherEsc(s.name)}</td><td><div class="radio-choice"><label><input type="radio" name="att-${s.id}" value="Present" ${selected==="Present"?"checked":""}> P</label><label><input type="radio" name="att-${s.id}" value="Absent" ${selected==="Absent"?"checked":""}> A</label></div></td></tr>`;}).join(""):'<tr><td colspan="4" class="muted">No students match this subject cohort and range.</td></tr>';
        } catch(error){teacherNotice(error.message,"error");}
    });
    teacher$("#saveAttendance").addEventListener("click", async () => {
        const id=teacher$("#attendanceSubject").value,date=teacher$("#attendanceDate").value;
        const attendance=[...teacher$("#attendanceRows").querySelectorAll("tr")].flatMap(row=>{const input=row.querySelector("input[type=radio]:checked");return input?[{student_id:Number(input.name.slice(4)),status:input.value}]:[];});
        if(!id||!date)return teacherNotice("Choose a subject and date first.","error");
        if(!attendance.length)return teacherNotice("Mark at least one student before saving.","error");
        try{const result=await PortalAPI.teacher.saveAttendance({subject_id:Number(id),date,attendance});teacherNotice(`Saved attendance for ${result.saved} students.`);}
        catch(error){teacherNotice(error.message,"error");}
    });

    let lookupTimer; teacher$("#studentLookup").addEventListener("input",()=>{clearTimeout(lookupTimer);lookupTimer=setTimeout(loadStudentLookup,250);});
    teacher$("#lookupRows").addEventListener("click",async event=>{
        const button=event.target.closest("[data-history]");if(!button)return;
        try{const result=await PortalAPI.teacher.studentAttendance(button.dataset.history);teacher$("#historyCard").hidden=false;teacher$("#historyTitle").textContent=`Attendance history · ${result.student.name} · ${result.student.roll_no}`;teacher$("#historyRows").innerHTML=result.records.length?result.records.map(r=>`<tr><td>${teacherEsc(String(r.attendance_date).slice(0,10))}</td><td>${teacherEsc(r.subject_name)}</td><td><span class="pill ${r.status==="Present"?"green":"orange"}">${teacherEsc(r.status)}</span></td></tr>`).join(""):'<tr><td colspan="3" class="muted">No attendance records for this student in your assigned subjects.</td></tr>';}
        catch(error){teacherNotice(error.message,"error");}
    });
    teacher$("#generateTeacherReport").addEventListener("click",async()=>{
        const subjectId=teacher$("#reportSubject").value,from=teacher$("#reportFrom").value,to=teacher$("#reportTo").value;
        if(!subjectId||!from||!to)return teacherNotice("Choose a subject and both report dates.","error");
        try{
            reportData=await PortalAPI.teacher.report(subjectId,from,to);
            teacher$("#reportTitle").textContent=`${reportData.subject.name} · ${reportData.from} to ${reportData.to}`;
            teacher$("#reportHead").innerHTML=`<tr><th>Roll no.</th><th>Registration no.</th><th>Student</th>${reportData.dates.map(d=>`<th>${teacherEsc(d)}</th>`).join("")}</tr>`;
            teacher$("#reportRows").innerHTML=reportData.students.length?reportData.students.map(s=>`<tr><td>${teacherEsc(s.roll_no)}</td><td>${teacherEsc(s.sat_id)}</td><td>${teacherEsc(s.name)}</td>${reportData.dates.map(d=>`<td>${s.attendance[d]==="Present"?"P":s.attendance[d]==="Absent"?"A":"—"}</td>`).join("")}</tr>`).join(""):'<tr><td colspan="3" class="muted">No eligible students in this cohort.</td></tr>';
            teacher$("#exportTeacherReport").disabled=false;teacherNotice("Report generated.");
        }catch(error){teacherNotice(error.message,"error");}
    });
    teacher$("#exportTeacherReport").addEventListener("click",()=>{
        if(!reportData)return;
        const rows=[["Student roll number","Registration number","Student name",...reportData.dates]];
        reportData.students.forEach(s=>rows.push([s.roll_no,s.sat_id,s.name,...reportData.dates.map(d=>s.attendance[d]==="Present"?"P":s.attendance[d]==="Absent"?"A":"")]));
        downloadCSV(rows,`attendance-${reportData.subject.name.replace(/[^a-z0-9]+/gi,"-").toLowerCase()}-${reportData.from}-to-${reportData.to}.csv`);
    });
    teacher$("#passwordForm").addEventListener("submit",async event=>{
        event.preventDefault();if(teacher$("#newPassword").value!==teacher$("#confirmPassword").value)return teacherNotice("The new passwords do not match.","error");
        try{await PortalAPI.changePassword(teacher$("#currentPassword").value,teacher$("#newPassword").value);event.target.reset();teacherNotice("Password changed.");location.reload();}catch(error){teacherNotice(error.message,"error");}
    });
});
