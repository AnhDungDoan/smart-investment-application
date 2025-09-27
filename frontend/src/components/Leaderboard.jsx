import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Trophy, TrendingUp, TrendingDown, Award, Target } from 'lucide-react';
import { BACKEND_URL } from '../config/constants';

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [timeframe, setTimeframe] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [timeframe]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/leaderboard`, {
        params: { timeframe }
      });
      setLeaderboardData(response.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatRON = (amount) => {
    if (!amount) return '0.00';
    return parseFloat(amount).toFixed(3);
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy className="rank-icon gold" size={24} />;
      case 2:
        return <Trophy className="rank-icon silver" size={20} />;
      case 3:
        return <Trophy className="rank-icon bronze" size={18} />;
      default:
        return <span className="rank-number">#{rank}</span>;
    }
  };

  const getRankClass = (rank) => {
    switch (rank) {
      case 1:
        return 'rank-1';
      case 2:
        return 'rank-2';
      case 3:
        return 'rank-3';
      default:
        return '';
    }
  };

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h2>
          <Trophy size={28} />
          PROFIT LEADERBOARD
        </h2>
        
        <div className="timeframe-selector">
          <button
            className={timeframe === 'daily' ? 'active' : ''}
            onClick={() => setTimeframe('daily')}
          >
            Daily
          </button>
          <button
            className={timeframe === 'weekly' ? 'active' : ''}
            onClick={() => setTimeframe('weekly')}
          >
            Weekly
          </button>
          <button
            className={timeframe === 'monthly' ? 'active' : ''}
            onClick={() => setTimeframe('monthly')}
          >
            Monthly
          </button>
          <button
            className={timeframe === 'all' ? 'active' : ''}
            onClick={() => setTimeframe('all')}
          >
            All Time
          </button>
        </div>
      </div>

      {loading ? (
        <div className="leaderboard-loading">
          <div className="dice-loader">
            <span>🎲</span>
            <span>🎲</span>
            <span>🎲</span>
          </div>
        </div>
      ) : (
        <div className="leaderboard-content">
          {leaderboardData.length === 0 ? (
            <div className="no-data">
              <p>No games played yet in this timeframe</p>
              <p>Be the first to make it to the leaderboard!</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div 
                className="leaderboard-table"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                key={timeframe}
              >
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Player</th>
                      <th>Profit</th>
                      <th>Win Rate</th>
                      <th>Games</th>
                      <th>Wagered</th>
                      <th>Best Win</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.map((player, index) => (
                      <motion.tr
                        key={player.user_address}
                        className={getRankClass(player.rank)}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <td className="rank-cell">
                          {getRankIcon(player.rank)}
                        </td>
                        <td className="player-cell">
                          <span className="address">{player.display_address}</span>
                          {player.rank <= 3 && (
                            <Award className="top-player-badge" size={16} />
                          )}
                        </td>
                        <td className={`profit-cell ${player.profit >= 0 ? 'positive' : 'negative'}`}>
                          {player.profit >= 0 ? (
                            <TrendingUp size={16} />
                          ) : (
                            <TrendingDown size={16} />
                          )}
                          {formatRON(player.profit)} RON
                        </td>
                        <td className="winrate-cell">
                          <div className="winrate-bar">
                            <div 
                              className="winrate-fill"
                              style={{ width: `${player.win_rate}%` }}
                            />
                            <span>{player.win_rate}%</span>
                          </div>
                        </td>
                        <td className="games-cell">
                          <span className="wins">{player.wins}W</span>
                          <span className="separator">/</span>
                          <span className="losses">{player.losses}L</span>
                        </td>
                        <td className="wagered-cell">
                          {formatRON(player.total_wagered)} RON
                        </td>
                        <td className="best-win-cell">
                          {player.biggest_win > 0 ? `+${formatRON(player.biggest_win)}` : '-'}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}

      <div className="leaderboard-footer">
        <p>
          <Target size={16} />
          Top players ranked by total profit
        </p>
        {leaderboardData.length > 0 && (
          <p className="update-info">
            Updates every 30 seconds
          </p>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;