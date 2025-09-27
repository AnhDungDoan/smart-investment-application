// Simple script to add test balance to a user for testing the dice game
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./dice_game.db');

const ADDRESS = process.argv[2];
const AMOUNT = parseFloat(process.argv[3]) || 10; // Default 10 RON test balance

if (!ADDRESS) {
  console.log('Usage: node add-test-balance.js <address> [amount]');
  console.log('Example: node add-test-balance.js 0x1234... 10');
  process.exit(1);
}

db.run(
  'UPDATE users SET balance = balance + ? WHERE address = ?',
  [AMOUNT, ADDRESS],
  function(err) {
    if (err) {
      console.error('Error updating balance:', err);
    } else if (this.changes === 0) {
      console.log('User not found. Please connect wallet first.');
    } else {
      console.log(`Added ${AMOUNT} RON test balance to ${ADDRESS}`);
      
      // Show new balance
      db.get('SELECT balance FROM users WHERE address = ?', [ADDRESS], (err, row) => {
        if (!err && row) {
          console.log(`New balance: ${row.balance} RON`);
        }
        db.close();
      });
    }
  }
);