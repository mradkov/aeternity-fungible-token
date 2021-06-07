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
const chai = require('chai');
const assert = chai.assert;

const NETWORKS = require('../config/network.json');
const NETWORK_NAME = 'local';

const { defaultWallets: wallets } = require('../config/wallets.json');

const contractUtils = require('../utils/contract-utils');
const {
  Universal,
  Node,
  Crypto,
  Bytes,
  MemoryAccount,
} = require('@aeternity/aepp-sdk');
const blake2b = require('blake2b');

const FUNGIBLE_TOKEN_FULL_SOURCE = './contracts/fungible-token-full.aes';
const FUNGIBLE_TOKEN_MIGRATION_SOURCE =
  './contracts/examples/fungible-token-migration.aes';

describe('Fungible Token Migration Contract', () => {
  let contract,
    migrationTokenContract,
    client,
    contractContent,
    contractFilesystem,
    migrationContractContent,
    migrationContractFilesystem;

  before(async () => {
    const node = await Node({ url: NETWORKS[NETWORK_NAME].nodeUrl });
    client = await Universal({
      nodes: [{ name: NETWORK_NAME, instance: node }],
      compilerUrl: NETWORKS[NETWORK_NAME].compilerUrl,
      accounts: [
        MemoryAccount({ keypair: wallets[0] }),
        MemoryAccount({ keypair: wallets[1] }),
        MemoryAccount({ keypair: wallets[2] }),
        MemoryAccount({ keypair: wallets[3] }),
      ],
      address: wallets[0].publicKey,
    });
    try {
      // a filesystem object must be passed to the compiler if the contract uses custom includes
      contractFilesystem = contractUtils.getFilesystem(
        FUNGIBLE_TOKEN_FULL_SOURCE,
      );
      // get content of contract
      contractContent = contractUtils.getContractContent(
        FUNGIBLE_TOKEN_FULL_SOURCE,
      );

      // a filesystem object must be passed to the compiler if the contract uses custom includes
      migrationContractFilesystem = contractUtils.getFilesystem(
        FUNGIBLE_TOKEN_MIGRATION_SOURCE,
      );
      // get content of contract
      migrationContractContent = contractUtils.getContractContent(
        FUNGIBLE_TOKEN_MIGRATION_SOURCE,
      );
    } catch (err) {
      console.error(err);
      assert.fail('Could not initialize contract instance');
    }
  });

  const hashTopic = (topic) =>
    blake2b(32).update(Buffer.from(topic)).digest('hex');
  const topicHashFromResult = (result) =>
    Bytes.toBytes(result.result.log[0].topics[0], true).toString('hex');

  it('Fungible Token Contract: Deploy token to be migrated', async () => {
    contract = await client.getContractInstance(contractContent, {
      contractFilesystem,
    });
    const deploy = await contract.deploy([
      'AE Test Token',
      0,
      'AETT',
      undefined,
    ]);
    assert.equal(deploy.result.returnType, 'ok', 'Contract was not deployed.');
  });

  it('Fungible Token Contract: Return Extensions', async () => {
    const aex9Extensions = await contract.methods.aex9_extensions();
    assert.include(aex9Extensions.decodedResult, 'swappable');
    assert.include(aex9Extensions.decodedResult, 'mintable');
  });

  it('Fungible Token Contract: Swap', async () => {
    await contract.methods.mint(wallets[0].publicKey, 10);
    const swap = await contract.methods.swap();
    assert.equal(topicHashFromResult(swap), hashTopic('Swap'));
    assert.equal(
      Crypto.addressFromDecimal(swap.result.log[0].topics[1]),
      wallets[0].publicKey,
    );
    assert.equal(swap.result.log[0].topics[2], 10);

    const check_swap = await contract.methods.check_swap(wallets[0].publicKey);
    assert.equal(check_swap.decodedResult, 10);
    const balance = await contract.methods.balance(wallets[0].publicKey);
    assert.equal(balance.decodedResult, 0);
  });

  it('Migration Token: Initialize Token to be migrated to', async () => {
    migrationTokenContract = await client
      .getContractInstance(migrationContractContent, {
        contractFilesystem: migrationContractFilesystem,
      })
      .catch(console.error);

    const deploy = await migrationTokenContract
      .deploy(['AE Test Token', 0, 'AETT', contract.deployInfo.address])
      .catch(console.error);

    assert.equal(deploy.result.returnType, 'ok', 'Contract was not deployed.');

    const check_swap = await contract.methods.check_swap(wallets[0].publicKey);
    assert.equal(check_swap.decodedResult, 10);

    const migrate = await migrationTokenContract.methods.migrate();
    assert.equal(topicHashFromResult(migrate), hashTopic('Mint'));
    assert.equal(
      Crypto.addressFromDecimal(migrate.result.log[0].topics[1]),
      wallets[0].publicKey,
    );
    assert.equal(migrate.result.log[0].topics[2], 10);
    assert.equal(migrate.result.returnType, 'ok');
  });

  it('Migration Token: User with no swapped tokens', async () => {
    const migrate = await migrationTokenContract.methods
      .migrate({ onAccount: wallets[1].publicKey })
      .catch((e) => e);
    assert.include(migrate.message, 'MIGRATION_AMOUNT_NOT_GREATER_ZERO');
  });

  it('Migration Token: User already migrated', async () => {
    const migrate = await migrationTokenContract.methods
      .migrate()
      .catch((e) => e);
    assert.include(migrate.message, 'ACCOUNT_ALREADY_MIGRATED');
  });
});
