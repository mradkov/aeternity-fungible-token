# QuickCheck for Sophia

## Installation

Makes sure you have installed
- Erlang (OTP 20)
- QuickCheck (latest version for OTP 20) [http://www.quviq.com/downloads]
- An aeternity node [https://github.com/aeternity/aeternity]
- Get a QuickCheck licence key to activate the licence

Check that QuickCheck is correctly installed by starting an Erlang
shell in the aeternity node directory:

```
./rebar3 as test shell --apps=""
===> Verifying dependencies...
...
Erlang/OTP 20 [erts-9.3.3.3] [source] [64-bit] [smp:8:8] [ds:8:8:10] [async-threads:1] [hipe] [kernel-poll:false]

===> The rebar3 shell is a development tool; to deploy applications in production, consider using releases (http://www.rebar3.org/docs/releases)
Eshell V9.3.3.3  (abort with ^G)
```
And then in this shell
```
(aeternity_ct@localhost)1> eqc:start().
Starting Quviq QuickCheck version 1.45.0
   (compiled for R20 at {{2019,12,6},{10,27,16}})
Licence for Quviq AB reserved until {{2019,12,11},{16,22,5}}
ok
```

## Configure

Add the contract eqc directory to the `rebar.config` in the aeternity
node under the test profile:
```
{deps, [{meck, "0.8.12"},
            {websocket_client, {git, "git://github.com/aeternity/websocket_client", {ref, "a4fb3db"}}},
            {aesophia, {git, "https://github.com/aeternity/aesophia.git", {ref,"1c24a70"}}},
            {aesophia_cli, {git, "git://github.com/aeternity/aesophia_cli", {tag, "v4.1.0"}}},
            {aestratum_client, {git, "git://github.com/aeternity/aestratum_client", {ref, "d017dea"}}},
            {sophia_eqc, {git, "git://github.com/Quviq/aeternity-fungible-token", {branch, "quickcheck-experiment"}}}
```

Now one can run the properties as follows:
```
./rebar3 as test shell --apps=""
(aeternity_ct@localhost)2> fungible_aes:ct_file().
"/Users/thomas/Quviq/Customers/Aeternity/aeternity-fungible-token/contracts/fungible-token.aes"
(aeternity_ct@localhost)3> eqc:quickcheck(sophia_eqc:prop_contract([{fungible_aes,1}])).
```
and
```
(aeternity_ct@localhost)3>
eqc:quickcheck(sophia_eqc:prop_contract([{fungible_full_aes,1}])).
```
