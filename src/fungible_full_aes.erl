-module(fungible_full_aes).

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
    Ebin = filename:dir_name(code:which(sophia_eqc)),
    filename:join([Ebin, "..", "contracts", "fungible-token-full.aes"]).

%% Assume we can generate the following from:
%% aeso_aci:file(json, fungible_aes:ct_file()).

-record(state, {owner, total_supply, balances, meta_info, allowances, swapped}).

%% Generated to simplify modeling, possibly dynamically done??
state_to_erlang(Fate) ->
    {tuple, {Owner,
             Total_supply,
             Balances,
             Meta_info,
             Allowances,
             Swapped}} = Fate,
    #state{owner = Owner,
           total_supply = Total_supply,
           balances = Balances,
           meta_info = Meta_info,
           allowances = Allowances,
           swapped = Swapped}.


init_args(_ChainState) ->
    [non_empty(string()), fate_nat(), non_empty(string())].


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

%% --- Operation: balances ---
balances_post(ChainState, #state{balances = Balances}, [], Res) ->
    eq(Balances, Res).

owner_post(ChainState, _ContractState, [], Res) ->
    eq(creator(ChainState), Res).


transfer_allowance_post(ChainState, #state{balances = Balances}, [From, To, Amount], Res) ->
    case Res of
        {revert, "ALLOWANCE_NOT_EXISTENT"} -> true;
        {tuple, {}} -> true;
        _ -> eq(Res, ok)
    end.

%% -- invariant

invariant(ChainState, #state{balances = Balances, total_supply = Supply}) ->
    Supply == lists:sum(maps:values(Balances)) andalso
        lists:all(fun(B) -> B >= 0 end, maps:values(Balances)).



%%% __________ GENERATORS _____________________________________


%% This should be part of aebytecode generators

string() ->
    elements([<<"ae">>, <<"piwo">>, <<"ta">>]).
