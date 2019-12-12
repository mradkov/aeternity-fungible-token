-module(fungible_aes).

-include_lib("eqc/include/eqc.hrl").
%-include_lib("aebytecode/include/aeb_fate_data.hrl").

-compile([export_all, nowarn_export_all]).
-import(sophia_eqc, [gen_account/1,
                     fate_nat/0,
                     fate_int/0,
                     caller/1,
                     creator/1]).

-import(eqc_statem, [eq/2]).

ct_file() ->
    Ebin = filename:dirname(code:which(sophia_eqc)),
    filename:join([Ebin, "..", "contracts", "fungible-token.aes"]).

%% Assume we can generate the following from:
%% aeso_aci:file(json, fungible_aes:ct_file()).

-record(state, {owner, total_supply, balances, meta_info}).

%% Generated to simplify modeling, possibly dynamically done??
state_to_erlang(Fate) ->
    {tuple, {Owner,
             Total_supply,
             Balances,
             Meta_info}} = Fate,
    #state{owner = Owner, total_supply = Total_supply,
           balances = Balances,
           meta_info = Meta_info}.


init_args(_ChainState) ->
    [non_empty(string()), fate_nat(), non_empty(string()), choose(-1,10)].


%% Would be nice with a pretty printer fate representation -> Sophia
%% 'None' or 'Some(9)'
%% Can we generate ContractState structure?
balance_post(ChainState, #state{balances = Balances}, [Account], Res) ->
    case Res of
        {variant, [0, 1], 0, {}} ->
            not maps:is_key(Account, Balances);
        {variant, [0, 1], 1, {X}} ->
            eq(X, maps:get(Account, Balances, undefined))
    end.

balances_post(ChainState, #state{balances = Balances}, [], Res) ->
    eq(Balances, Res).

owner_post(ChainState, _ContractState, [], Res) ->
    eq(creator(ChainState), Res).

transfer_args(ChainState) ->
    [gen_account(ChainState), frequency([{0, int()}, {49, nat()}])].

transfer_post(ChainState, #state{balances = Balances}, [To, Amount], Res) ->
    case Res of
        {revert, "BALANCE_ACCOUNT_NOT_EXISTENT"} ->
            not maps:is_key(caller(ChainState), Balances);
        {revert, "ACCOUNT_INSUFFICIENT_BALANCE"} ->
            maps:get(caller(ChainState), Balances, 0) < Amount;
        %% {revert, "NON_NEGATIVE_VALUE_REQUIRED"} ->
        %%     Amount < 0;
        {tuple, {}} -> true;
        _ -> eq(Res, ok)
    end.

%% -- invariant

invariant(_ChainState, #state{balances = Balances, total_supply = Supply}) ->
    Supply == lists:sum(maps:values(Balances)) andalso
        lists:all(fun(B) -> B >= 0 end, maps:values(Balances)).



%%% __________ GENERATORS _____________________________________


%% This should be part of aebytecode generators

string() ->
    elements([<<"ae">>, <<"piwo">>, <<"ta">>]).
