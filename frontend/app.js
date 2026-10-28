document.addEventListener("DOMContentLoaded", () => {
    const contactForm = document.querySelector(".contact-form form");

    if (contactForm) {
        contactForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            // Use FormData or querySelector by name attribute for robust field selection
            const formData = {
                name: contactForm.querySelector('[name="name"]')?.value || contactForm.querySelectorAll("input, textarea")[0]?.value,
                email: contactForm.querySelector('[name="email"]')?.value || contactForm.querySelectorAll("input, textarea")[1]?.value,
                subject: contactForm.querySelector('[name="subject"]')?.value || contactForm.querySelectorAll("input, textarea")[2]?.value,
                message: contactForm.querySelector('[name="message"]')?.value || contactForm.querySelectorAll("input, textarea")[3]?.value
            };

            try {
                const result = await PortalAPI.request("/api/contact", {
                    method: "POST",
                    body: JSON.stringify(formData)
                });
                alert(result.message || "Message sent successfully!");
                contactForm.reset();
            } catch (error) {
                alert(error.message || "Failed to submit message to the backend server.");
            }
        });
    }
});
