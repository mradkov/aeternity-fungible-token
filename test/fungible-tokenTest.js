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

const config = {
    host: 'http://localhost:3001/',
    internalHost: 'http://localhost:3001/internal/',
    compilerUrl: 'https://compiler.aepps.com'
};

describe('Fungible Token Contract', () => {

    let owner, contract;

    before(async () => {
        const ownerKeyPair = wallets[0];
        owner = await Ae({
            url: config.host,
            internalUrl: config.internalHost,
            keypair: ownerKeyPair,
            nativeMode: true,
            networkId: 'ae_devnet',
            compilerUrl: config.compilerUrl
        });

    });

    it('Deploying Fungible Token Contract: Meta Information', async () => {
        let contractSource = utils.readFileRelative('./contracts/fungible-token.aes', 'utf-8');
        contract = await owner.getContractInstance(contractSource);

        const deploy = await contract.deploy(['AE Test Token', 0, 'AETT']);
        assert.equal(deploy.deployInfo.result.returnType, 'ok');
        const metaInfo = await contract.call('meta_info').then(call => call.decode());
        assert.deepEqual(metaInfo, {name: 'AE Test Token', symbol: 'AETT', decimals: 0});

        const deployDecimals = await contract.deploy(['AE Test Token', 10, 'AETT']);
        assert.equal(deployDecimals.deployInfo.result.returnType, 'ok');
        const metaInfoDecimals = await contract.call('meta_info').then(call => call.decode());
        assert.deepEqual(metaInfoDecimals, {name: 'AE Test Token', symbol: 'AETT', decimals: 10});

        const deployFail = await contract.deploy(['AE Test Token', -10, 'AETT']).then(() => true).catch(() => false);
        assert.equal(deployFail, false);
    });

});
