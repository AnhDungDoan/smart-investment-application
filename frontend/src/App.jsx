import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Web3Provider } from './context/Web3Context';
import WalletManager from './components/WalletManager';
import DiceGame from './components/DiceGame';
import Leaderboard from './components/Leaderboard';
import './App.css';

function App() {
  return (
    <Web3Provider>
      <div className="App">
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#4caf50',
              },
            },
            error: {
              style: {
                background: '#f44336',
              },
            },
          }}
        />
        
        <header className="app-header">
          <div className="header-content">
            <h1 className="app-title">
              <span className="tai">TÀI</span>
              <span className="xiu">XỈU</span>
              <span className="subtitle">Dice Game</span>
            </h1>
            <WalletManager />
          </div>
        </header>

        <main className="app-main">
          <DiceGame />
          <Leaderboard />
        </main>

        <footer className="app-footer">
          <p>Playing on Ronin Testnet</p>
          <p>Contract: 0x089d...E832</p>
        </footer>
      </div>
    </Web3Provider>
  );
}

export default App;