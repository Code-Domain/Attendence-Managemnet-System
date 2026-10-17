document.addEventListener("DOMContentLoaded", async () => {
    try {
        const {settings} = await PortalAPI.siteSettings();
        const primary = /^#[0-9a-f]{6}$/i.test(settings.primary_color) ? settings.primary_color : "#4f46e5";
        const accent = /^#[0-9a-f]{6}$/i.test(settings.accent_color) ? settings.accent_color : "#10b981";
        document.documentElement.style.setProperty("--primary", primary);
        document.documentElement.style.setProperty("--secondary", accent);
        document.documentElement.style.setProperty("--accent", accent);
        document.documentElement.style.setProperty("--blue", primary);
        document.documentElement.style.setProperty("--blue-dark", primary);
        document.documentElement.style.setProperty("--teal", accent);
        const themeStyle = document.createElement("style");
        themeStyle.textContent = `.login-visual{background:linear-gradient(145deg,${primary},${primary} 65%,${accent})}`;
        document.head.append(themeStyle);
        document.querySelectorAll("[data-site-name]").forEach(brand => brand.textContent = settings.site_name);
        const brand = document.querySelector(".navbar .logo h2");
        if (brand) brand.textContent = settings.site_name;
        const title = document.querySelector(".hero-left h1");
        if (title) title.textContent = settings.home_title;
        const tagline = document.querySelector(".hero-left > p");
        if (tagline) tagline.textContent = settings.home_tagline;
        document.querySelectorAll("[data-home-title]").forEach(node => node.textContent = settings.home_title);
        document.querySelectorAll("[data-home-tagline]").forEach(node => node.textContent = settings.home_tagline);
        const portalBrand = document.querySelector(".portal-top .brand");
        if (portalBrand) portalBrand.setAttribute("aria-label", settings.site_name);
        document.title = `${settings.site_name} | Attendance management`;
    } catch (error) {
        console.warn("Public website settings could not be loaded.", error);
    }
});
