# Full stack Engineer Assignment

### Assignment: Implementing a Google Drive-like Application

### Objective:

Create a backend application that mimics the core functionalities of Google Drive. The application should allow users to authenticate with Google, and manage their files (add, delete, rename, and search). Files should be stored either on a server (or local system) or in an AWS S3 bucket. 

### Requirements:

1. **Authentication**:
    - Implement Google OAuth for user authentication.
    - Securely manage user sessions.
2. **File Management**:
    - Users should be able to Upload, Delete, Rename files.
    - Users should be able to search for files by name.
3. **File Storage**:
    - Store files on a server or in an AWS S3 bucket.
4. **Interface**:
    - Please find the figma link [here](https://www.figma.com/design/kkiEmH1tEINHnvlhaG3YI7/Full-stack-developer?t=oURdaREWOlWF58B8-0)

### Specifications:

1. **Tech Stack**:
    - JavaScript/Typescript (Node.js with Express).
    - Database: MongoDB or any relational database.
2. **Google OAuth**:
    - Integrate Google OAuth for user authentication.
    - use `passport-google-oauth20` or any other libraries that you are comfortable with.
3. **File Operations**:
    - Implement RESTful APIs for file operations.
    - Ensure proper error handling and validation.
4. **File Storage Options**:
    - For server storage, ensure the server has a directory structure for storing files.
    - For S3 storage, use AWS SDKs.
5. **Database**:
    - Use a database to store metadata about the files (e.g., filename, file path, user, timestamps).
    - You may use SQL (PostgreSQL, MySQL) or NoSQL (MongoDB) databases.
    

### Deliverables:

1. **Codebase**:
    - Submit the complete codebase with a README file explaining how to set up and run the application.
2. **Deployment Instructions**:
    - Include instructions for deploying the application, including setting up Google OAuth, database configuration, and file storage setup.
3. **Deployed Link of the submission (use vercel or any other service)**

### Evaluation Criteria:

- If it works, you are selected
- Use ChatGPT all you want.
    - When we ask questions, please answer without Chatgpt-ing it

### Bonus Points:

- Add functionality for sharing files with other users.
- Use Docker for containerization and easier deployment.

Good luck!