import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useWeb3 } from '../context/Web3Context';
import { BACKEND_URL } from '../config/constants';

const CasinoDiceGame = () => {
  const { account, balance, fetchBalance } = useWeb3();
  const [betAmount, setBetAmount] = useState(1000);
  const [betType, setBetType] = useState(null); // 'tai' or 'xiu'
  const [isRolling, setIsRolling] = useState(false);
  const [diceResult, setDiceResult] = useState([1, 2, 3]);
  const [showResult, setShowResult] = useState(false);
  const [gameHistory, setGameHistory] = useState([]);
  const [totalBets, setTotalBets] = useState({ tai: 0, xiu: 0 });
  const [playerBets, setPlayerBets] = useState({ tai: 0, xiu: 0 });
  const [countdown, setCountdown] = useState(null);
  const [gameNumber, setGameNumber] = useState(279730);

  // Quick bet amounts
  const quickBets = [
    { label: '1K', value: 1000 },
    { label: '10K', value: 10000 },
    { label: '50K', value: 50000 },
    { label: '100K', value: 100000 },
    { label: '500K', value: 500000 },
    { label: '5M', value: 5000000 },
    { label: '10M', value: 10000000 },
    { label: '50M', value: 50000000 }
  ];

  useEffect(() => {
    if (account) {
      fetchGameHistory();
    }
    // Simulate game number increment
    const interval = setInterval(() => {
      setGameNumber(prev => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, [account]);

  const fetchGameHistory = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/history/${account}`);
      setGameHistory(response.data);
      
      // Calculate total bets from history
      const taiTotal = response.data
        .filter(g => g.bet_type === 'high')
        .reduce((sum, g) => sum + g.bet_amount, 0);
      const xiuTotal = response.data
        .filter(g => g.bet_type === 'low')
        .reduce((sum, g) => sum + g.bet_amount, 0);
      
      setTotalBets({
        tai: Math.floor(taiTotal * 1000000),
        xiu: Math.floor(xiuTotal * 1000000)
      });
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const placeBet = (type) => {
    if (!account) {
      toast.error('Vui lòng kết nối ví!');
      return;
    }

    if (betAmount <= 0 || betAmount > parseFloat(balance) * 1000000) {
      toast.error('Số tiền cược không hợp lệ!');
      return;
    }

    setBetType(type);
    setPlayerBets(prev => ({
      ...prev,
      [type]: prev[type] + betAmount
    }));
  };

  const rollDice = async () => {
    if (!betType || playerBets.tai === 0 && playerBets.xiu === 0) {
      toast.error('Vui lòng đặt cược!');
      return;
    }

    setIsRolling(true);
    setShowResult(false);
    setCountdown(3);

    // Countdown animation
    const countInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countInterval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    // Animation for rolling dice
    const rollAnimation = setInterval(() => {
      setDiceResult([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
      ]);
    }, 100);

    try {
      // Get auth token first
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        // Authenticate first
        const authResponse = await axios.post(`${BACKEND_URL}/api/authenticate`, {
          address: account,
          signature: 'demo-signature'
        });
        localStorage.setItem('authToken', authResponse.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${authResponse.data.token}`;
      } else {
        axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      }

      // Determine which bet to process
      const actualBetType = playerBets.tai > 0 ? 'high' : 'low';
      const actualBetAmount = (playerBets.tai > 0 ? playerBets.tai : playerBets.xiu) / 1000000;

      const response = await axios.post(`${BACKEND_URL}/api/bet`, {
        amount: actualBetAmount,
        betType: actualBetType
      });

      setTimeout(() => {
        clearInterval(rollAnimation);
        setDiceResult(response.data.dice);
        setShowResult(true);
        
        const sum = response.data.sum;
        const winType = sum >= 11 ? 'tai' : 'xiu';
        
        if (response.data.won) {
          toast.success(`🎉 THẮNG ${formatNumber(response.data.payout * 1000000)}!`);
        } else {
          toast.error(`Thua ${formatNumber(actualBetAmount * 1000000)}`);
        }

        // Update total bets
        setTotalBets(prev => ({
          tai: winType === 'tai' ? prev.tai + Math.floor(response.data.payout * 500000) : prev.tai,
          xiu: winType === 'xiu' ? prev.xiu + Math.floor(response.data.payout * 500000) : prev.xiu
        }));

        fetchBalance(account);
        fetchGameHistory();
        
        // Reset player bets
        setPlayerBets({ tai: 0, xiu: 0 });
        setBetType(null);
      }, 3000);

    } catch (error) {
      clearInterval(rollAnimation);
      setIsRolling(false);
      toast.error('Lỗi đặt cược!');
    } finally {
      setTimeout(() => {
        setIsRolling(false);
      }, 3500);
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
      <svg width="60" height="60" viewBox="0 0 100 100">
        <rect 
          width="100" 
          height="100" 
          rx="15" 
          fill="#FF0000"
          stroke="#8B0000"
          strokeWidth="2"
        />
        {dots[value].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="10" fill="white" />
        ))}
      </svg>
    );
  };

  return (
    <div className="casino-dice-container">
      {/* Header with game info */}
      <div className="casino-header">
        <div className="game-logo">
          <span className="logo-tai">TÀI</span>
          <span className="logo-xiu">XỈU</span>
          <span className="logo-md">MD5</span>
        </div>
        <div className="game-info">
          <span className="game-number">#{gameNumber}</span>
        </div>
        <div className="player-balance">
          <span className="balance-amount">{formatNumber(parseFloat(balance) * 1000000)}</span>
          <span className="balance-label">RON</span>
        </div>
      </div>

      {/* Main game board */}
      <div className="casino-game-board">
        {/* TAI section */}
        <div className={`bet-section tai-section ${betType === 'tai' ? 'active' : ''}`}>
          <h2 className="section-title">TÀI</h2>
          <div className="section-info">
            <div className="total-bet">{formatNumber(totalBets.tai)}</div>
            <div className="bet-range">11 - 17</div>
          </div>
          <button 
            className="bet-button"
            onClick={() => placeBet('tai')}
            disabled={isRolling}
          >
            CƯỢC
          </button>
          {playerBets.tai > 0 && (
            <div className="player-bet-amount">{formatNumber(playerBets.tai)}</div>
          )}
        </div>

        {/* Center dice area */}
        <div className="dice-area">
          <div className="dice-circle">
            {countdown && (
              <motion.div 
                className="countdown"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                {countdown}
              </motion.div>
            )}
            
            <AnimatePresence>
              {!countdown && (
                <div className="dice-group">
                  {diceResult.map((value, index) => (
                    <motion.div
                      key={index}
                      className="dice"
                      animate={{
                        rotate: isRolling ? [0, 360] : 0,
                        scale: isRolling ? [1, 1.2, 1] : 1
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
                </div>
              )}
            </AnimatePresence>

            {showResult && !isRolling && (
              <motion.div 
                className="dice-sum"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {diceResult.reduce((a, b) => a + b, 0)}
              </motion.div>
            )}
          </div>
        </div>

        {/* XIU section */}
        <div className={`bet-section xiu-section ${betType === 'xiu' ? 'active' : ''}`}>
          <h2 className="section-title">XỈU</h2>
          <div className="section-info">
            <div className="total-bet">{formatNumber(totalBets.xiu)}</div>
            <div className="bet-range">4 - 10</div>
          </div>
          <button 
            className="bet-button"
            onClick={() => placeBet('xiu')}
            disabled={isRolling}
          >
            CƯỢC
          </button>
          {playerBets.xiu > 0 && (
            <div className="player-bet-amount">{formatNumber(playerBets.xiu)}</div>
          )}
        </div>
      </div>

      {/* Quick bet buttons */}
      <div className="quick-bet-container">
        <div className="quick-bet-buttons">
          {quickBets.map(({ label, value }) => (
            <button
              key={label}
              className="quick-bet-btn"
              onClick={() => setBetAmount(value)}
              disabled={isRolling}
            >
              {label}
            </button>
          ))}
        </div>
        
        <div className="bet-controls">
          <button 
            className="all-in-btn" 
            onClick={() => {
              const maxBet = parseFloat(balance) * 1000000;
              setBetAmount(maxBet);
              if (betType) {
                setPlayerBets({ 
                  tai: betType === 'tai' ? maxBet : 0, 
                  xiu: betType === 'xiu' ? maxBet : 0 
                });
              }
            }}
            disabled={isRolling}
          >
            ALL-IN
          </button>
          <button 
            className="roll-btn"
            onClick={rollDice}
            disabled={isRolling || (playerBets.tai === 0 && playerBets.xiu === 0)}
          >
            {isRolling ? 'ĐANG LẮC...' : 'ĐẶT CƯỢC'}
          </button>
          <button 
            className="clear-btn"
            onClick={() => {
              setPlayerBets({ tai: 0, xiu: 0 });
              setBetType(null);
            }}
            disabled={isRolling}
          >
            HỦY
          </button>
        </div>
      </div>

      {/* Game history dots */}
      <div className="history-dots">
        {gameHistory.slice(0, 20).map((game, index) => (
          <div
            key={index}
            className={`history-dot ${
              game.dice_result.reduce((a, b) => a + b, 0) >= 11 ? 'tai' : 'xiu'
            }`}
            title={`${game.dice_result.join(', ')} = ${game.dice_result.reduce((a, b) => a + b, 0)}`}
          />
        ))}
      </div>
    </div>
  );
};

export default CasinoDiceGame;