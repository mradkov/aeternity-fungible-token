const fs = require('fs');

const fungibleTokenFullInterface = fs.readFileSync(__dirname + '/../contracts/fungible-token-full-interface.aes', 'utf-8');
fs.writeFileSync(__dirname + '/../FungibleTokenFullInterface.aes.js', `module.exports = \`\n${fungibleTokenFullInterface}\`;\n`, 'utf-8');

const fungibleTokenInterface = fs.readFileSync(__dirname + '/../contracts/fungible-token-interface.aes', 'utf-8');
fs.writeFileSync(__dirname + '/../FungibleTokenInterface.aes.js', `module.exports = \`\n${fungibleTokenInterface}\`;\n`, 'utf-8');
