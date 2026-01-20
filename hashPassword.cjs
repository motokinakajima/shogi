// Import bcrypt for hashing
const bcrypt = require('bcrypt');

// Get the password from command-line arguments
const password = process.argv[2];

if (!password) {
  console.error('Usage: node hashPassword.js <password>');
  process.exit(1);
}

// Define the salt rounds (same as used in the application, typically 10)
const saltRounds = 10;

// Hash the password
bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    process.exit(1);
  }

  console.log('Hashed password:', hash);
});