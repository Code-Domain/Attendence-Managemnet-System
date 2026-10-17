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

            // Set your backend base URL (adjust if using React/Vite bundlers)
            const API_URL = window.API_BASE_URL || "http://127.0.0.1:5000";

            try {
                const response = await fetch(`${API_URL}/api/contact`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    alert(result.message || "Message sent successfully!");
                    contactForm.reset();
                } else {
                    alert("Error: " + (result.message || "Failed to submit message."));
                }
            } catch (error) {
                console.error("Submission Error:", error);
                alert("Failed to submit message to the backend server.");
            }
        });
    }
});
