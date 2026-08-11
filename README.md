# Full-Stack Todo Application

This project consists of a Node.js/Express backend paired with a React (Vite) frontend, utilizing a MySQL database.

## Prerequisites

Before running the application, make sure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [MySQL Server](https://dev.mysql.com/downloads/mysql/)

## Database Setup

1. Make sure your local MySQL server is running.
2. Ensure you have created the `todo_app_db` database and run the schema setup for the `users` and `todos` tables.
3. If your MySQL credentials differ, update the `.env` file located in the `backend/` folder:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=todo_app_db
   ```

## How to Run the Backend (Node.js/Express)

The backend server exposes the API routes for Users and Todos.

1. Open your terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install the necessary dependencies (only required the first time):
   ```bash
   npm install
   ```
3. Start the development server using `nodemon`:
   ```bash
   npm run dev
   ```
4. You should see a message in the terminal indicating the server is running:
   ```
   🚀 Server running on http://localhost:5000
   ```
   *Note: You can verify the connection by navigating to `http://localhost:5000/api/health` in your browser.*

## How to Run the Frontend (React/Vite)

The frontend is a modern React application built with Vite.

1. Open a **new, separate terminal** and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install the necessary dependencies (only required the first time):
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open the URL provided in the terminal (usually `http://localhost:5173`) in your web browser.

## API Endpoints Available

### Users API (`/api/users`)
- `POST /register`: Register a new user
- `GET /`: Get a list of all active users

### Todos API (`/api/todos`)
- `POST /`: Create a new Todo
- `GET /user/:userId`: Get all Todos for a specific user
- `PUT /:id`: Update a specific Todo
- `DELETE /:id`: Delete a specific Todo
