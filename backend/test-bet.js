const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./dice_game.db');

const testAddress = '0x1234567890123456789012345678901234567890';

// Add balance
db.run('UPDATE users SET balance = 10 WHERE address = ?', [testAddress], (err) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Balance updated to 10 RON');
  }
  db.close();
});
