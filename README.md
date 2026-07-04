# IBM Library AI Assistant

A full-stack library management and AI assistant project built with React, Flask, IBM Cloudant, IBM Watson Assistant, and Google Gemini. The application allows students to log in, view their borrowed books, return books, check overdue fines, and interact with a library chatbot for natural-language library requests.

## Overview

This project combines a modern React-based student dashboard with a Python backend that connects to IBM Cloudant for data storage and uses AI services to interpret library-related requests such as:

- Borrowing a book
- Returning a book
- Checking current borrow status
- Searching for books by subject or topic
- Getting book recommendations
- Checking whether a book is available

It is designed as a practical demo of an intelligent library assistant experience for educational institutions.

## Key Features

- Student authentication using a student ID
- Dashboard overview for books issued, pending returns, overdue items, and fines
- My Books screen for active borrowings
- Return Books flow with one-click return actions
- AI-powered library assistant for conversational requests
- Search and recommendation support for available books
- Cloudant-backed persistence for books, students, and transactions
- Responsive React UI with protected routes

## Screenshots

Here are some visual references you can use in the repository. Replace them with real app screenshots when available.

![Dashboard Preview](dashboard/public/logo512.png)

![Library AI Assistant Preview](dashboard/public/logo192.png)

## Tech Stack

### Frontend
- React 19
- React Router
- CSS Modules / custom CSS
- Create React App

### Backend
- Python 3
- Flask
- Flask CORS
- IBM Cloudant SDK
- Google Generative AI SDK

### External Services
- IBM Watson Assistant
- IBM Cloudant NoSQL DB
- Google Gemini AI

## Project Structure

```text
.
├── cloudant_client.py          # Flask backend and Cloudant integration
├── library_db.py               # Basic DB helper module
├── ibm-credentials.env         # IBM credentials sample file
├── data.json                   # Sample data or local dataset
├── library_openapi.json        # API contract / OpenAPI-style reference
├── index.html                  # Static entry point
├── dashboard/                  # Main React frontend application
│   ├── public/
│   └── src/
│       ├── components/
│       ├── context/
│       ├── pages/
│       └── services/
└── ibm-project/                # Secondary React prototype/demo app
```

## Architecture

The application follows a simple three-layer architecture:

1. Frontend UI
   - React app in the dashboard folder
   - Handles login, dashboard views, and chat interactions

2. Backend API
   - Flask server in cloudant_client.py
   - Exposes endpoints for login, search, borrowing, returns, and status

3. Data Layer
   - IBM Cloudant stores library books, student profiles, and borrowing transactions

## Prerequisites

Before running the project, make sure you have:

- Python 3.9 or higher
- Node.js 18 or higher
- npm
- An IBM Cloudant instance
- An IBM Watson Assistant instance
- A Google Gemini API key

## Installation and Setup

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd IBM
```

### 2. Set up the Python environment

```bash
python -m venv .venv
```

On Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

On macOS/Linux:

```bash
source .venv/bin/activate
```

Install backend dependencies:

```bash
pip install flask flask-cors ibmcloudant google-genai
```

### 3. Configure credentials

The repository contains a sample credentials file named ibm-credentials.env. Update the values as needed for your own IBM service instances.

The backend currently uses hardcoded service values in cloudant_client.py, so for real use you should move these values to environment variables or a secure config file.

### 4. Start the backend

```bash
python cloudant_client.py
```

The backend will run on:

```text
http://localhost:5000
```

### 5. Start the frontend

Open a second terminal and run:

```bash
cd dashboard
npm install
npm start
```

The frontend will be available at:

```text
http://localhost:3000
```

## Main API Endpoints

The backend exposes the following endpoints:

- POST /login
  - Authenticates a student by student ID

- POST /smart_route
  - Routes natural-language requests to the correct library action

- GET /available_books
  - Returns currently available books

- POST /search_books
  - Searches books by subject and optional tag

- POST /check_book
  - Checks whether books for a subject are available

- POST /recommend_books
  - Returns recommended books for a subject

- POST /lend_by_title
  - Borrows a book by title

- POST /active_borrows
  - Lists active borrowings for a student

- POST /return_book
  - Returns a borrowed book

- POST /student_status
  - Returns the student’s library status

- POST /overdue_status
  - Calculates overdue books and fines

## How the AI Assistant Works

The AI assistant receives a natural-language request from the user and determines the intended action. It can classify requests into intents such as:

- borrow
- return
- status
- recommend
- list
- search
- check
- unknown

Once the intent is identified, the backend routes the request to the appropriate database or service action.

## Database Model

The backend uses three main Cloudant collections:

- library_books
  - Stores book records including title, author, subject, tags, and availability

- borrowings
  - Stores borrowing transactions and due dates

- users
  - Stores student information and active borrowing references

## Usage Guide

### Logging in

Use a valid student ID to sign in. Once authenticated, the dashboard will display your current library status.

### Viewing books

Navigate to the dashboard to see your active borrowing count, pending returns, overdue items, and fine information.

### Using the AI Assistant

Open the Library AI Assistant page and ask questions such as:

- “Show me available books”
- “Recommend books on computer science”
- “Check if Java books are available”
- “Return the book I borrowed”
- “What books do I currently have?”

## Running the Secondary React App

A second React app is also included in the ibm-project folder. To run it separately:

```bash
cd ibm-project
npm install
npm start
```

## Notes

- The current implementation is intended as a demonstration project and may require configuration updates for production deployment.
- The frontend expects the backend to be running at http://localhost:5000.
- Credentials should be stored securely and not hardcoded in source files in production environments.

## Future Improvements

Possible enhancements for this project include:

- Replacing hardcoded secrets with environment variables
- Adding proper user roles and admin features
- Implementing a real database schema with stronger validation
- Expanding chatbot capabilities with better intent handling
- Adding unit and integration tests
- Deploying the frontend and backend separately

## License

This project does not currently include a declared license. If you plan to publish or share it publicly, consider adding an appropriate open-source license.
