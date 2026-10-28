import smtplib
from email.message import EmailMessage
from email.headerregistry import Address

from config import (
    CONTACT_RECIPIENT_EMAIL,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USERNAME,
    SMTP_USE_SSL,
)


class MailConfigurationError(RuntimeError):
    pass


def send_contact_emails(name, sender_email, subject, message):
    """Notify the site owner and acknowledge the public contact submission."""
    if not CONTACT_RECIPIENT_EMAIL or not SMTP_USERNAME or not SMTP_PASSWORD:
        raise MailConfigurationError("Contact email SMTP settings are incomplete")

    safe_subject = " ".join(subject.splitlines()).strip()
    sender = Address(display_name="Student Attendance Website", addr_spec=SMTP_USERNAME)

    owner_email = EmailMessage()
    owner_email["From"] = sender
    owner_email["To"] = CONTACT_RECIPIENT_EMAIL
    owner_email["Reply-To"] = sender_email
    owner_email["Subject"] = f"Website contact form: {safe_subject}"
    owner_email.set_content(
        "A visitor submitted the website contact form.\n\n"
        f"Name: {name}\n"
        f"Email: {sender_email}\n"
        f"Subject: {safe_subject}\n\n"
        "Message:\n"
        f"{message}\n"
    )

    confirmation = EmailMessage()
    confirmation["From"] = sender
    confirmation["To"] = sender_email
    confirmation["Subject"] = "We received your message"
    confirmation.set_content(
        f"Hello {name},\n\n"
        "Thank you for contacting us. We have received your message and will "
        "respond as soon as we can.\n\n"
        f"Your subject: {safe_subject}\n\n"
        "Student Attendance Website"
    )

    smtp_type = smtplib.SMTP_SSL if SMTP_USE_SSL else smtplib.SMTP
    with smtp_type(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
        if not SMTP_USE_SSL:
            smtp.starttls()
        smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
        smtp.send_message(owner_email)
        smtp.send_message(confirmation)
