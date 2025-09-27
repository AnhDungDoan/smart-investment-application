# 🎲 Ronin Dice Game - Tài Xỉu (Over/Under)

A decentralized dice game built on Ronin testnet with a hybrid Web3/Web2 architecture for optimal performance.

## 🎮 Game Features

- **Vietnamese Tài Xỉu**: Traditional Over/Under dice game
- **Multi-Wallet Support**: Ronin Wallet and MetaMask
- **Hybrid Architecture**: Smart contract for fund security, backend for game speed
- **Leaderboard System**: Compete with other players
- **Real-time Updates**: Live game results and statistics

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher)
- **npm** or **yarn** package manager
- **Git**
- **Ronin Wallet** or **MetaMask** browser extension

## 🚀 Quick Start Guide

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd ronin-dice-game
```

### Step 2: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install smart contract dependencies (optional - only for redeployment)
cd ../contracts
npm install
```

### Step 3: Configure Environment Variables

#### Backend Configuration

Create `.env` file in the `backend` directory:

```bash
cd backend
nano .env
```

Add the following configuration:

```env
# Server Configuration
PORT=3001

# Database
DATABASE_URL=./dice_game.db

# JWT Secret (generate a random string)
JWT_SECRET=your-secret-key-change-this-in-production

# Ronin Testnet Configuration
RPC_URL=https://saigon-testnet.roninchain.com/rpc

# Contract Address (already deployed)
CONTRACT_ADDRESS=0x089d3d51cb3c8ca070d5648C9D1c7d765533E832

# Private Key (only needed if you want to interact with contract from backend)
# PRIVATE_KEY=your-private-key-here

# CORS Configuration (optional)
CORS_ORIGIN=http://localhost:5173
```

#### Frontend Configuration

The frontend `.env` file is already configured in `frontend/.env`:

```env
# Backend URL - Leave empty to use Vite proxy (recommended for local development)
VITE_BACKEND_URL=

# Smart Contract Configuration
VITE_CONTRACT_ADDRESS=0x089d3d51cb3c8ca070d5648C9D1c7d765533E832
VITE_CHAIN_ID=0x834
```

### Step 4: Start the Application

#### Option 1: Manual Start

Start the backend server:

```bash
cd backend
npm start
```

In a new terminal, start the frontend:

```bash
cd frontend
npm run dev
```

#### Option 2: Using the Setup Script (Recommended)

Run the provided setup script that handles everything:

```bash
./setup.sh
```

### Step 5: Access the Game

Open your browser and navigate to:
- **Frontend**: http://localhost:5173
- **Backend Health Check**: http://localhost:3001/health

## 🎯 How to Play

1. **Connect Wallet**: Click "Connect Wallet" and choose Ronin Wallet or MetaMask
2. **Get Testnet RON**: Visit [Ronin Faucet](https://faucet.roninchain.com/) to get test tokens
3. **Deposit Funds**: Deposit RON from your wallet to the game contract
4. **Place Bets**: Choose "Tài" (High: 11-18) or "Xỉu" (Low: 3-10)
5. **Roll Dice**: Watch the dice roll and see if you win!
6. **Withdraw**: Withdraw your winnings back to your wallet

### Game Rules

- **Tài (High)**: Sum of 11-18 wins (1:1 payout)
- **Xỉu (Low)**: Sum of 3-10 wins (1:1 payout)  
- **Triple**: Three identical dice - House always wins

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Ronin Wallet   │────▶│    Frontend     │────▶│    Backend      │
│   MetaMask      │     │   (React/Vite)  │     │   (Express)     │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Smart Contract │     │   Game Logic    │     │   SQLite DB     │
│   (DiceVault)   │     │   Animations    │     │   User Data     │
│                 │     │                 │     │   Game History  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Technology Stack

- **Frontend**: React, Vite, Ethers.js, Framer Motion
- **Backend**: Express.js, SQLite, JWT Authentication  
- **Smart Contract**: Solidity, Hardhat, OpenZeppelin
- **Blockchain**: Ronin Testnet (Saigon)

## 📁 Project Structure

```
ronin-dice-game/
├── frontend/           # React frontend application
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── context/    # Web3 context provider
│   │   ├── utils/      # Utility functions
│   │   └── App.jsx     # Main application
│   └── package.json
│
├── backend/            # Express backend server
│   ├── server.js       # Main server file
│   ├── dice_game.db    # SQLite database
│   └── package.json
│
├── contracts/          # Smart contracts
│   ├── contracts/      # Solidity contracts
│   ├── scripts/        # Deployment scripts
│   └── hardhat.config.js
│
├── README.md          # This file
└── setup.sh           # Setup script
```

## 🔧 Development

### Running Tests

```bash
# Test smart contracts
cd contracts
npm test

# Test backend (if tests are added)
cd backend
npm test

# Test frontend (if tests are added)
cd frontend
npm test
```

### Building for Production

```bash
# Build frontend
cd frontend
npm run build

# The backend doesn't need building (Node.js)
```

## 🌐 Deployment Options

### Local Network

The application runs locally by default with:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### Public Deployment

For public access, you can use:

1. **Cloud Hosting** (Recommended for Production)
   - Deploy frontend to Vercel/Netlify
   - Deploy backend to Railway/Render
   - Use environment variables for configuration

2. **VPS Deployment**
   - Set up Node.js on your VPS
   - Configure Nginx as reverse proxy
   - Use PM2 for process management
   - Set up SSL certificates

3. **Tunneling Services** (For Testing)
   - Cloudflare Tunnel
   - Ngrok
   - LocalTunnel

## 🔐 Security Considerations

- **Private Keys**: Never commit private keys to the repository
- **JWT Secret**: Use a strong, unique secret in production
- **Rate Limiting**: Currently disabled for demo - enable in production
- **CORS**: Configure allowed origins properly in production
- **HTTPS**: Always use HTTPS in production

## 🐛 Troubleshooting

### Common Issues

1. **Wallet Connection Failed**
   - Ensure Ronin Wallet or MetaMask is installed
   - Check you're on the correct network (Ronin Testnet)
   - Try refreshing the page

2. **Transaction Failed**
   - Ensure you have enough RON for gas fees
   - Check the contract has sufficient balance
   - Verify network connectivity

3. **Backend Connection Error**
   - Ensure backend is running on port 3001
   - Check CORS configuration
   - Verify database file exists

4. **Port Already in Use**
   ```bash
   # Kill process on port 3001 (backend)
   lsof -ti:3001 | xargs kill -9
   
   # Kill process on port 5173 (frontend)
   lsof -ti:5173 | xargs kill -9
   ```

## 📝 Smart Contract

The DiceVault contract is deployed at:
- **Address**: `0x089d3d51cb3c8ca070d5648C9D1c7d765533E832`
- **Network**: Ronin Testnet (Saigon)
- **Explorer**: [View on Explorer](https://saigon-app.roninchain.com/address/0x089d3d51cb3c8ca070d5648c9d1c7d765533e832)

### Contract Functions

- `deposit()`: Deposit RON to your game balance
- `withdraw(amount)`: Withdraw RON from your game balance
- `getBalance(address)`: Check user's balance

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with ❤️ for the Ronin community
- Inspired by traditional Vietnamese dice games
- Special thanks to all contributors

---

**Note**: This is a demo application on testnet. Do not use with real funds on mainnet without proper auditing and security measures.