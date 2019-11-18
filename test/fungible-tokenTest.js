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
const Ae = require('@aeternity/aepp-sdk').Universal;
const Crypto = require('@aeternity/aepp-sdk').Crypto;
const Bytes = require('@aeternity/aepp-sdk/es/utils/bytes');
var blake2b = require('blake2b');

const config = {
    host: 'http://localhost:3001/',
    internalHost: 'http://localhost:3001/internal/',
    compilerUrl: 'http://localhost:3080'
};

describe('Fungible Token Contract', () => {

    let ownerKeypair, otherKeypair, owner, otherClient, contract;

    before(async () => {
        ownerKeypair = wallets[0];
        owner = await Ae({
            url: config.host,
            internalUrl: config.internalHost,
            keypair: ownerKeypair,
            nativeMode: true,
            networkId: 'ae_devnet',
            compilerUrl: config.compilerUrl
        });

        otherKeypair = wallets[1];
        otherClient = await Ae({
            url: config.host,
            internalUrl: config.internalHost,
            keypair: otherKeypair,
            nativeMode: true,
            networkId: 'ae_devnet',
            compilerUrl: config.compilerUrl
        });
    });

    const hashTopic = topic => blake2b(32).update(Buffer.from(topic)).digest('hex');
    const topicHashFromResult = result => Bytes.toBytes(result.result.log[0].topics[0], true).toString('hex');

    beforeEach(async () => {
        let contractSource = utils.readFileRelative('./contracts/fungible-token.aes', 'utf-8');
        contract = await owner.getContractInstance(contractSource);
        const deploy = await contract.deploy(['AE Test Token', 0, 'AETT']);
        assert.equal(deploy.result.returnType, 'ok');
    });

    it('Fungible Token Contract: Return Extensions', async () => {
        const aex9Extensions = await contract.methods.aex9_extensions();
        assert.isEmpty(aex9Extensions.decodedResult);
    });

    it('Deploying Fungible Token Contract: Meta Information', async () => {
        let contractSource = utils.readFileRelative('./contracts/fungible-token.aes', 'utf-8');
        let deployTestContract = await owner.getContractInstance(contractSource);

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

});
