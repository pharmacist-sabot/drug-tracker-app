# Drug Tracker Application

[![Vue.js](https://img.shields.io/badge/Vue.js-3-4FC08D?style=for-the-badge&logo=vue.js)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase)](https://supabase.io/)
[![Pinia](https://img.shields.io/badge/Pinia-FFD859?style=for-the-badge&logo=pinia)](https://pinia.vuejs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Hosting-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint)](https://eslint.org/)

## Overview

The Drug Tracker Application is a specialized web platform designed to streamline the **pharmaceutical procurement workflow**. It enables users to efficiently manage the entire lifecycle of drug orders, starting from the bulk import of purchase lists via CSV files, to placing orders, and finally, confirming the receipt of goods.

A key feature of the system is its integration with **Telegram for real-time order notifications**, ensuring stakeholders are kept up-to-date. The application also provides a comprehensive history log for tracking and auditing all procurement activities.

Built with a robust technology stack, this application leverages the power of Vue 3 and the Vite ecosystem for a fast and reactive frontend, while utilizing Supabase for a scalable and secure backend infrastructure.

## ✨ Key Features

- **Bulk Order Creation via CSV**: Easily upload a CSV file containing a list of required drugs to initiate the procurement process quickly.
- **End-to-End Order Tracking**: Manage the complete status of orders, from 'Ordered' to 'Delivered'. A simple interface allows users to update the status upon receiving goods.
- **Real-Time Telegram Notifications**: Automatically sends notifications to a designated Telegram channel or user when a new order is placed, keeping the team informed.
- **Comprehensive Order History**: A dedicated history view provides a detailed log of all past and current orders, complete with statuses and timestamps, for easy tracking and auditing.
- **Reactive Frontend**: Built with Vue 3 (Composition API) for a highly performant and maintainable user interface.
- **Rapid Development**: Powered by Vite, offering lightning-fast Hot Module Replacement (HMR) and optimized build processes.
- **Scalable Backend**: Integrated with Supabase, providing database, authentication, and storage solutions out-of-the-box.
- **Centralized State Management**: Utilizes Pinia for predictable and debuggable state.
- **Deployment Ready**: Comes with a pre-defined configuration for seamless deployment to Firebase Hosting.

## 🛠️ Technology Stack

| Category       | Technology                  |
| -------------- | --------------------------- |
| **Frontend**   | Vue.js 3, Vue Router 4      |
| **Backend**    | Supabase (PostgreSQL, Auth) |
| **Build Tool** | Vite                        |
| **State Mgt.** | Pinia                       |
| **Linting**    | ESLint                      |
| **Formatting** | ESLint (stylistic)          |
| **Deployment** | Firebase Hosting            |

## 🚀 Getting Started

Follow these instructions to set up the project on your local machine for development and testing purposes.

### Prerequisites

- **Node.js**: Version `^20.19.0` or `>=22.12.0` as specified in `package.json`.
- **npm** or **pnpm** package manager.
- **Supabase Account**: You will need a Supabase account and a project set up to get the required API keys.
- **Telegram Bot**: A Telegram Bot Token and Chat ID for sending notifications.

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/pharmacist-sabot/drug-tracker-app.git
    cd drug-tracker-app
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project by copying the `.env.example` file.

    ```bash
    cp .env.example .env
    ```

    Then, fill in your credentials in the `.env` file:

    ```env
    # .env
    VITE_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
    VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
    VITE_TELEGRAM_BOT_TOKEN="YOUR_TELEGRAM_BOT_TOKEN"
    VITE_TELEGRAM_CHAT_ID="YOUR_TELEGRAM_CHAT_ID"
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

## 📜 Available Scripts

| Script             | Description                                      |
| ------------------ | ------------------------------------------------ |
| `npm run dev`      | Starts the Vite development server with HMR.     |
| `npm run build`    | Compiles and bundles the app for production.     |
| `npm run preview`  | Serves the production build locally for preview. |
| `npm run lint`     | Lints files and reports issues.                  |
| `npm run lint:fix` | Lints files and attempts to auto-fix issues.     |

## 📦 Build & Deployment

### Building for Production

To create a production-ready build, run the following command. The output will be in the `/dist` directory.

```bash
npm run build
```

## 🚀 Deployment

This project is pre-configured for deployment on **Firebase Hosting**. The `firebase.json` file defines the public directory (`dist`) and rewrite rules necessary for a single-page application.

To deploy, ensure you have the **Firebase CLI** installed and configured, then run:

```bash
firebase deploy
```

---

## 🤝 Contributing

Contributions are welcome! If you would like to contribute to this project, please follow these steps:

1. **Fork** the repository.
2. Create a new branch for your feature or bug fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes and commit them with a descriptive message.
4. Push your changes to your forked repository.
5. Create a new **Pull Request** to the `main` branch of the original repository.

---

## 📄 License

This project is licensed under the **MIT License**.
