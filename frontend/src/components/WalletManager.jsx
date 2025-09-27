import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, LogOut, ArrowDownCircle, ArrowUpCircle, RefreshCw } from 'lucide-react';
import { useWeb3 } from '../context/Web3Context';
import toast from 'react-hot-toast';

const WalletManager = () => {
  const { account, balance, connectWallet, disconnectWallet, deposit, withdraw, loading, fetchBalance } = useWeb3();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amount, setAmount] = useState('0.1');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleDeposit = async () => {
    const depositAmount = parseFloat(amount);
    if (depositAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    await deposit(depositAmount);
    setShowDepositModal(false);
    setAmount('0.1');
  };

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount);
    if (withdrawAmount <= 0 || withdrawAmount > parseFloat(balance)) {
      toast.error('Invalid withdrawal amount');
      return;
    }
    
    await withdraw(withdrawAmount);
    setShowWithdrawModal(false);
    setAmount('0.1');
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getWalletName = () => {
    if (window.ronin) return 'Ronin Wallet';
    if (window.ethereum) return 'MetaMask';
    return 'Wallet';
  };

  return (
    <>
      <div className="wallet-manager">
        {!account ? (
          <button className="connect-btn" onClick={connectWallet} disabled={loading}>
            <Wallet size={20} />
            {loading ? 'Connecting...' : `Connect ${getWalletName()}`}
          </button>
        ) : (
          <div className="wallet-info">
            <div className="balance-display">
              <span className="label">Balance:</span>
              <span className="amount">{parseFloat(balance).toFixed(4)} RON</span>
              <button 
                className="sync-btn"
                onClick={async () => {
                  setIsSyncing(true);
                  try {
                    await fetchBalance(account);
                    toast.success('Balance synced from blockchain');
                  } catch (error) {
                    toast.error('Failed to sync balance');
                  } finally {
                    setIsSyncing(false);
                  }
                }}
                disabled={isSyncing || loading}
                title="Sync balance from smart contract"
              >
                <RefreshCw size={16} className={isSyncing ? 'spinning' : ''} />
              </button>
            </div>
            
            <div className="wallet-actions">
              <button 
                className="action-btn deposit"
                onClick={() => setShowDepositModal(true)}
                disabled={loading}
              >
                <ArrowDownCircle size={18} />
                Deposit
              </button>
              
              <button 
                className="action-btn withdraw"
                onClick={() => setShowWithdrawModal(true)}
                disabled={loading}
              >
                <ArrowUpCircle size={18} />
                Withdraw
              </button>
            </div>
            
            <div className="account-info">
              <span className="address">{formatAddress(account)}</span>
              <button className="disconnect-btn" onClick={disconnectWallet}>
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <motion.div 
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowDepositModal(false)}
        >
          <motion.div 
            className="modal-content"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Deposit RON</h2>
            <p>Transfer RON from your wallet to the game</p>
            
            <div className="amount-input">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount in RON"
                min="0.001"
                step="0.1"
              />
              <span className="currency">RON</span>
            </div>
            
            <div className="quick-amounts">
              {[0.1, 0.5, 1, 5, 10].map(val => (
                <button key={val} onClick={() => setAmount(val.toString())}>
                  {val} RON
                </button>
              ))}
            </div>
            
            <div className="modal-actions">
              <button 
                className="cancel-btn"
                onClick={() => setShowDepositModal(false)}
              >
                Cancel
              </button>
              <button 
                className="confirm-btn"
                onClick={handleDeposit}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Deposit'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <motion.div 
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowWithdrawModal(false)}
        >
          <motion.div 
            className="modal-content"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Withdraw RON</h2>
            <p>Transfer RON from the game to your wallet</p>
            <p className="balance-info">Available: {parseFloat(balance).toFixed(4)} RON</p>
            
            <div className="amount-input">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount in RON"
                min="0.001"
                max={balance}
                step="0.1"
              />
              <span className="currency">RON</span>
            </div>
            
            <div className="quick-amounts">
              <button onClick={() => setAmount((parseFloat(balance) * 0.25).toFixed(4))}>
                25%
              </button>
              <button onClick={() => setAmount((parseFloat(balance) * 0.5).toFixed(4))}>
                50%
              </button>
              <button onClick={() => setAmount((parseFloat(balance) * 0.75).toFixed(4))}>
                75%
              </button>
              <button onClick={() => setAmount(balance)}>
                Max
              </button>
            </div>
            
            <div className="modal-actions">
              <button 
                className="cancel-btn"
                onClick={() => setShowWithdrawModal(false)}
              >
                Cancel
              </button>
              <button 
                className="confirm-btn"
                onClick={handleWithdraw}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Withdraw'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
};

export default WalletManager;