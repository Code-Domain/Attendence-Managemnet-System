const API_BASE_URL = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? `http://${window.location.hostname}:5000`
    : "https://attendence-managemnet-system.onrender.com";

async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.message || `Request failed (${response.status})`);
    }
    return payload;
}

function normalizeStudent(student) {
    return {
        ...student,
        student_id: student.sat_id,
        studentIdCode: student.sat_id,
        roll: student.roll_no,
        class: student.branch,
        section: student.semester
    };
}

function normalizeAttendance(record) {
    return {
        ...record,
        date: record.date || record.attendance_date,
        studentId: record.studentId || record.student_id,
        student_id_code: record.student_id_code || record.sat_id,
        roll: record.roll || record.roll_no,
        class: record.class || record.branch,
        section: record.section || record.semester
    };
}

const AttendanceAPI = {
    async getStudents() {
        const result = await apiRequest("/api/students/");
        return result.students.map(normalizeStudent);
    },
    async createStudent(student) {
        return apiRequest("/api/students/", { method: "POST", body: JSON.stringify(student) });
    },
    async updateStudent(id, student) {
        return apiRequest(`/api/students/${id}`, { method: "PUT", body: JSON.stringify(student) });
    },
    async deleteStudent(id) {
        return apiRequest(`/api/students/${id}`, { method: "DELETE" });
    },
    async getByDate(date) {
        const result = await apiRequest(`/api/attendance/date/${encodeURIComponent(date)}`);
        return result.records.map(normalizeAttendance);
    },
    async saveBulk(date, records) {
        return apiRequest("/api/attendance/bulk", {
            method: "POST",
            body: JSON.stringify({ date, attendance: records })
        });
    },
    async deleteDate(date) {
        return apiRequest(`/api/attendance/date/${encodeURIComponent(date)}`, { method: "DELETE" });
    },
    async getRange(from, to) {
        const query = new URLSearchParams({ from, to });
        const result = await apiRequest(`/api/attendance/range?${query}`);
        return result.records.map(normalizeAttendance);
    },
    async getDashboard(date) {
        return apiRequest(`/api/dashboard/summary?date=${encodeURIComponent(date)}`);
    }
};

const PortalAPI = {
    request: apiRequest,
    me: () => apiRequest("/api/auth/me"),
    login: (role, identifier, password) => apiRequest("/api/auth/login", { method: "POST", body: JSON.stringify({ role, identifier, password }) }),
    logout: () => apiRequest("/api/auth/logout", { method: "POST" }),
    changePassword: (current_password, new_password) => apiRequest("/api/auth/change-password", { method: "POST", body: JSON.stringify({ current_password, new_password }) }),
    siteSettings: () => apiRequest("/api/site-settings/"),
    admin: {
        siteSettings: () => apiRequest("/api/site-settings/admin"),
        saveSiteSettings: data => apiRequest("/api/site-settings/admin", { method: "PUT", body: JSON.stringify(data) }),
        summary: () => apiRequest("/api/admin/summary"),
        students: q => apiRequest(`/api/admin/students${q ? `?q=${encodeURIComponent(q)}` : ""}`),
        createStudent: data => apiRequest("/api/admin/students", { method: "POST", body: JSON.stringify(data) }),
        updateStudent: (id, data) => apiRequest(`/api/admin/students/${id}`, { method: "PUT", body: JSON.stringify(data) }),
        deleteStudent: id => apiRequest(`/api/admin/students/${id}`, { method: "DELETE" }),
        teachers: () => apiRequest("/api/admin/teachers"),
        createTeacher: data => apiRequest("/api/admin/teachers", { method: "POST", body: JSON.stringify(data) }),
        updateTeacher: (id, data) => apiRequest(`/api/admin/teachers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
        updateTeacherProfile: (id, data) => apiRequest(`/api/admin/teachers/${id}/profile`, { method: "PUT", body: JSON.stringify(data) }),
        deleteTeacher: id => apiRequest(`/api/admin/teachers/${id}`, { method: "DELETE" }),
        subjects: () => apiRequest("/api/admin/subjects"),
        createSubject: data => apiRequest("/api/admin/subjects", { method: "POST", body: JSON.stringify(data) }),
        updateSubject: (id, data) => apiRequest(`/api/admin/subjects/${id}`, { method: "PUT", body: JSON.stringify(data) }),
        assignTeachers: (id, teacher_ids) => apiRequest(`/api/admin/subjects/${id}/teachers`, { method: "PUT", body: JSON.stringify({ teacher_ids }) }),
        deleteSubject: id => apiRequest(`/api/admin/subjects/${id}`, { method: "DELETE" })
    },
    teacher: {
        subjects: () => apiRequest("/api/teacher/subjects"),
        students: q => apiRequest(`/api/teacher/students${q ? `?q=${encodeURIComponent(q)}` : ""}`),
        studentAttendance: id => apiRequest(`/api/teacher/students/${id}/attendance`),
        subjectStudents: id => apiRequest(`/api/teacher/subjects/${id}/students`),
        subjectAttendance: (id, date) => apiRequest(`/api/teacher/subjects/${id}/attendance?date=${encodeURIComponent(date)}`),
        saveAttendance: data => apiRequest("/api/teacher/attendance", { method: "POST", body: JSON.stringify(data) }),
        report: (subjectId, from, to) => apiRequest(`/api/teacher/reports?${new URLSearchParams({ subject_id: subjectId, from, to })}`),
        schedule: () => apiRequest("/api/teacher/schedule"),
        saveSchedule: schedule => apiRequest("/api/teacher/schedule", { method: "PUT", body: JSON.stringify({ schedule }) })
    }
};

function localISODate() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
