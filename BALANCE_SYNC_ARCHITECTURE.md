# Balance Synchronization Architecture

## Overview
This document explains how balance synchronization works between the smart contract (on-chain) and the database (off-chain) in the Ronin Dice Game.

## 🏗️ Architecture Principle

### Source of Truth
- **Smart Contract**: The ONLY source of truth for actual funds
- **Database**: A cache for game speed and history tracking
- **Frontend**: Always displays the contract balance via backend API

## 📊 Balance Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     USER ACTIONS                            │
├──────────────┬─────────────┬────────────┬──────────────────┤
│   Deposit    │  Play Game  │    Win    │    Withdraw       │
└──────┬───────┴──────┬──────┴─────┬──────┴──────┬───────────┘
       │              │             │             │
       ▼              ▼             ▼             ▼
┌──────────────────────────────────────────────────────────────┐
│                    SMART CONTRACT                            │
│  - deposit()       - getBalance()                           │
│  - withdraw()      - updateBalance() [admin only]           │
└─────────────────────┬─────────────────────────────────────┘
                      │
                      │ Balance Updates
                      ▼
┌──────────────────────────────────────────────────────────────┐
│                      BACKEND SERVER                          │
│                                                              │
│  1. /api/balance/:address                                   │
│     → ALWAYS fetches from contract                          │
│     → Updates database to match                             │
│     → Returns contract balance                              │
│                                                              │
│  2. /api/bet                                                 │
│     → Processes game logic                                  │
│     → Updates database balance                              │
│     → Calls contract.updateBalance()                        │
│                                                              │
│  3. /api/sync-deposit                                       │
│     → Reads contract balance                                │
│     → Updates database to match                             │
│                                                              │
│  4. /api/sync-withdraw                                      │
│     → Updates database balance                              │
│     → Calls contract.updateBalance()                        │
└──────────────────────────────────────────────────────────────┘
```

## 🔄 Synchronization Points

### 1. **Deposit Flow**
```
User deposits 10 RON
    ↓
Smart Contract balance: 10 RON
    ↓
User clicks "Sync Deposit"
    ↓
Backend reads contract: 10 RON
    ↓
Database updated: 10 RON
    ↓
Frontend shows: 10 RON
```

### 2. **Game Play Flow** 
```
User bets 5 RON and wins (payout: 10 RON)
    ↓
Database: 10 - 5 + 10 = 15 RON
    ↓
Backend calls contract.updateBalance(15 RON)
    ↓
Smart Contract balance: 15 RON
    ↓
Frontend shows: 15 RON
```

### 3. **Withdrawal Flow**
```
User withdraws 15 RON
    ↓
Smart Contract processes withdrawal: 0 RON
    ↓
Backend sync-withdraw called
    ↓
Database updated: 0 RON
Contract.updateBalance(0 RON) called
    ↓
Frontend fetches balance
    ↓
Backend reads contract: 0 RON
    ↓
Frontend shows: 0 RON ✓ (not 6!)
```

## 🐛 Bug Fixes Implemented

### Bug #1: Balance Not Syncing with Contract
**Problem**: Game wins/losses only updated database, not smart contract
**Solution**: Added contract.updateBalance() call after every bet

### Bug #2: Balance Shows 6 After Withdrawing All
**Problem**: Backend was using stale database value instead of contract
**Solution**: Changed /api/balance to ALWAYS fetch from contract first

## 📝 Key Code Changes

### Backend Balance Endpoint (Fixed)
```javascript
app.get('/api/balance/:address', async (req, res) => {
  // ALWAYS fetch from contract (source of truth)
  const contractBalance = await contract.getBalance(address);
  const balanceInEther = ethers.utils.formatEther(contractBalance);
  
  // Update database to match
  db.run('UPDATE users SET balance = ?', [balanceInEther]);
  
  // Return contract balance
  res.json({ balance: balanceInEther });
});
```

### Bet Processing (Fixed)
```javascript
app.post('/api/bet', async (req, res) => {
  // ... game logic ...
  
  // Update database
  db.run('UPDATE users SET balance = ?', [newBalance]);
  
  // SYNC WITH CONTRACT
  const balanceInWei = ethers.utils.parseEther(newBalance);
  const tx = await contract.updateBalance(userAddress, balanceInWei);
  await tx.wait();
});
```

## 🔒 Security Considerations

1. **Admin Key**: The backend uses a private key that has admin rights on the contract
2. **Balance Updates**: Only the admin can call updateBalance() on the contract
3. **User Funds**: Users can always emergency withdraw directly from contract
4. **Verification**: All balances can be verified on-chain via Ronin Explorer

## 🚀 Performance Optimization

- **Async Updates**: Contract updates happen async to not block game play
- **Database Cache**: Speeds up balance checks during gameplay
- **Batch Updates**: Could implement batch balance updates for multiple users

## ⚠️ Important Notes

1. **Never Trust Database Alone**: Always verify with contract for deposits/withdrawals
2. **Gas Costs**: Each game costs gas for the contract update (paid by backend)
3. **Fallback**: If contract fails, database provides fallback (marked as "database" source)
4. **Monitoring**: Watch for failed contract updates in logs

## 📊 Testing Checklist

- [x] Deposit funds → Balance shows correctly
- [x] Win game → Contract balance increases
- [x] Lose game → Contract balance decreases  
- [x] Withdraw all → Balance shows 0 (not 6!)
- [x] Multiple games → All sync to contract
- [x] Check on explorer → Matches game balance

---

**Last Updated**: September 2024
**Contract Address**: 0x089d3d51cb3c8ca070d5648C9D1c7d765533E832
**Network**: Ronin Testnet (Saigon)