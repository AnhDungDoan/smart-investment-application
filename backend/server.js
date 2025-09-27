const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { ethers } = require('ethers');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
// const rateLimit = require('express-rate-limit'); // DISABLED
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// RATE LIMITING DISABLED FOR DEMO/DEVELOPMENT
// Uncomment the following if you want to enable rate limiting in production:
/*
const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: 'Too many requests, please try again later.'
});

const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts, please try again later.'
});

const readLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please slow down.'
});
*/

// Middleware - Allow all origins for ngrok
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);
    
    // Allow localhost, ngrok, and cloudflare domains
    const allowedPatterns = [
      /^http:\/\/localhost(:\d+)?$/,
      /^https?:\/\/.*\.ngrok\.io$/,
      /^https?:\/\/.*\.ngrok-free\.app$/,
      /^https?:\/\/.*\.loca\.lt$/,
      /^https?:\/\/.*\.trycloudflare\.com$/,
      /^https?:\/\/.*\.cloudflare\.com$/,
    ];
    
    const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
    
    if (isAllowed || process.env.CORS_ORIGIN === '*') {
      callback(null, true);
    } else if (process.env.CORS_ORIGIN && origin === process.env.CORS_ORIGIN) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // For development, allow all origins
    }
  },
  credentials: true
}));
app.use(bodyParser.json());

// Apply rate limiters to specific routes
// Don't apply general limiter to all /api/ routes anymore
// We'll apply specific limiters to individual endpoints

// Initialize SQLite database
const db = new sqlite3.Database('./dice_game.db');

// Create tables
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      address TEXT UNIQUE NOT NULL,
      username TEXT,
      balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Game history table
  db.run(`
    CREATE TABLE IF NOT EXISTS game_history (
      id TEXT PRIMARY KEY,
      user_address TEXT NOT NULL,
      bet_amount REAL NOT NULL,
      bet_type TEXT NOT NULL,
      dice_result TEXT NOT NULL,
      won BOOLEAN NOT NULL,
      payout REAL NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_address) REFERENCES users (address)
    )
  `);

  // Sessions table
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_address TEXT NOT NULL,
      token TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      FOREIGN KEY (user_address) REFERENCES users (address)
    )
  `);
});

// Contract setup
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const CONTRACT_ABI = [
  "function balances(address) view returns (uint256)",
  "function updateBalance(address user, uint256 newBalance)",
  "function getBalance(address user) view returns (uint256)"
];

const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Auth endpoints - Rate limiting disabled
app.post('/api/auth/login', async (req, res) => {
  const { address, signature } = req.body;
  
  try {
    // Verify signature (simplified for demo)
    // In production, you'd verify the signature properly
    const message = `Login to Dice Game at ${new Date().toISOString()}`;
    
    // Check if user exists, if not create
    db.get('SELECT * FROM users WHERE address = ?', [address], (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!user) {
        const userId = uuidv4();
        db.run('INSERT INTO users (id, address, balance) VALUES (?, ?, ?)', 
          [userId, address, 0], 
          (insertErr) => {
            if (insertErr && !insertErr.message.includes('UNIQUE')) {
              console.error('Error creating user:', insertErr);
            }
            
            // Generate JWT token regardless (user might already exist)
            const token = jwt.sign({ address }, process.env.JWT_SECRET, { expiresIn: '24h' });
            res.json({ token, address });
          }
        );
      } else {
        // User exists, just generate token
        const token = jwt.sign({ address }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, address });
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get user balance - ALWAYS fetch from smart contract as source of truth
app.get('/api/balance/:address', authenticateToken, async (req, res) => {
  try {
    // ALWAYS get the latest balance from the smart contract (source of truth)
    const contractBalance = await contract.getBalance(req.params.address);
    const contractBalanceEther = parseFloat(ethers.utils.formatEther(contractBalance));
    
    console.log(`Fetching balance for ${req.params.address}: Contract = ${contractBalanceEther} RON`);
    
    // Update database to match contract (contract is always the source of truth)
    db.run('UPDATE users SET balance = ? WHERE address = ?', 
      [contractBalanceEther, req.params.address],
      (err) => {
        if (err) {
          console.error('Error updating database balance:', err);
        }
      }
    );
    
    // Return the contract balance (source of truth)
    res.json({ 
      balance: contractBalanceEther.toString(),
      address: req.params.address,
      source: 'contract' // Indicate balance is from contract
    });
    
  } catch (error) {
    console.error('Balance fetch error:', error);
    
    // Fallback to database if contract fails
    db.get('SELECT balance FROM users WHERE address = ?', [req.params.address], (err, user) => {
      if (err || !user) {
        return res.status(500).json({ error: 'Failed to get balance' });
      }
      
      res.json({ 
        balance: (user.balance || 0).toString(),
        address: req.params.address,
        source: 'database' // Indicate this is from database (fallback)
      });
    });
  }
});

// Dice game logic
function rollDice() {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1
  ];
}

function calculateResult(dice) {
  const sum = dice.reduce((a, b) => a + b, 0);
  return {
    dice,
    sum,
    isHigh: sum >= 11, // 11-18 is "Tài" (High)
    isLow: sum >= 3 && sum <= 10, // 3-10 is "Xỉu" (Low)
    isTriple: dice[0] === dice[1] && dice[1] === dice[2]
  };
}

// Place bet endpoint - Rate limiting disabled
app.post('/api/bet', authenticateToken, async (req, res) => {
  const { amount, betType } = req.body; // betType: 'high' or 'low'
  const userAddress = req.user.address;
  
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid bet amount' });
  }
  
  if (!['high', 'low'].includes(betType)) {
    return res.status(400).json({ error: 'Invalid bet type' });
  }
  
  // Get user's current balance from database
  db.get('SELECT balance FROM users WHERE address = ?', [userAddress], async (err, user) => {
    if (err || !user) {
      return res.status(500).json({ error: 'User not found' });
    }
    
    const currentBalance = user.balance || 0;
    
    if (currentBalance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    try {
      // Roll the dice
      const diceRoll = rollDice();
      const result = calculateResult(diceRoll);
      
      // Determine if player won
      let won = false;
      let payout = 0;
      
      // Triple always loses for the house
      if (result.isTriple) {
        won = false;
        payout = 0;
      } else if (betType === 'high' && result.isHigh) {
        won = true;
        payout = amount * 2; // 1:1 payout
      } else if (betType === 'low' && result.isLow) {
        won = true;
        payout = amount * 2; // 1:1 payout
      }
      
      // Calculate new balance
      const newBalance = won ? 
        currentBalance - amount + payout : 
        currentBalance - amount;
      
      // Update balance in database
      db.run('UPDATE users SET balance = ? WHERE address = ?', [newBalance, userAddress]);
      
      // IMPORTANT: Sync balance with smart contract
      try {
        // Convert balance to Wei (contract uses Wei, not ETH)
        const balanceInWei = ethers.utils.parseEther(newBalance.toString());
        
        console.log(`Updating contract balance for ${userAddress}: ${newBalance} RON (${balanceInWei.toString()} Wei)`);
        
        // Get current gas price and increase it
        const gasPrice = await provider.getGasPrice();
        const increasedGasPrice = gasPrice.mul(2); // Double the gas price for Ronin
        
        // Call updateBalance on the smart contract with increased gas
        const tx = await contract.updateBalance(userAddress, balanceInWei, {
          gasPrice: increasedGasPrice,
          gasLimit: 100000 // Set a reasonable gas limit
        });
        await tx.wait(); // Wait for transaction to be mined
        
        console.log(`✅ Contract balance updated. TX Hash: ${tx.hash}`);
      } catch (contractError) {
        console.error('⚠️ Failed to update contract balance:', contractError);
        // Note: We continue even if contract update fails to not break the game
        // In production, you might want to handle this differently
      }
    
    // Record game in database
    const gameId = uuidv4();
    db.run(
      `INSERT INTO game_history (id, user_address, bet_amount, bet_type, dice_result, won, payout) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [gameId, userAddress, amount, betType, JSON.stringify(diceRoll), won, payout],
      (err) => {
        if (err) console.error('Error recording game:', err);
      }
    );
    
      res.json({
        gameId,
        dice: diceRoll,
        sum: result.sum,
        betType,
        betAmount: amount,
        won,
        payout,
        newBalance,
        isTriple: result.isTriple
      });
      
    } catch (error) {
      console.error('Bet error:', error);
      res.status(500).json({ error: 'Failed to process bet' });
    }
  });
});

// Get game history - Rate limiting disabled
app.get('/api/history/:address', authenticateToken, (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  
  db.all(
    `SELECT * FROM game_history 
     WHERE user_address = ? 
     ORDER BY timestamp DESC 
     LIMIT ?`,
    [req.params.address, limit],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to get history' });
      }
      
      const history = rows.map(row => ({
        ...row,
        dice_result: JSON.parse(row.dice_result)
      }));
      
      res.json(history);
    }
  );
});

// Get global statistics
app.get('/api/stats', (req, res) => {
  db.all(
    `SELECT 
      COUNT(*) as total_games,
      SUM(CASE WHEN won = 1 THEN 1 ELSE 0 END) as total_wins,
      SUM(bet_amount) as total_wagered,
      SUM(payout) as total_payouts
     FROM game_history
     WHERE timestamp > datetime('now', '-24 hours')`,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to get stats' });
      }
      
      res.json({
        daily: rows[0] || {},
        timestamp: new Date()
      });
    }
  );
});

// Get profit leaderboard - Rate limiting disabled
app.get('/api/leaderboard', (req, res) => {
  const timeframe = req.query.timeframe || 'all'; // all, daily, weekly, monthly
  
  let timeCondition = '';
  const now = Date.now();
  
  switch(timeframe) {
    case 'daily':
      timeCondition = `WHERE gh.timestamp > ${now - 24 * 60 * 60 * 1000}`;
      break;
    case 'weekly':
      timeCondition = `WHERE gh.timestamp > ${now - 7 * 24 * 60 * 60 * 1000}`;
      break;
    case 'monthly':
      timeCondition = `WHERE gh.timestamp > ${now - 30 * 24 * 60 * 60 * 1000}`;
      break;
    default:
      timeCondition = '';
  }
  
  db.all(
    `SELECT 
      gh.user_address,
      SUBSTR(gh.user_address, 1, 6) || '...' || SUBSTR(gh.user_address, -4) as display_address,
      COUNT(*) as total_games,
      SUM(CASE WHEN gh.won = 1 THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN gh.won = 0 THEN 1 ELSE 0 END) as losses,
      ROUND(CAST(SUM(CASE WHEN gh.won = 1 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 2) as win_rate,
      SUM(gh.bet_amount) as total_wagered,
      SUM(gh.payout - gh.bet_amount) as profit,
      MAX(gh.payout - gh.bet_amount) as biggest_win,
      MIN(CASE WHEN gh.won = 0 THEN -gh.bet_amount ELSE NULL END) as biggest_loss
     FROM game_history gh
     ${timeCondition}
     GROUP BY gh.user_address
     ORDER BY profit DESC
     LIMIT 20`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Leaderboard error:', err);
        return res.status(500).json({ error: 'Failed to fetch leaderboard' });
      }
      
      // Add ranking
      const rankedRows = rows.map((row, index) => ({
        ...row,
        rank: index + 1
      }));
      
      res.json(rankedRows);
    }
  );
});

// Get recent games (for live feed)
app.get('/api/recent-games', (req, res) => {
  db.all(
    `SELECT 
      gh.dice_result,
      gh.bet_type,
      gh.bet_amount,
      gh.won,
      gh.payout,
      gh.timestamp,
      u.username,
      SUBSTR(gh.user_address, 1, 6) || '...' || SUBSTR(gh.user_address, -4) as display_address
     FROM game_history gh
     JOIN users u ON gh.user_address = u.address
     ORDER BY gh.timestamp DESC
     LIMIT 10`,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to get recent games' });
      }
      
      const games = rows.map(row => ({
        ...row,
        dice_result: JSON.parse(row.dice_result)
      }));
      
      res.json(games);
    }
  );
});

// Handle deposits - sync contract balance to local database
app.post('/api/sync-deposit', authenticateToken, async (req, res) => {
  const userAddress = req.user.address;
  
  try {
    // Get contract balance
    const contractBalance = await contract.getBalance(userAddress);
    const contractBalanceEther = parseFloat(ethers.utils.formatEther(contractBalance));
    
    console.log(`Syncing deposit for ${userAddress}: Contract balance = ${contractBalanceEther} RON`);
    
    // Update local database balance to match contract
    db.run('UPDATE users SET balance = ? WHERE address = ?', 
      [contractBalanceEther, userAddress], 
      (err) => {
        if (err) {
          console.error('Error updating balance:', err);
          return res.status(500).json({ error: 'Failed to sync deposit' });
        }
        
        console.log(`✅ Database balance synced: ${contractBalanceEther} RON`);
        
        res.json({ 
          success: true, 
          balance: contractBalanceEther,
          message: 'Deposit synced successfully'
        });
      }
    );
  } catch (error) {
    console.error('Sync deposit error:', error);
    res.status(500).json({ error: 'Failed to sync deposit' });
  }
});

// Handle withdrawals - update both database and contract when user withdraws
app.post('/api/sync-withdraw', authenticateToken, async (req, res) => {
  const userAddress = req.user.address;
  const { amount } = req.body;
  
  db.get('SELECT balance FROM users WHERE address = ?', [userAddress], async (err, user) => {
    if (err || !user) {
      return res.status(500).json({ error: 'User not found' });
    }
    
    const currentBalance = user.balance || 0;
    
    if (currentBalance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    const newBalance = currentBalance - amount;
    
    // Update database balance
    db.run('UPDATE users SET balance = ? WHERE address = ?', 
      [newBalance, userAddress], 
      async (updateErr) => {
        if (updateErr) {
          console.error('Error updating balance:', updateErr);
          return res.status(500).json({ error: 'Failed to sync withdrawal' });
        }
        
        // IMPORTANT: Also update smart contract balance
        try {
          const balanceInWei = ethers.utils.parseEther(newBalance.toString());
          console.log(`Updating contract balance for withdrawal ${userAddress}: ${newBalance} RON`);
          
          const tx = await contract.updateBalance(userAddress, balanceInWei);
          await tx.wait();
          
          console.log(`✅ Contract balance updated for withdrawal. TX Hash: ${tx.hash}`);
        } catch (contractError) {
          console.error('⚠️ Failed to update contract balance on withdrawal:', contractError);
        }
        
        res.json({ 
          success: true, 
          balance: newBalance,
          message: 'Withdrawal synced successfully'
        });
      }
    );
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Contract address: ${process.env.CONTRACT_ADDRESS}`);
});