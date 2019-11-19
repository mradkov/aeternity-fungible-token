/*
 * ISC License (ISC)
 * Copyright (c) 2018 aeternity developers
 *
 *  Permission to use, copy, modify, and/or distribute this software for any
 *  purpose with or without fee is hereby granted, provided that the above
 *  copyright notice and this permission notice appear in all copies.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 *  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
 *  AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 *  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
 *  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
 *  OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 *  PERFORMANCE OF THIS SOFTWARE.
 */

const Universal = require('@aeternity/aepp-sdk').Universal;
const Crypto = require('@aeternity/aepp-sdk').Crypto;
const Bytes = require('@aeternity/aepp-sdk/es/utils/bytes');
const MemoryAccount = require('@aeternity/aepp-sdk').MemoryAccount;
const FUNGIBLE_TOKEN_FULL_SOURCE = utils.readFileRelative('./contracts/fungible-token-full.aes', 'utf-8');
const FUNGIBLE_TOKEN_MIGRATION_SOURCE = utils.readFileRelative('./contracts/examples/fungible-token-migration.aes', 'utf-8');
const blake2b = require('blake2b');

describe('Fungible Token Migration Contract', () => {

    let contract, migrationTokenContract, client;

    before(async () => {
        client = await Universal({
          url: "http://localhost:3001",
          internalUrl: "http://localhost:3001/internal",
          accounts: [
              MemoryAccount({ keypair: wallets[0] }),
              MemoryAccount({ keypair: wallets[1] }),
              MemoryAccount({ keypair: wallets[2] }),
              MemoryAccount({ keypair: wallets[3] })
          ],
          networkId: "ae_devnet",
          compilerUrl: "http://localhost:3080"
        })
      });

    const hashTopic = topic => blake2b(32).update(Buffer.from(topic)).digest('hex');
    const topicHashFromResult = result => Bytes.toBytes(result.result.log[0].topics[0], true).toString('hex');

    it('Fungible Token Contract: Deploy token to be migrated', async () => {
        contract = await client.getContractInstance(FUNGIBLE_TOKEN_FULL_SOURCE);
        const deploy = await contract.deploy(['AE Test Token', 0, 'AETT']);
        assert.equal(deploy.result.returnType, 'ok');
    });

    it('Fungible Token Contract: Return Extensions', async () => {
        const aex9Extensions = await contract.methods.aex9_extensions();
        assert.include(aex9Extensions.decodedResult, "swappable");
        assert.include(aex9Extensions.decodedResult, "mintable");
    });

    it('Fungible Token Contract: Swap', async () => {
        await contract.methods.mint(wallets[0].publicKey, 10);
        const swap = await contract.methods.swap();
        assert.equal(topicHashFromResult(swap), hashTopic('Swap'));
        assert.equal(Crypto.addressFromDecimal(swap.result.log[0].topics[1]), wallets[0].publicKey);
        assert.equal(swap.result.log[0].topics[2], 10);

        const check_swap = await contract.methods.check_swap(wallets[0].publicKey);
        assert.equal(check_swap.decodedResult, 10);
        const balance = await contract.methods.balance(wallets[0].publicKey);
        assert.equal(balance.decodedResult, 0);
    });

    it('Migration Token: Initialize Token to be migrated to', async () => {
        migrationTokenContract = await client.getContractInstance(FUNGIBLE_TOKEN_MIGRATION_SOURCE);
        const deploy = await migrationTokenContract.deploy(['AE Test Token', 0, 'AETT', contract.deployInfo.address]);
        assert.equal(deploy.result.returnType, 'ok');

        const check_swap = await contract.methods.check_swap(wallets[0].publicKey);
        assert.equal(check_swap.decodedResult, 10);

        const migrate = await migrationTokenContract.methods.migrate();
        assert.equal(topicHashFromResult(migrate), hashTopic('Mint'));
        assert.equal(Crypto.addressFromDecimal(migrate.result.log[0].topics[1]), wallets[0].publicKey);
        assert.equal(migrate.result.log[0].topics[2], 10);
        assert.equal(migrate.result.returnType, 'ok');
    });

    it('Migration Token: User with no swapped tokens', async () => {
        const otherContract = await client.getContractInstance(FUNGIBLE_TOKEN_MIGRATION_SOURCE, {contractAddress: migrationTokenContract.deployInfo.address});

        const migrate = await otherContract.methods.migrate({ onAccount: wallets[1].publicKey }).catch(e => e);
        assert.include(migrate.decodedError, "MIGRATION_AMOUNT_NOT_GREATER_ZERO");
    });

    it('Migration Token: User already migrated', async () => {
        const migrate = await migrationTokenContract.methods.migrate().catch(e => e);
        assert.include(migrate.decodedError, "ACCOUNT_ALREADY_MIGRATED");
    });

});
