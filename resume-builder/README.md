# Resume Builder with AI Enhancement

A modern resume builder application with AI-powered enhancement features, resume saving, sharing, and PDF download capabilities.

## Features

1. **AI Assistant Enhancement**
   - Enhance resume sections with AI assistance
   - Get professionally written content for summary, experience, and more

2. **Save & Share Resume**
   - Save resume data to MongoDB
   - Generate shareable links with optional expiry dates
   - Web Share API support for easy sharing

3. **Download PDF**
   - Generate and download professional PDF resumes
   - Maintains formatting and styling

4. **Upload & Auto-Enhance Resume**
   - Upload previously saved resumes
   - Choose between manual editing or AI enhancement

## Tech Stack

### Frontend
- React.js
- Tailwind CSS
- HTML2Canvas & jsPDF for PDF generation

### Backend
- Node.js with Express
- MongoDB with Mongoose
- OpenAI API for AI enhancement
- UUID for secure share links

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- OpenAI API key

### Installation

1. Clone the repository

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=your_mongodb_connection_string
   OPENAI_API_KEY=your_openai_api_key
   ```

4. Create a `.env.local` file in the root directory with:
   ```
   VITE_API_URL=http://localhost:5000/api
   ```

### Running the Application

1. Start the development server (frontend)
   ```
   npm run dev
   ```

2. Start the backend server
   ```
   npm run dev:server
   ```

3. Or run both concurrently
   ```
   npm run dev:full
   ```

## API Endpoints

### AI Enhancement
- `POST /api/enhance-section` - Enhance a specific section
- `POST /api/auto-enhance-resume` - Enhance the entire resume

### Resume Management
- `POST /api/save-resume` - Save resume data
- `GET /api/get-resume/:userId` - Get saved resume

### Sharing
- `GET /api/generate-share-link/:userId` - Generate a shareable link
- `GET /api/shared-resume/:token` - Get a shared resume

### PDF Generation
- `POST /api/generate-pdf` - Generate a PDF from resume data

## License

MIT