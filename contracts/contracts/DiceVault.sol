// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract DiceVault is Ownable, ReentrancyGuard, Pausable {
    // User balance mapping
    mapping(address => uint256) public balances;
    
    // Events
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event BalanceUpdated(address indexed user, uint256 newBalance);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    
    // Minimum deposit/withdraw amounts
    uint256 public constant MIN_DEPOSIT = 0.001 ether;
    uint256 public constant MIN_WITHDRAW = 0.001 ether;
    
    // Admin addresses that can update balances (backend servers)
    mapping(address => bool) public admins;
    
    modifier onlyAdmin() {
        require(admins[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }
    
    constructor() {
        admins[msg.sender] = true;
    }
    
    // Deposit RON to the contract
    function deposit() external payable nonReentrant whenNotPaused {
        require(msg.value >= MIN_DEPOSIT, "Deposit amount too small");
        
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    // Withdraw RON from the contract
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        require(amount >= MIN_WITHDRAW, "Withdraw amount too small");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdraw(msg.sender, amount);
    }
    
    // Admin function to update user balance (for game results)
    function updateBalance(address user, uint256 newBalance) external onlyAdmin {
        balances[user] = newBalance;
        emit BalanceUpdated(user, newBalance);
    }
    
    // Batch update balances for multiple users
    function batchUpdateBalances(
        address[] calldata users,
        uint256[] calldata newBalances
    ) external onlyAdmin {
        require(users.length == newBalances.length, "Array length mismatch");
        
        for (uint256 i = 0; i < users.length; i++) {
            balances[users[i]] = newBalances[i];
            emit BalanceUpdated(users[i], newBalances[i]);
        }
    }
    
    // Add or remove admin
    function setAdmin(address admin, bool status) external onlyOwner {
        admins[admin] = status;
    }
    
    // Emergency withdraw for users (in case of issues)
    function emergencyWithdraw() external nonReentrant {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "No balance to withdraw");
        
        balances[msg.sender] = 0;
        
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Transfer failed");
        
        emit EmergencyWithdraw(msg.sender, balance);
    }
    
    // Pause/unpause contract
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Get user balance
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }
    
    // Get contract balance
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // Receive function to accept RON
    receive() external payable {}
}