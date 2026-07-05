Live application coming soon...

---

# Spend-Sense Frontend Client 💳📱

Spend-Sense is a premium, user-friendly personal finance tracking application built on **React Native (Expo)**. It offers real-time balance calculations, rich categorization, custom tagging, multi-wallet operations, analytics insights, and a floating AI copilot for natural language interactions.

---

## ✨ Features

### 1. 🏠 Dynamic Dashboard & Transaction Ledger
* **Timeline Ledger**: View your transaction history sorted chronologically. Expanded transaction cards support markdown-rendered descriptions.
* **Instant Balance Engine**: Automated balance calculations reflecting transaction amounts across cash and bank accounts on a daily timeline.
* **Advanced Multi-Filters**: Filter transaction feeds by Income/Expense type, specific categories, wallets, tags, or payment methods.
* **Transaction Inspector Modal**: A slide-up sheet displaying complete details of any transaction, formatted locale dates/times, and fully parsed notes.

### 2. 📊 Analytics & Insights
* **Trends Tracking**: Visual charts demonstrating month-over-month income vs. expense performance.
* **Distribution Breakdowns**: Clean percentage indicators representing category-wise distributions and wallet balance proportions.
* **Live Update Listeners**: Auto-fetches fresh analytics metrics when switching tab screens.

### 3. 💬 Floating AI Copilot Chat Overlay
* **Natural Language Processing**: Chat with an AI assistant directly from a floating overlay.
* **Dynamic Action Tools**: The agent can add transactions, analyze spending trends, fetch account balances, or manage user parameters on your behalf.
* **Real-time Event Triggers**: Home dashboard and wallet states refresh instantly once the AI agent finishes executing backend actions.

### 4. ⚙️ Category, Wallet & Tag Manager
* **Sheet Modal Portals**: Add, edit, or delete categories (with custom icons/colors) and wallets through slide-out modals.
* **Tag Renaming & Coloring**: Edit tag parameters and rename existing tags easily with instant global updates.
* **Preferred Currency**: Switch your primary operating currency (e.g. INR, USD, EUR, GBP) dynamically.

### 5. 🎨 Design & Layout Aesthetics
* **Premium Theme Modes**: Smooth Light/Dark mode transitions matching system preferences.
* **Safe Area Protection**: Integrated safe area top insets using the `useSafeAreaInsets` hook to prevent UI overlaps with device status bars on iOS/Android.

---

## 🛠️ Technology Stack

* **Core Framework**: React Native (Expo SDK 54)
* **Routing**: Expo Router (File-based navigation tabs)
* **State & Authentication**: Hook-based Auth Provider with secure tokens
* **Icons**: Ionicons (`@expo/vector-icons`)
* **Storage**: `expo-secure-store` (for mobile token persistence) & Web LocalStorage
* **HTTP Client**: Customized JWT refresh handler utility (`apiFetch`)

---

## 🚀 Get Started

### Prerequisites
* Ensure you have [Node.js](https://nodejs.org/) and [Git](https://git-scm.com/install/) installed (v18+ recommended).

### 1. Installation
Clone the repository and install the dependencies.
```bash
git clone https://github.com/Hp2006dec10/spend-sense.git
npm install
```

### 2. Environment Configuration
Create a `.env` file in the (this file is ignored in `.gitignore` to keep credentials hidden):
```env
EXPO_PUBLIC_API_URL=Your-ip-address:backend-server-port
```
*(In local development without this variable, the app automatically defaults to `http://localhost:5000/api`)*
---

### 3. Setup Backend

Navigate to [spend-sense-server](https://github.com/Hp2006dec10/spend-sense-server.git) and clone the repository. Follow the instructions specified in the corresponding repository and start the backend development server.

---

### 4. Start Development Server
Run the Metro bundler to launch the app:
```bash
# Start Expo bundler
npm start

# Run directly on Expo Web
npm run web

# Run on Android Emulator
npm run android

# Run on iOS Simulator
npm run ios
```

---
