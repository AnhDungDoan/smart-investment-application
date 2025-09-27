import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useWeb3 } from '../context/Web3Context';
import { BACKEND_URL } from '../config/constants';

const DiceGame = () => {
  const { account, balance, fetchBalance } = useWeb3();
  const [betAmount, setBetAmount] = useState(1);
  const [betType, setBetType] = useState('high'); // 'high' (Tài) or 'low' (Xỉu)
  const [isRolling, setIsRolling] = useState(false);
  const [diceResult, setDiceResult] = useState([1, 1, 1]);
  const [lastResult, setLastResult] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (account) {
      fetchGameHistory();
    }
  }, [account]);

  const fetchGameHistory = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/history/${account}`);
      setGameHistory(response.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const rollDice = async () => {
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (betAmount <= 0 || betAmount > parseFloat(balance)) {
      toast.error('Invalid bet amount');
      return;
    }

    setIsRolling(true);
    setShowResult(false);

    // Animation for rolling dice with variable speed
    const rollAnimation = setInterval(() => {
      setDiceResult([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
      ]);
    }, 80); // Faster animation for more excitement

    try {
      const response = await axios.post(`${BACKEND_URL}/api/bet`, {
        amount: betAmount,
        betType
      });

      // Stop animation and show result after 2 seconds
      setTimeout(() => {
        clearInterval(rollAnimation);
        setDiceResult(response.data.dice);
        setLastResult(response.data);
        setShowResult(true);
        
        if (response.data.won) {
          toast.success(`You won ${response.data.payout} RON!`);
        } else {
          toast.error(`You lost ${response.data.betAmount} RON`);
        }

        fetchBalance(account);
        fetchGameHistory();
      }, 2000);

    } catch (error) {
      clearInterval(rollAnimation);
      setIsRolling(false);
      console.error('Bet error:', error);
      toast.error(error.response?.data?.error || 'Failed to place bet');
    } finally {
      setTimeout(() => {
        setIsRolling(false);
      }, 2500);
    }
  };

  const getDiceImage = (value) => {
    const dots = {
      1: [[50, 50]],
      2: [[30, 30], [70, 70]],
      3: [[30, 30], [50, 50], [70, 70]],
      4: [[30, 30], [70, 30], [30, 70], [70, 70]],
      5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
      6: [[30, 30], [70, 30], [30, 50], [70, 50], [30, 70], [70, 70]]
    };

    return (
      <svg width="80" height="80" viewBox="0 0 100 100">
        <rect width="100" height="100" rx="15" fill="white" stroke="#8B0000" strokeWidth="2"/>
        {dots[value].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="8" fill="#8B0000" />
        ))}
      </svg>
    );
  };

  return (
    <div className="dice-game">
      {/* Game Board */}
      <div className="game-board">
        <div className="dice-container">
          <AnimatePresence>
            {diceResult.map((value, index) => (
              <motion.div
                key={index}
                className="dice"
                animate={{
                  rotateX: isRolling ? [0, 360] : 0,
                  rotateY: isRolling ? [0, 360] : 0,
                }}
                transition={{
                  duration: 0.5,
                  repeat: isRolling ? Infinity : 0,
                  ease: "linear"
                }}
              >
                {getDiceImage(value)}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {showResult && lastResult && (
          <motion.div 
            className="result-display"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className={lastResult.won ? 'win' : 'lose'}>
              {lastResult.sum} - {lastResult.sum >= 11 ? 'TÀI' : 'XỈU'}
            </h2>
            <p>{lastResult.won ? `WON ${lastResult.payout} RON!` : `Lost ${lastResult.betAmount} RON`}</p>
            {lastResult.isTriple && <p className="triple">TRIPLE!</p>}
          </motion.div>
        )}
      </div>

      {/* Betting Controls */}
      <div className="betting-controls">
        <div className="bet-type-selector">
          <button
            className={`bet-type-btn tai ${betType === 'high' ? 'active' : ''}`}
            onClick={() => setBetType('high')}
            disabled={isRolling}
          >
            TÀI
            <span>(11-17)</span>
          </button>
          <button
            className={`bet-type-btn xiu ${betType === 'low' ? 'active' : ''}`}
            onClick={() => setBetType('low')}
            disabled={isRolling}
          >
            XỈU
            <span>(4-10)</span>
          </button>
        </div>

        <div className="bet-amount-control">
          <label>Bet Amount (RON)</label>
          <div className="amount-input-group">
            <button onClick={() => setBetAmount(Math.max(0.1, betAmount - 1))} disabled={isRolling}>
              -
            </button>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
              min="0.1"
              step="0.1"
              disabled={isRolling}
            />
            <button onClick={() => setBetAmount(betAmount + 1)} disabled={isRolling}>
              +
            </button>
          </div>
          <div className="quick-amounts">
            {[0.1, 0.5, 1, 2, 5, 10, 100].map(amount => (
              <button
                key={amount}
                onClick={() => setBetAmount(amount)}
                disabled={isRolling}
              >
                {amount} RON
              </button>
            ))}
          </div>
        </div>

        <button
          className="roll-button"
          onClick={rollDice}
          disabled={isRolling || !account}
        >
          {isRolling ? 'ROLLING...' : 'ROLL DICE'}
        </button>
      </div>

      {/* Game History */}
      <div className="game-history">
        <h3>Your Recent Games</h3>
        <div className="history-table">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Dice</th>
                <th>Sum</th>
                <th>Bet</th>
                <th>Amount</th>
                <th>Result</th>
                <th>Payout</th>
              </tr>
            </thead>
            <tbody>
              {gameHistory.slice(0, 10).map((game) => (
                <tr key={game.id} className={game.won ? 'win' : 'lose'}>
                  <td>{new Date(game.timestamp).toLocaleTimeString()}</td>
                  <td>{game.dice_result.join(', ')}</td>
                  <td>{game.dice_result.reduce((a, b) => a + b, 0)}</td>
                  <td>{game.bet_type === 'high' ? 'TÀI' : 'XỈU'}</td>
                  <td>{game.bet_amount} RON</td>
                  <td>{game.won ? 'WIN' : 'LOSE'}</td>
                  <td>{game.payout} RON</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DiceGame;