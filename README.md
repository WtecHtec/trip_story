# TripStory

[English](README.md) | [中文](README_zh.md)

TripStory is an AI-powered travel assistant application that creates immersive travel experiences. It combines intelligent route planning, style-transfer check-in photos, and scenic video search to help users virtually explore and plan their trips.

## Introduction

TripStory leverages advanced AI models to transform how users interact with travel data. By integrating a 3D map interface with Generative AI, it allows users to:
- Plan reasonable travel routes between cities using Large Language Models.
- Generate stylized "Check-in" photos for visited locations using Image-to-Image AI.
- Discover POV travel videos to experience the journey before they go.

## Features

- **🗺️ AI Route Planning**: Automatically generates travel routes including waypoints and scenic spots using **DeepSeek/DashScope**.
- **📸 AI Check-in Photos**: Transforms user-uploaded photos or points of interest into high-quality, stylized travel photography using **Doubao (Ark API)**.
- **🎥 Smart Video Search**: Intelligently searches **Bilibili** for first-person view (POV) travel videos matching the route.
- **📍 Interactive 3D Map**: immersive map experience powered by **AMap (Gaode Map)** with route visualization and animations.

## Tech Stack

### Frontend
- **Framework**: React 19 + Vite 7
- **Language**: TypeScript
- **State Management**: MobX
- **Map Engine**: AMap (Gaode JS API 2.0)
- **Styling**: CSS Modules / Standard CSS

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **AI Integration**: OpenAI SDK (compatible with DashScope & DeepSeek), Node-fetch

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- API Keys for:
  - **Alibaba DashScope / DeepSeek** (Route Planning)
  - **Volcengine Ark (Doubao)** (Image Generation)
  - **AMap (Gaode Map)** (Map Visualization)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository_url>
   cd TripStory
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

### Configuration

1. **Backend Configuration**
   Create a `.env` file in the `backend` directory:
   ```env
   DASHSCOPE_API_KEY=your_dashscope_api_key
   ARK_API_KEY=your_ark_doubao_api_key
   ```

2. **Frontend Configuration**
   Create or update `.env` in the `frontend` directory:
   ```env
   VITE_AMAP_KEY=your_amap_key
   VITE_AMAP_SECURITY_CODE=your_amap_security_code
   ```

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   Server will start on `http://localhost:3001`

2. **Start the Frontend Development Server**
   ```bash
   cd frontend
   npm run dev
   ```
   Application will be accessible at `http://localhost:5173` (or typical Vite port)

## License

This project is licensed under the MIT License.
