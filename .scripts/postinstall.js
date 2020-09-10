const fs = require('fs');

const fungibleTokenFullInterface = fs.readFileSync(__dirname + '/../contracts/fungible-token-full-interface.aes', 'utf-8');
fs.writeFileSync(__dirname + '/../FungibleTokenFullInterface.aes.js', `module.exports = \`\n${fungibleTokenFullInterface.replace(/`/g, "\\`")}\`;\n`, 'utf-8');

const fungibleTokenFull = fs.readFileSync(__dirname + '/../contracts/fungible-token-full.aes', 'utf-8');
fs.writeFileSync(__dirname + '/../FungibleTokenFull.aes.js', `module.exports = \`\n${fungibleTokenFull.replace(/`/g, "\\`")}\`;\n`, 'utf-8');

const fungibleTokenInterface = fs.readFileSync(__dirname + '/../contracts/fungible-token-interface.aes', 'utf-8');
fs.writeFileSync(__dirname + '/../FungibleTokenInterface.aes.js', `module.exports = \`\n${fungibleTokenInterface.replace(/`/g, "\\`")}\`;\n`, 'utf-8');

const fungibleToken = fs.readFileSync(__dirname + '/../contracts/fungible-token.aes', 'utf-8');
fs.writeFileSync(__dirname + '/../FungibleToken.aes.js', `module.exports = \`\n${fungibleToken.replace(/`/g, "\\`")}\`;\n`, 'utf-8');
