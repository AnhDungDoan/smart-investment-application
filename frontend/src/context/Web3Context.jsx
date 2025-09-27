import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  CONTRACT_ADDRESS, 
  CONTRACT_ABI, 
  BACKEND_URL, 
  RONIN_TESTNET_CONFIG,
  RONIN_TESTNET_CHAIN_ID 
} from '../config/constants';
import { connectRoninWallet, isRoninWalletInstalled } from '../utils/roninWalletHelper';

const Web3Context = createContext();

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within Web3Provider');
  }
  return context;
};

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Detect wallet provider function - defined outside to be accessible everywhere
  const detectWalletProvider = () => {
    // Check for Ronin Wallet first
    if (window.ronin) {
      console.log('Ronin Wallet detected');
      return window.ronin.provider;
    }
    // Check for MetaMask
    else if (window.ethereum) {
      console.log('MetaMask or other Web3 wallet detected');
      return window.ethereum;
    }
    console.log('No wallet detected');
    return null;
  };

  // Setup axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, [token]);

  // Check if wallet is connected on mount
  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    const walletProvider = detectWalletProvider();
    if (walletProvider) {
      try {
        const accounts = await walletProvider.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          await connectWallet();
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  };

  const switchToRoninTestnet = async (walletProvider) => {
    try {
      await walletProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: RONIN_TESTNET_CHAIN_ID }],
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added
      if (switchError.code === 4902) {
        try {
          await walletProvider.request({
            method: 'wallet_addEthereumChain',
            params: [RONIN_TESTNET_CONFIG],
          });
        } catch (addError) {
          throw addError;
        }
      }
      throw switchError;
    }
  };

  const connectWallet = async () => {
    console.log('Starting wallet connection...');
    
    setLoading(true);
    let walletProvider;
    let accounts;
    
    try {
      // Special handling for Ronin Wallet
      if (isRoninWalletInstalled()) {
        console.log('Using Ronin Wallet helper...');
        try {
          const roninConnection = await connectRoninWallet();
          walletProvider = roninConnection.provider;
          accounts = roninConnection.accounts;
          console.log('Ronin Wallet connected successfully:', accounts);
        } catch (roninError) {
          console.error('Ronin Wallet connection failed:', roninError);
          throw roninError;
        }
      } else {
        // Fall back to standard Web3 provider (MetaMask, etc.)
        walletProvider = detectWalletProvider();
        
        if (!walletProvider) {
          toast.error('Please install Ronin Wallet or MetaMask!');
          setLoading(false);
          return;
        }
        
        console.log('Using standard Web3 provider...');
        // Request accounts
        console.log('Requesting accounts...');
        accounts = await walletProvider.request({ 
          method: 'eth_requestAccounts' 
        });
        console.log('Accounts received:', accounts);
      }
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your wallet.');
      }
      
      // Switch to Ronin Testnet AFTER getting accounts
      console.log('Switching to Ronin Testnet...');
      await switchToRoninTestnet(walletProvider);

      const userAddress = accounts[0];
      setAccount(userAddress);

      // Setup provider and signer
      const web3Provider = new ethers.providers.Web3Provider(walletProvider);
      const web3Signer = web3Provider.getSigner();
      
      setProvider(web3Provider);
      setSigner(web3Signer);

      // Setup contract
      const diceContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        web3Signer
      );
      setContract(diceContract);

      // Login to backend (simplified - in production, use proper signature)
      try {
        console.log('Attempting to login to backend:', BACKEND_URL);
        console.log('User address:', userAddress);
        
        const loginData = {
          address: userAddress,
          signature: 'demo' // In production, sign a message
        };
        console.log('Login data:', loginData);
        
        const response = await axios.post(`${BACKEND_URL}/api/auth/login`, loginData);
        console.log('Login response:', response.data);

        const { token: authToken } = response.data;
        localStorage.setItem('token', authToken);
        setToken(authToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

        // Fetch balance
        await fetchBalance(userAddress);
        
        toast.success('Wallet connected successfully!');
      } catch (loginError) {
        console.error('Backend login error:', loginError);
        console.error('Error response:', loginError.response);
        console.error('Error details:', loginError.response?.data || loginError.message);
        console.error('Error status:', loginError.response?.status);
        console.error('Error URL:', loginError.config?.url);
        toast.error(loginError.response?.data?.error || 'Failed to authenticate with server');
      }

    } catch (error) {
      console.error('Error connecting wallet:', error);
      let errorMessage = 'Failed to connect wallet';
      
      if (error.code === -32002) {
        errorMessage = 'Please check your wallet for a pending connection request';
      } else if (error.code === 4001) {
        errorMessage = 'Connection request rejected';
      } else if (error.code === -32603) {
        // Ronin specific error - unauthorized
        errorMessage = 'Please unlock your Ronin Wallet and try again';
      } else if (error.message && error.message.includes('unauthorized')) {
        errorMessage = 'Please approve the connection in your Ronin Wallet';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setContract(null);
    setBalance('0');
    localStorage.removeItem('token');
    setToken(null);
    delete axios.defaults.headers.common['Authorization'];
    toast.success('Wallet disconnected');
  };

  const fetchBalance = async (address) => {
    if (!address || !token) return;
    
    try {
      const response = await axios.get(`${BACKEND_URL}/api/balance/${address}`);
      setBalance(response.data.balance);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const deposit = async (amount) => {
    if (!contract || !account) {
      toast.error('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      const tx = await contract.deposit({
        value: ethers.utils.parseEther(amount.toString())
      });
      
      toast.loading('Processing deposit...');
      await tx.wait();
      
      // Sync deposit with backend
      try {
        await axios.post(`${BACKEND_URL}/api/sync-deposit`);
        await fetchBalance(account);
        toast.success('Deposit successful!');
      } catch (syncError) {
        console.error('Sync error:', syncError);
        // Still fetch balance even if sync fails
        await fetchBalance(account);
      }
      
    } catch (error) {
      console.error('Deposit error:', error);
      toast.error('Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  const withdraw = async (amount) => {
    if (!contract || !account) {
      toast.error('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      // First sync withdrawal with backend
      await axios.post(`${BACKEND_URL}/api/sync-withdraw`, { amount });
      
      const tx = await contract.withdraw(
        ethers.utils.parseEther(amount.toString())
      );
      
      toast.loading('Processing withdrawal...');
      await tx.wait();
      
      await fetchBalance(account);
      toast.success('Withdrawal successful!');
      
    } catch (error) {
      console.error('Withdraw error:', error);
      toast.error('Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  // Listen for account changes
  useEffect(() => {
    const walletProvider = detectWalletProvider();
    if (walletProvider) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (accounts[0] !== account) {
          connectWallet();
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      walletProvider.on('accountsChanged', handleAccountsChanged);
      walletProvider.on('chainChanged', handleChainChanged);

      // Cleanup listeners on unmount
      return () => {
        walletProvider.removeListener('accountsChanged', handleAccountsChanged);
        walletProvider.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [account]);

  const value = {
    account,
    provider,
    signer,
    contract,
    balance,
    loading,
    token,
    connectWallet,
    disconnectWallet,
    deposit,
    withdraw,
    fetchBalance
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};