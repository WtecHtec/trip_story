# TripStory

[English](README.md) | [中文](README_zh.md)

[演示](https://www.bilibili.com/video/BV13m61BJEf3/?share_source=copy_web&vd_source=b38d30b9afa4cdb7d6538c4c2978a4c8)

TripStory 是一个 AI 驱动的旅行助手应用，旨在创造沉浸式的旅行体验。它结合了智能路线规划、风格化打卡照生成以及沿途风光视频搜索功能，帮助用户虚拟探索并规划他们的旅程。

## 简介

TripStory 利用先进的 AI 模型改变了用户与旅行数据交互的方式。通过将 3D 地图界面与生成式 AI 相结合，它允许用户：
- 使用大语言模型规划合理的城市间旅行路线。
- 使用图生图 AI 为访问的地点生成风格化的“打卡”照片。
- 发现第一视角（POV）旅行视频，在出发前提前体验旅程。

## 功能特性

- **🗺️ AI 路线规划**: 使用 **DeepSeek/DashScope** 自动生成包含途经点和景点的旅行路线。
- **📸 AI 打卡照**: 使用 **豆包 (Ark API)** 将用户上传的照片或兴趣点转换为高质量、风格化的旅行摄影作品。
- **🎥 智能视频搜索**: 智能搜索 **Bilibili** 上与路线匹配的第一视角（POV）旅行视频。
- **📍 交互式 3D 地图**: 由 **高德地图 (AMap)** 驱动的沉浸式地图体验，支持路线可视化和动画演示。

## 技术栈

### 前端 (Frontend)
- **框架**: React 19 + Vite 7
- **语言**: TypeScript
- **状态管理**: MobX
- **地图引擎**: AMap (高德地图 JS API 2.0)
- **样式**: CSS Modules / Standard CSS

### 后端 (Backend)
- **运行时**: Node.js
- **框架**: Express.js
- **语言**: TypeScript
- **AI 集成**: OpenAI SDK (兼容 DashScope 和 DeepSeek), Node-fetch

## 快速开始

### 前置要求
- Node.js (建议 v18+)
- API 密钥:
  - **Alibaba DashScope / DeepSeek** (用于路线规划)
  - **Volcengine Ark (豆包)** (用于图像生成)
  - **高德地图 (AMap)** (用于地图可视化)

### 安装

1. **克隆仓库**
   ```bash
   git clone <repository_url>
   cd TripStory
   ```

2. **安装后端依赖**
   ```bash
   cd backend
   npm install
   ```

3. **安装前端依赖**
   ```bash
   cd ../frontend
   npm install
   ```

### 配置

1. **后端配置**
   在 `backend` 目录下创建一个 `.env` 文件：
   ```env
   DASHSCOPE_API_KEY=你的_dashscope_api_key
   ARK_API_KEY=你的_ark_doubao_api_key
   ```

2. **前端配置**
   在 `frontend` 目录下创建或更新 `.env` 文件：
   ```env
   VITE_AMAP_KEY=你的_高德地图_key
   VITE_AMAP_SECURITY_CODE=你的_高德地图_安全密钥
   ```

### 运行应用

1. **启动后端服务器**
   ```bash
   cd backend
   npm run dev
   ```
   服务器将运行在 `http://localhost:3001`

2. **启动前端开发服务器**
   ```bash
   cd frontend
   npm run dev
   ```
   应用将可以通过 `http://localhost:5173` (或其他 Vite 默认端口) 访问

## 许可证

本项目采用 MIT 许可证。
