document.addEventListener("DOMContentLoaded", () => {
    const path = location.pathname.split("/").pop() || "index.html";
    const publicPages = new Set(["index.html", "features.html", "about.html", "contact.html", "admin-login.html", "teacher-login.html"]);

    if (publicPages.has(path)) {
        const activePage = path === "admin-login.html" ? "admin-login" : path === "teacher-login.html" ? "teacher-login" : path.replace(".html", "");
        const oldHeader = document.querySelector("header");
        const header = oldHeader || document.createElement("header");
        header.className = "site-nav";
        header.innerHTML = `
            <a class="site-brand" href="index.html" aria-label="Student Attendance home">
                <i class="fa-solid fa-graduation-cap" aria-hidden="true"></i>
                <span data-site-name>Student Attendance</span>
            </a>
            <button class="site-menu-toggle" type="button" aria-controls="siteNavigation" aria-expanded="false" aria-label="Open navigation">
                <i class="fa-solid fa-bars" aria-hidden="true"></i><span>Menu</span>
            </button>
            <div class="site-menu-panel" id="siteNavigation">
                <nav class="site-links" aria-label="Main navigation">
                    <a href="index.html" ${activePage === "index" ? 'aria-current="page"' : ""}>Home</a>
                    <a href="features.html" ${activePage === "features" ? 'aria-current="page"' : ""}>Features</a>
                    <a href="about.html" ${activePage === "about" ? 'aria-current="page"' : ""}>About</a>
                    <a href="contact.html" ${activePage === "contact" ? 'aria-current="page"' : ""}>Contact</a>
                </nav>
                <div class="site-nav-actions">
                    <button class="site-theme-toggle" id="themeBtn" type="button" aria-label="Toggle color theme" title="Toggle color theme"><i class="fa-solid fa-moon" aria-hidden="true"></i></button>
                    <a class="site-login site-admin-link" href="admin-login.html" ${activePage === "admin-login" ? 'aria-current="page"' : ""}>Admin sign in</a>
                    <a class="site-login" href="teacher-login.html" ${activePage === "teacher-login" ? 'aria-current="page"' : ""}>Teacher sign in</a>
                </div>
            </div>`;
        if (oldHeader) oldHeader.replaceWith(header);
        else document.body.prepend(header);

        const toggle = header.querySelector(".site-menu-toggle");
        const closeMenu = () => {
            header.classList.remove("menu-open");
            toggle.setAttribute("aria-expanded", "false");
            toggle.setAttribute("aria-label", "Open navigation");
            toggle.querySelector("i").className = "fa-solid fa-bars";
        };
        toggle.addEventListener("click", () => {
            const open = header.classList.toggle("menu-open");
            toggle.setAttribute("aria-expanded", String(open));
            toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
            toggle.querySelector("i").className = open ? "fa-solid fa-xmark" : "fa-solid fa-bars";
        });
        header.querySelectorAll(".site-menu-panel a").forEach(link => link.addEventListener("click", closeMenu));
        document.addEventListener("click", event => { if (!header.contains(event.target)) closeMenu(); });
        document.addEventListener("keydown", event => { if (event.key === "Escape") closeMenu(); });
        const savedTheme = localStorage.getItem("sars-theme");
        if (savedTheme === "dark") document.body.classList.add("dark");
        const themeButton = header.querySelector("#themeBtn");
        const updateThemeIcon = () => { themeButton.innerHTML = document.body.classList.contains("dark") ? '<i class="fa-solid fa-sun" aria-hidden="true"></i>' : '<i class="fa-solid fa-moon" aria-hidden="true"></i>'; };
        updateThemeIcon();
        themeButton.addEventListener("click", () => {
            document.body.classList.toggle("dark");
            localStorage.setItem("sars-theme", document.body.classList.contains("dark") ? "dark" : "light");
            updateThemeIcon();
        });
    }

    document.querySelectorAll("footer").forEach(footer => footer.remove());
    const footer = document.createElement("footer");
    footer.className = "shared-footer";
    footer.innerHTML = `
        <div class="shared-footer-inner">
            <div class="shared-footer-brand">
                <a class="shared-brand" href="index.html"><i class="fa-solid fa-graduation-cap" aria-hidden="true"></i><span data-site-name>Student Attendance</span></a>
                <p>Organization attendance, student records and class reports in one shared workspace.</p>
            </div>
            <div class="shared-footer-group"><h2>Explore</h2><a href="index.html">Home</a><a href="features.html">Features</a><a href="about.html">About</a><a href="contact.html">Contact</a></div>
            <div class="shared-footer-group"><h2>Workspaces</h2><a href="admin-login.html">Administrator sign in</a><a href="teacher-login.html">Teacher sign in</a></div>
        </div>
        <div class="shared-footer-bottom">© ${new Date().getFullYear()} <span data-site-name>Student Attendance</span></div>`;
    document.body.append(footer);

    if (window.PortalAPI?.siteSettings) {
        window.PortalAPI.siteSettings().then(({ settings }) => {
            if (settings?.site_name) {
                document.querySelectorAll("[data-site-name]").forEach(node => {
                    node.textContent = settings.site_name;
                });
            }
        }).catch(() => {});
    }

    if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        document.documentElement.classList.add("motion-ready");
        const targets = document.querySelectorAll([
            ".hero", "main > section", ".site-wrap > section", ".site-card", ".feature-card",
            ".stat-card", ".testimonial-card", ".setup-card", ".card", ".schedule-card",
            ".contact-card", ".detail-callout", ".teacher-stat", ".admin-note", ".login-card"
        ].join(","));
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: "0px 0px -24px 0px" });
        targets.forEach((target, index) => {
            target.classList.add("reveal-on-scroll");
            target.style.setProperty("--reveal-delay", `${(index % 5) * 55}ms`);
            observer.observe(target);
        });
    }
});
