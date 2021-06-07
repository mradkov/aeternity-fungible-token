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
const { Universal, Node, MemoryAccount } = require('@aeternity/aepp-sdk');
const FUNGIBLE_TOKEN_SOURCE = './contracts/fungible-token.aes';

describe('Fungible Token Contract', () => {
  let contract, client, contractContent, contractFilesystem;

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
      contractFilesystem = contractUtils.getFilesystem(FUNGIBLE_TOKEN_SOURCE);
      // get content of contract
      contractContent = contractUtils.getContractContent(FUNGIBLE_TOKEN_SOURCE);
      // initialize the contract instance
      contract = await client.getContractInstance(contractContent, {
        contractFilesystem,
      });
      const init = await contract.deploy([
        'AE Test Token',
        0,
        'AETT',
        undefined,
      ]);
      assert.equal(init.result.returnType, 'ok');
    } catch (err) {
      console.error(err);
      assert.fail('Could not initialize contract instance');
    }
  });

  beforeEach(async () => {
    // initialize the contract instance
    contract = await client.getContractInstance(contractContent, {
      contractFilesystem,
    });
    const init = await contract.deploy(['AE Test Token', 0, 'AETT', undefined]);
    assert.equal(init.result.returnType, 'ok', 'Contract was not deployed.');
  });

  it('Deploy Basic Token', async () => {
    const deploy = await contract.deploy([
      'AE Test Token',
      0,
      'AETT',
      undefined,
    ]);
    assert.equal(deploy.result.returnType, 'ok', 'Contract was not deployed.');
  });

  it('Deploy Basic Token: With initial balance', async () => {
    const deployFail = await contract
      .deploy(['AE Test Token', 0, 'AETT', -15])
      .catch((e) => e);
    assert.include(deployFail.message, 'NON_NEGATIVE_VALUE_REQUIRED');

    const deploy = await contract.deploy(['AE Test Token', 0, 'AETT', 15]);
    assert.equal(deploy.result.returnType, 'ok', 'Contract was not deployed.');

    const balance = await contract.methods.balance(wallets[0].publicKey);
    assert.equal(balance.decodedResult, 15);

    const total_supply = await contract.methods.total_supply();
    assert.equal(total_supply.decodedResult, 15);
  });

  it('Fungible Token Contract: Return Extensions', async () => {
    const aex9Extensions = await contract.methods.aex9_extensions();
    assert.isEmpty(aex9Extensions.decodedResult);
  });

  it('Deploying Fungible Token Contract: Meta Information', async () => {
    let deployTestContract = await client.getContractInstance(contractContent, {
      contractFilesystem,
    });

    const deploy = await deployTestContract.deploy([
      'AE Test Token',
      0,
      'AETT',
      undefined,
    ]);
    assert.equal(deploy.result.returnType, 'ok', 'Contract was not deployed.');
    const metaInfo = await deployTestContract.methods.meta_info();
    assert.deepEqual(metaInfo.decodedResult, {
      name: 'AE Test Token',
      symbol: 'AETT',
      decimals: 0,
    });

    const deployDecimals = await deployTestContract.deploy([
      'AE Test Token',
      10,
      'AETT',
      undefined,
    ]);
    assert.equal(deployDecimals.result.returnType, 'ok');
    const metaInfoDecimals = await deployTestContract.methods.meta_info();
    assert.deepEqual(metaInfoDecimals.decodedResult, {
      name: 'AE Test Token',
      symbol: 'AETT',
      decimals: 10,
    });

    const deployFail = await deployTestContract
      .deploy(['AE Test Token', -10, 'AETT', undefined])
      .catch((e) => e);
    assert.include(deployFail.message, 'NON_NEGATIVE_VALUE_REQUIRED');
  });

  it('Fungible Token Contract: return owner', async () => {
    const owner = await contract.methods.owner();
    assert.equal(owner.decodedResult, wallets[0].publicKey);
  });

  it('Transfer: should transfer to other account', async () => {
    let deployTestContract = await client.getContractInstance(contractContent, {
      contractFilesystem,
    });

    const deploy = await deployTestContract.deploy([
      'AE Test Token',
      0,
      'AETT',
      100,
    ]);
    assert.equal(deploy.result.returnType, 'ok');

    await deployTestContract.methods.transfer(wallets[1].publicKey, 42);

    const balanceOfOwner = await deployTestContract.methods.balance(
      wallets[0].publicKey,
    );
    assert.equal(balanceOfOwner.decodedResult, 58);

    const total_supply = await deployTestContract.methods.total_supply();
    assert.equal(total_supply.decodedResult, 100);

    const balances = await deployTestContract.methods.balances();
    assert.deepEqual(balances.decodedResult, [
      [wallets[0].publicKey, 58],
      [wallets[1].publicKey, 42],
    ]);
  });

  it('Transfer: should NOT transfer negative value', async () => {
    let deployTestContract = await client.getContractInstance(contractContent, {
      contractFilesystem,
    });

    const deploy = await deployTestContract.deploy([
      'AE Test Token',
      0,
      'AETT',
      100,
    ]);
    assert.equal(deploy.result.returnType, 'ok');

    const balanceOfOwner = await deployTestContract.methods.balance(
      wallets[0].publicKey,
    );
    assert.equal(balanceOfOwner.decodedResult, 100);

    const transfer = await deployTestContract.methods
      .transfer(wallets[1].publicKey, -42)
      .catch((e) => e);
    assert.include(transfer.message, 'NON_NEGATIVE_VALUE_REQUIRED');

    const balanceOfReceiver = await deployTestContract.methods.balance(
      wallets[1].publicKey,
    );
    assert.equal(balanceOfReceiver.decodedResult, undefined);

    const total_supply = await deployTestContract.methods.total_supply();
    assert.equal(total_supply.decodedResult, 100);
  });

  it('Transfer: should NOT go below zero', async () => {
    let deployTestContract = await client.getContractInstance(contractContent, {
      contractFilesystem,
    });

    const deploy = await deployTestContract.deploy([
      'AE Test Token',
      0,
      'AETT',
      100,
    ]);
    assert.equal(deploy.result.returnType, 'ok');

    const transfer = await deployTestContract.methods
      .transfer(wallets[1].publicKey, 101)
      .catch((e) => e);
    assert.include(transfer.message, 'ACCOUNT_INSUFFICIENT_BALANCE');

    const balanceOfOwner = await deployTestContract.methods.balance(
      wallets[0].publicKey,
    );
    assert.equal(balanceOfOwner.decodedResult, 100);

    const balanceOfReceiver = await deployTestContract.methods.balance(
      wallets[1].publicKey,
    );
    assert.equal(balanceOfReceiver.decodedResult, undefined);
  });
});
