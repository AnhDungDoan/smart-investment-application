// Helper functions for Ronin Wallet integration

export const connectRoninWallet = async () => {
  console.log('Attempting Ronin Wallet connection...');
  
  if (!window.ronin) {
    throw new Error('Ronin Wallet not installed');
  }

  const provider = window.ronin.provider;
  
  // For Ronin Wallet, we may need to use a specific connection flow
  try {
    // Method 1: Direct eth_requestAccounts
    console.log('Method 1: Direct account request...');
    const accounts = await provider.request({
      method: 'eth_requestAccounts',
    });
    
    if (accounts && accounts.length > 0) {
      console.log('Success with method 1');
      return { provider, accounts };
    }
  } catch (error) {
    console.log('Method 1 failed:', error);
  }

  // Method 2: Using enable() if available (older API)
  try {
    console.log('Method 2: Using enable()...');
    if (provider.enable) {
      const accounts = await provider.enable();
      if (accounts && accounts.length > 0) {
        console.log('Success with method 2');
        return { provider, accounts };
      }
    }
  } catch (error) {
    console.log('Method 2 failed:', error);
  }

  // Method 3: Request with different params
  try {
    console.log('Method 3: Request with empty params...');
    const accounts = await provider.request({
      method: 'eth_accounts',
    });
    
    if (!accounts || accounts.length === 0) {
      // Try to trigger permission request
      const requestedAccounts = await provider.request({
        method: 'eth_requestAccounts',
        params: []
      });
      
      if (requestedAccounts && requestedAccounts.length > 0) {
        console.log('Success with method 3');
        return { provider, accounts: requestedAccounts };
      }
    } else {
      console.log('Success with method 3 (existing permission)');
      return { provider, accounts };
    }
  } catch (error) {
    console.log('Method 3 failed:', error);
  }

  throw new Error('Failed to connect to Ronin Wallet. Please make sure your wallet is unlocked and try again.');
};

export const isRoninWalletInstalled = () => {
  return typeof window !== 'undefined' && !!window.ronin;
};

export const getRoninProvider = () => {
  if (!isRoninWalletInstalled()) {
    return null;
  }
  return window.ronin.provider;
};