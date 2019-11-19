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
const MemoryAccount = require('@aeternity/aepp-sdk').MemoryAccount;
const FUNGIBLE_TOKEN_SOURCE = utils.readFileRelative('./contracts/fungible-token.aes', 'utf-8');
const FUNGIBLE_TOKEN_WITH_BALANCE_SOURCE = utils.readFileRelative('./contracts/examples/fungible-token-with-balance.aes', 'utf-8');

describe('Fungible Token Contract', () => {

    let contract, client;

    before(async () => {
        client = await Universal({
            url: "http://localhost:3001",
            internalUrl: "http://localhost:3001/internal",
            accounts: [
                MemoryAccount({keypair: wallets[0]}),
                MemoryAccount({keypair: wallets[1]}),
                MemoryAccount({keypair: wallets[2]}),
                MemoryAccount({keypair: wallets[3]})
            ],
            networkId: "ae_devnet",
            compilerUrl: "http://localhost:3080"
        })
    });

    beforeEach(async () => {
        contract = await client.getContractInstance(FUNGIBLE_TOKEN_SOURCE);
        const init = await contract.deploy(['AE Test Token', 0, 'AETT']);
        assert.equal(init.result.returnType, 'ok');
    });

    it('Deploy Basic Token', async () => {
        contract = await client.getContractInstance(FUNGIBLE_TOKEN_SOURCE);
        const deploy = await contract.deploy(['AE Test Token', 0, 'AETT']);
        assert.equal(deploy.result.returnType, 'ok');
    });

    it('Fungible Token Contract: Return Extensions', async () => {
        const aex9Extensions = await contract.methods.aex9_extensions();
        assert.isEmpty(aex9Extensions.decodedResult);
    });

    it('Deploying Fungible Token Contract: Meta Information', async () => {
        let deployTestContract = await client.getContractInstance(FUNGIBLE_TOKEN_SOURCE);

        const deploy = await deployTestContract.deploy(['AE Test Token', 0, 'AETT']);
        assert.equal(deploy.result.returnType, 'ok');
        const metaInfo = await deployTestContract.methods.meta_info();
        assert.deepEqual(metaInfo.decodedResult, {name: 'AE Test Token', symbol: 'AETT', decimals: 0});

        const deployDecimals = await deployTestContract.deploy(['AE Test Token', 10, 'AETT']);
        assert.equal(deployDecimals.result.returnType, 'ok');
        const metaInfoDecimals = await deployTestContract.methods.meta_info();
        assert.deepEqual(metaInfoDecimals.decodedResult, {name: 'AE Test Token', symbol: 'AETT', decimals: 10});

        const deployFail = await deployTestContract.deploy(['AE Test Token', -10, 'AETT']).catch(e => e);
        assert.include(deployFail.decodedError, "NON_NEGATIVE_VALUE_REQUIRED");
    });

    it('Fungible Token Contract: return owner', async () => {
        const owner = await contract.methods.owner();
        assert.equal(owner.decodedResult, wallets[0].publicKey);
    });

    it('Transfer: should have balance', async () => {
        let deployTestContract = await client.getContractInstance(FUNGIBLE_TOKEN_WITH_BALANCE_SOURCE);

        const deploy = await deployTestContract.deploy(['AE Test Token', 0, 'AETT']);
        assert.equal(deploy.result.returnType, 'ok');

        const balance = await deployTestContract.methods.balance(wallets[0].publicKey);
        assert.equal(balance.decodedResult, 100);

        const total_supply = await deployTestContract.methods.total_supply();
        assert.equal(total_supply.decodedResult, 100);
    });

    it('Transfer: should transfer to other account', async () => {
        let deployTestContract = await client.getContractInstance(FUNGIBLE_TOKEN_WITH_BALANCE_SOURCE);

        const deploy = await deployTestContract.deploy(['AE Test Token', 0, 'AETT']);
        assert.equal(deploy.result.returnType, 'ok');

        await deployTestContract.methods.transfer(wallets[1].publicKey, 42);

        const balanceOfOwner = await deployTestContract.methods.balance(wallets[0].publicKey);
        assert.equal(balanceOfOwner.decodedResult, 58);

        const total_supply = await deployTestContract.methods.total_supply();
        assert.equal(total_supply.decodedResult, 100);

        const balances = await deployTestContract.methods.balances();
        assert.deepEqual(balances.decodedResult, [[wallets[0].publicKey, 58], [wallets[1].publicKey, 42]]);
    });

    it('Transfer: should NOT transfer negative value', async () => {
        let deployTestContract = await client.getContractInstance(FUNGIBLE_TOKEN_WITH_BALANCE_SOURCE);

        const deploy = await deployTestContract.deploy(['AE Test Token', 0, 'AETT']);
        assert.equal(deploy.result.returnType, 'ok');

        const balanceOfOwner = await deployTestContract.methods.balance(wallets[0].publicKey);
        assert.equal(balanceOfOwner.decodedResult, 100);

        const transfer = await deployTestContract.methods.transfer(wallets[1].publicKey, -42).catch(e => e);
        assert.include(transfer.decodedError, "NON_NEGATIVE_VALUE_REQUIRED");

        const balanceOfReceiver = await deployTestContract.methods.balance(wallets[1].publicKey);
        assert.equal(balanceOfReceiver.decodedResult, undefined);

        const total_supply = await deployTestContract.methods.total_supply();
        assert.equal(total_supply.decodedResult, 100);
    });

    it('Transfer: should NOT go below zero', async () => {

        let deployTestContract = await client.getContractInstance(FUNGIBLE_TOKEN_WITH_BALANCE_SOURCE);

        const deploy = await deployTestContract.deploy(['AE Test Token', 0, 'AETT']);
        assert.equal(deploy.result.returnType, 'ok');

        const transfer = await deployTestContract.methods.transfer(wallets[1].publicKey, 101).catch(e => e);
        assert.include(transfer.decodedError, "ACCOUNT_INSUFFICIENT_BALANCE");

        const balanceOfOwner = await deployTestContract.methods.balance(wallets[0].publicKey);
        assert.equal(balanceOfOwner.decodedResult, 100);

        const balanceOfReceiver = await deployTestContract.methods.balance(wallets[1].publicKey);
        assert.equal(balanceOfReceiver.decodedResult, undefined);
    });

});
