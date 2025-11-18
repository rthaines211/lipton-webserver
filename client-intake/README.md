# Client Intake Form - React Application

A modern, responsive client intake form built with React, TypeScript, Vite, and Tailwind CSS.

## Features

- ✅ Multi-section intake form
- ✅ Real-time validation
- ✅ Success confirmation with intake number
- ✅ Responsive design (mobile & desktop)
- ✅ API integration with Express backend
- ✅ PostgreSQL database storage

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will be available at http://localhost:3001

API requests will be proxied to http://localhost:8080 (Express server must be running)

### Build for Production

```bash
npm run build
```

Output will be in the `/dist` directory.

## Architecture

### Frontend (React + Vite)
- `src/App.tsx` - Main application component with submission handling
- `src/components/IntakeForm.tsx` - Form component with validation
- `src/index.css` - Tailwind CSS styles

### Backend API
- `POST /api/intakes` - Submit intake form
- `GET /api/intakes` - List all intakes (admin)
- `GET /api/intakes/:id` - Get specific intake

### Database
- Table: `client_intakes` (13 related tables in schema)
- Auto-generated intake numbers (INT-2025-00001)
- Full audit trail with raw_form_data JSONB column

## Form Fields

**Personal Information:**
- First Name, Middle Name, Last Name
- Date of Birth

**Contact Information:**
- Phone Number
- Email Address

**Current Address:**
- Street, City, State, ZIP

**Property Information:**
- Property Address (if different)
- Monthly Rent
- Lease Start Date

**Issue Description:**
- Primary Issue Category
- Detailed Description

## Next Steps

Week 5 enhancements:
- File upload functionality
- Draft save/resume feature
- Attorney dashboard
- Search modal
- Email notifications
