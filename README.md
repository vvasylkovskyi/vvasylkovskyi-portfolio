# 🚀🚀🚀 Viktor's Portfolio

Welcome to my personal full-stack portfolio project — a professional showcase and a practical example of how to architect, develop, and maintain a modern full-stack application with a clean separation of concerns and best practices.

## 🚀 Overview

This portfolio serves multiple purposes:

- **Professional Path:** An overview of my career journey as a Senior Software Engineer.
- **Personal Notes Collection:** A curated library of notes I maintain, authored in Markdown and version controlled.
- **Technical Showcase:** Demonstrates how a full-stack developer can structure and manage code across frontend, backend, database, infrastructure, and CI/CD.

## 🚦 Get Started

Feel free to explore the project source code and infrastructure:

- Portfolio application: [github.com/vvasylkovskyi/vvasylkovskyi-portfolio](https://github.com/vvasylkovskyi/vvasylkovskyi-portfolio)
- Infrastructure as Code: [github.com/vvasylkovskyi/vvasylkovskyi-infra](https://github.com/vvasylkovskyi/vvasylkovskyi-infra)
- Live website: [vvasylkovskyi.com](https://www.vvasylkovskyi.com/)

## 🛠 Technology Stack

- **Frontend & Backend:** Next.js (React) with TypeScript — server-side rendered pages and reusable React components.
- **Styling:** SCSS supporting dynamic theming (light/dark modes).
- **Data Layer:** PostgreSQL database stores metadata and content references for notes.
- **Content Management:** Notes themselves are written as Markdown files, which can include code snippets. This content is version controlled separately, then ingested into the database — separating application logic from data content, following the [12 Factor App](https://12factor.net/) methodology.
- **Containerization:** Dockerized for consistent builds and deployments.
- **Infrastructure:** Fully managed with Terraform as Infrastructure as Code (IaC), hosted on a single EC2 instance for simplicity and cost efficiency.
- **CI/CD:** GitHub Actions automate the build pipeline by:
  - Building and pushing Docker images to Docker Hub
  - Deploying infrastructure updates via Terraform using `terraform apply` in a dedicated repository

## 🏗 Architecture Highlights

- **Separation of Concerns:** Notes content is managed as code (Markdown) independently from the application, then stored in PostgreSQL. This approach enables flexibility and versioning for content updates.
- **SSR with Next.js:** Pages render server-side with TypeScript, fetching data directly from PostgreSQL for improved SEO and performance.
- **Theming:** SCSS-based theming system with dynamic light and dark modes, providing a clean and user-friendly UI experience.
- **Infrastructure-as-Code:** Terraform scripts live in a separate repository, allowing clean version control, review, and reuse for infrastructure deployments.
- **Cost-Effective Deployment:** Single EC2 instance deployment avoids unnecessary overhead and complexity while maintaining reliability.
- **Automated Deployment:** GitHub Actions enable seamless CI/CD workflows, promoting rapid and reliable releases.

## 🤝 Contribution & Community

This project is open source and community-oriented. Whether you are a fellow developer interested in full-stack best practices, or just curious about how to combine Markdown-based content management with a relational database backend — feel free to explore, fork, and contribute.

If you have ideas, suggestions, or improvements, please open issues or submit pull requests. I’m eager to foster a collaborative environment where knowledge is shared and quality software is built.

## 📬 Contact

For any questions, collaboration ideas, or professional inquiries, you can reach me via GitHub or through the contact details available on my website.

---

Thank you for checking out my portfolio — I hope it inspires your next project!

---

*Viktor Vasylkovskyi*  
Senior Product Engineer  
Lisbon, Portugal (Remote)

<div style="display: flex; justify-content: flex-start; margin-bottom: 10px; "><img src="./background-rockets.png" width="125" height="75" alt="Raspberry pi device"/></div>

