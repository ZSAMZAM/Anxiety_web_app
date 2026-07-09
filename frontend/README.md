# Anxiety Prediction Frontend

A modern React frontend application for an Anxiety Prediction System using Vite and Tailwind CSS.

## Features

- Responsive dashboard design for users and admins
- Role-based authentication with protected routes
- React Router DOM for page navigation
- Mock API layer with Axios
- Authentication Context with localStorage persistence
- Reusable component library and layout
- Tailwind CSS styling with polished glassmorphism UI
- Framer Motion animations and React Icons
- Mobile-friendly navigation and sidebar layout

## Folder structure

```
frontend/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── context/
│   ├── data/
│   ├── layouts/
│   ├── pages/
│   ├── routes/
│   ├── services/
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── package.json
├── tailwind.config.js
└── postcss.config.js
```

## Setup Instructions

1. Open a terminal in `c:\Users\hp\Desktop\panel\frontend`.
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open the local URL shown in the terminal, usually `http://localhost:5173`.

## Notes

- The app uses dummy data from `src/data/dummyData.js`.
- Authentication state is persisted in localStorage under `anxiety-user`.
- Admin and User pages are separated with protected routes in `src/routes/AppRoutes.jsx`.
- The API file `src/services/api.js` simulates backend calls with delayed promises.

## Example demo credentials

- User: `amelia@patient.com` / `patient123`
- Admin: `noah@healthadmin.com` / `admin123`
