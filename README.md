# GTA CPR Course Management System

A comprehensive system for managing CPR courses, including registration, scheduling, and administration.

## Features

- Multi-portal system with different user roles
- Instructor portal for managing courses and attendance
- Organization portal for scheduling courses
- Course administration portal for overall management
- Accounting portal for financial tracking

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm start
   ```
4. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## Login Credentials

For testing purposes, use the following credentials:

| Portal | Username | Password |
|--------|----------|----------|
| Instructor Portal | instructor | test123 |
| Organization Portal | orgadmin | test123 |
| Course Admin Portal | courseadmin | test123 |
| Accounting Portal | actadmin | test123 |

## Project Structure

- `src/components/` - React components
- `src/components/portals/` - Portal-specific components
- `public/` - Static files

## Technologies Used

- React
- Material UI
- React Router
- JavaScript (ES6+) 