export const CONTRACT_ADDRESS = '0x089d3d51cb3c8ca070d5648C9D1c7d765533E832';
// Use relative URL to leverage Vite proxy when deployed
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
export const RONIN_TESTNET_CHAIN_ID = '0x7e5'; // 2021 in hex

export const RONIN_TESTNET_CONFIG = {
  chainId: '0x7e5',
  chainName: 'Ronin Testnet',
  rpcUrls: ['https://saigon-testnet.roninchain.com/rpc'],
  nativeCurrency: {
    name: 'RON',
    symbol: 'RON',
    decimals: 18
  },
  blockExplorerUrls: ['https://saigon-app.roninchain.com']
};

export const CONTRACT_ABI = [
  "function deposit() payable",
  "function withdraw(uint256 amount)",
  "function getBalance(address user) view returns (uint256)",
  "function balances(address) view returns (uint256)"
];