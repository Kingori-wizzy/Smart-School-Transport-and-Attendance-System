# Smart School Transport & Attendance System

A comprehensive school transport management system with real-time GPS tracking, automated attendance, and parent communication.

## 📱 Features

### Parent Mobile App
- 👨‍👩‍👧 Child Management (Add/Edit/Delete)
- 🗺️ Live GPS Tracking with real-time bus location
- 📊 Attendance History with calendar view
- 🔔 Push Notifications for alerts
- 💬 In-app messaging with school/drivers
- 📍 Geofence alerts
- 🚌 Transport route information
- 📱 Offline support with caching

### Admin Dashboard
- 🚍 Bus fleet management
- 👤 Driver management
- 🗺️ Route planning
- 📈 Analytics dashboard
- 📝 Attendance monitoring
- 🔔 Alert management

### Backend API
- 🔐 JWT Authentication
- 📡 Real-time socket updates
- 🗄️ MongoDB database
- 📱 Push notification service

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, MongoDB, Socket.io
- **Admin Frontend**: React, Vite, Recharts, Leaflet
- **Parent Mobile App**: React Native, Expo, Firebase

## 📦 Project Structure
├── backend/ # Node.js/Express API
├── frontend/ # React admin dashboard
├── parent-mobile-app/ # React Native Expo app
└── README.md


## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB
- Expo CLI
- Firebase account (for push notifications)

### Installation

1. Clone the repository
```bash
git clone https://github.com/Kingori-wizzy/Smart-School-Transport-and-Attendance-System.git

cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI
npm run dev


cd frontend
npm install
npm run dev

cd parent-mobile-app
npm install
# Add your google-services.json for Firebase
npx expo start
