from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

def create_resume(filename):
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    # Title
    c.setFont("Helvetica-Bold", 20)
    c.drawString(100, height - 80, "John Doe")
    
    # Contact
    c.setFont("Helvetica", 10)
    c.drawString(100, height - 100, "Email: john.doe@email.com | Phone: 123-456-7890 | GitHub: github.com/johndoe")
    
    # Section: Professional Summary
    c.setFont("Helvetica-Bold", 14)
    c.drawString(100, height - 130, "Professional Summary")
    c.setLineWidth(1)
    c.line(100, height - 135, width - 100, height - 135)
    
    c.setFont("Helvetica", 10)
    c.drawString(100, height - 155, "Software Engineer with 3+ years of experience building web applications. Expert in Python, Django,")
    c.drawString(100, height - 170, "and SQL. Experienced in cloud technologies (AWS, Docker) and Agile methodologies.")
    
    # Section: Experience
    c.setFont("Helvetica-Bold", 14)
    c.drawString(100, height - 200, "Work Experience")
    c.line(100, height - 205, width - 100, height - 205)
    
    c.setFont("Helvetica-Bold", 11)
    c.drawString(100, height - 225, "Software Engineer - Tech Solutions Inc.")
    c.setFont("Helvetica-Oblique", 10)
    c.drawString(100, height - 240, "June 2023 - Present")
    c.setFont("Helvetica", 10)
    c.drawString(100, height - 255, "- Developed and maintained web services using Python, Flask, and PostgreSQL.")
    c.drawString(100, height - 270, "- Implemented CI/CD pipelines using Git and GitHub Actions, reducing deployment time by 20%.")
    c.drawString(100, height - 285, "- Containerized applications using Docker and deployed to AWS ECS.")
    c.drawString(100, height - 300, "- Collaborated with cross-functional teams in an Agile Scrum environment.")
    
    # Section: Skills
    c.setFont("Helvetica-Bold", 14)
    c.drawString(100, height - 330, "Technical Skills")
    c.line(100, height - 335, width - 100, height - 335)
    
    c.setFont("Helvetica", 10)
    c.drawString(100, height - 355, "Languages: Python, JavaScript, HTML, CSS, SQL")
    c.drawString(100, height - 370, "Frameworks: Flask, Django, React, Bootstrap")
    c.drawString(100, height - 385, "Tools & DevOps: Git, Docker, AWS, PostgreSQL, Linux")
    c.drawString(100, height - 400, "Methodologies: Agile, Scrum, Kanban")
    
    c.save()

if __name__ == "__main__":
    create_resume("test_resume.pdf")
    print("Resume test_resume.pdf generated successfully.")
