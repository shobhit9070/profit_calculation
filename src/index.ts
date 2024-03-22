import { log, time } from 'console';
import { precompiles } from './precompiles';
import { Interface, JsonFragment, JsonRpcProvider, Provider, AbiCoder, id, toUtf8String, ParamType, formatUnits, LangEn, LogDescription } from 'ethers';
import fs from 'fs';
import axios from 'axios';
import { parse } from 'path';
import { json } from 'stream/consumers';
import contracts from './token_data.json';
import { skip } from 'node:test';

let contracts_set = new Set();

export type TraceMetadata = {

    abis: Record<string, Record<string, Interface>>;

    nodesByPath: Record<string, TraceEntry>;
};

export type AddressInfo = {
    label: string;
    functions: Record<string, JsonFragment>;
    events: Record<string, JsonFragment>;
    errors: Record<string, JsonFragment>;
};
export type TraceEntryCall = {
    path: string;
    type: 'call';
    variant: 'call' | 'callcode' | 'staticcall' | 'delegatecall' | 'create' | 'create2' | 'selfdestruct';
    gas: number;
    isPrecompile: boolean;
    from: string;
    to: string;
    input: string;
    output: string;
    gasUsed: number;
    value: string;
    status: number;

    codehash: string;

    children: TraceEntry[];
};
export type TraceEntryLog = {
    path: string;
    type: 'log';
    topics: string[];
    data: string;
};
export type TraceEntrySload = {
    path: string;
    type: 'sload';
    slot: string;
    value: string;
};
export type TraceEntrySstore = {
    path: string;
    type: 'sstore';
    slot: string;
    oldValue: string;
    newValue: string;
};
export type TraceEntry = TraceEntryCall | TraceEntryLog | TraceEntrySload | TraceEntrySstore;
export type TraceResponse = {
    chain: string;
    txhash: string;
    preimages: Record<string, string>;
    addresses: Record<string, Record<string, AddressInfo>>;
    entrypoint: TraceEntryCall;
};

export type StorageResponse = {
    allStructs: unknown[]; // Replace 'any[]' with 'unknown[]' or a more specific type.
    arrays: unknown[];
    structs: unknown[];
    slots: Record<string, unknown>;
};

export function apiEndpoint() {
    return process.env.NEXT_PUBLIC_API_HOST || 'https://tx.eth.samczsun.com';
}

export type APIResponseError = {
    ok: false;
    error: string;
};
export type APIResponseSuccess<T> = {
    ok: true;
    result: T;
};
export type APIResponse<T> = APIResponseError | APIResponseSuccess<T>;
export const doApiRequest = async <T,>(path: string, init?: RequestInit): Promise<T> => {
    return fetch(`${apiEndpoint()}${path}`, init)
        .then((res) => res.json())
        .then((json) => json as APIResponse<T>)
        .then((resp) => {
            if (!resp.ok) {
                throw new Error(resp.error);
            }
            return resp.result;
        });
};


export type ChainConfig = {
    chainId: number;
    id: string;
    displayName: string;
    nativeTokenAddress: string;
    nativeSymbol: string;
    coingeckoId: string;
    defillamaPrefix: string;
    rpcUrl: string;
    blockexplorerUrl: string;
};

export const SupportedChains = [
    {
        chainId: 1,
        id: 'ethereum',
        displayName: 'Ethereum',
        nativeTokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        nativeSymbol: 'ETH',
        coingeckoId: 'coingecko:ethereum',
        defillamaPrefix: 'ethereum',
        rpcUrl: 'https://rpc.ankr.com/eth',
        blockexplorerUrl: 'https://etherscan.io',
    },
    {
        chainId: 137,
        id: 'polygon',
        displayName: 'Polygon',
        nativeTokenAddress: '0x0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        nativeSymbol: 'MATIC',
        coingeckoId: 'coingecko:matic-network',
        defillamaPrefix: 'polygon',
        rpcUrl: 'https://rpc.ankr.com/polygon',
        blockexplorerUrl: 'https://polygonscan.com',
    },
    {
        chainId: 10,
        id: 'optimism',
        displayName: 'Optimism',
        nativeTokenAddress: '0x1eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        nativeSymbol: 'ETH',
        coingeckoId: 'coingecko:ethereum',
        defillamaPrefix: 'optimism',
        rpcUrl: 'https://mainnet.optimism.io',
        blockexplorerUrl: 'https://optimistic.etherscan.io',
    },
    {
        chainId: 56,
        id: 'binance',
        displayName: 'Binance',
        nativeTokenAddress: '0x2eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        nativeSymbol: 'BNB',
        coingeckoId: 'coingecko:binancecoin',
        defillamaPrefix: 'bsc',
        rpcUrl: 'https://rpc.ankr.com/bsc',
        blockexplorerUrl: 'https://bscscan.com',
    },
    {
        chainId: 43112,
        id: 'avalanche',
        displayName: 'Avalanche',
        nativeTokenAddress: '0x3eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        nativeSymbol: 'AVAX',
        coingeckoId: 'coingecko:avalanche-2',
        defillamaPrefix: 'avax',
        rpcUrl: 'https://rpc.ankr.com/avalanche',
        blockexplorerUrl: 'https://snowtrace.io',
    },
    {
        chainId: 42161,
        id: 'arbitrum',
        displayName: 'Arbitrum',
        nativeTokenAddress: '0x4eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        nativeSymbol: 'ETH',
        coingeckoId: 'coingecko:ethereum',
        defillamaPrefix: 'arbitrum',
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        blockexplorerUrl: 'https://arbiscan.io',
    },
    {
        chainId: 250,
        id: 'fantom',
        displayName: 'Fantom',
        nativeTokenAddress: '0x5eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        nativeSymbol: 'FTM',
        coingeckoId: 'coingecko:fantom',
        defillamaPrefix: 'fantom',
        rpcUrl: 'https://rpcapi.fantom.network',
        blockexplorerUrl: 'https://ftmscan.com',
    },
];

export const defaultChainConfig = (): ChainConfig => {
    return SupportedChains[0];
};



async function etherscanAPI(contractAddress: string, action: string) {
    const url = `https://api.etherscan.io/api?module=contract&action=${action}&address=${contractAddress}&apikey=N9JZ5HWKD25ND22XBUACUTC1TTAE95DKII`;

    while (true) {
        try {
            const result = await axios.get(url);
            // console.log(result.data);

            // console.log(result.data.result);


            return result.data.result;
        } catch (error) {
            console.error(`${action} failed, trying again in 2 seconds`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}


async function checkVerifiedContract(address: string) {
    let contractInfo = await etherscanAPI(address, 'getsourcecode');
    if (contractInfo.length === 0) {
        return null;
    }
    // console.log(contractInfo[0]['SourceCode']);

    return contractInfo[0]['SourceCode']
}



const tryFetchTrace = async (txhash: string): Promise<[TraceMetadata, Record<string, string>]> => {
    //console.log("===========================================");
    //console.log(typeof txhash);

    const chain = 'ethereum';
    try {
        const traceResponse = await doApiRequest<TraceResponse>(`/api/v1/trace/${chain}/${txhash}`);
        // console.log('loaded trace', traceResponse.entrypoint);

        let labels: Record<string, string> = {};
        let customLabels: Record<string, Record<string, string>> = {};
        if (!(chain in customLabels)) {
            customLabels[chain] = {};
        }

        for (let address of Object.keys(precompiles)) {
            labels[address] = 'Precompile';
        }

        let metadata: TraceMetadata = {
            abis: {},
            nodesByPath: {},
        };

        let preprocess = (node: TraceEntry) => {
            metadata.nodesByPath[node.path] = node;

            if (node.type === 'call') {
                node.children.forEach(preprocess);
            }
        };
        preprocess(traceResponse.entrypoint);

        for (let [address, entries] of Object.entries(traceResponse.addresses)) {
            metadata.abis[address] = {};
            for (let [codehash, info] of Object.entries(entries)) {
                labels[address] = labels[address] || info.label;

                try {
                    // //console.log(info);
                    metadata.abis[address][codehash] = new Interface([
                        ...Object.values(info.functions),
                        ...Object.values(info.events),
                        ...Object.values(info.errors).filter(
                            (v) =>
                                !(
                                    // lmao wtf ethers
                                    (
                                        (v.name === 'Error' &&
                                            v.inputs &&
                                            v.inputs.length === 1 &&
                                            v.inputs[0].type === 'string') ||
                                        (v.name === 'Panic' &&
                                            v.inputs &&
                                            v.inputs.length === 1 &&
                                            v.inputs[0].type === 'uint256')
                                    )
                                ),
                        ),
                    ]);
                } catch (e) {
                    //console.log('failed to construct interface', e);
                }
            }
        }
        // //console.log("heloooooooo +++++++++++++++++++++++++++++++++++++++++++++");

        // //console.log(metadata.abis);

        for (let address of Object.keys(labels)) {
            if (labels[address] === 'Vyper_contract') {
                labels[address] = `Vyper_contract (0x${address.substring(2, 6)}..${address.substring(
                    38,
                    42,
                )})`;
            }
        }

        return [metadata, labels]; // Return the metadata and labels
    } catch (error) {
        //console.log('failed to fetch trace', error);
        throw error; // Re-throw the error to be handled by the caller
    }
};


export const findAffectedContract = (metadata: TraceMetadata, node: TraceEntry): [TraceEntryCall, TraceEntryCall[]] => {

    //console.log(metadata);

    let path: TraceEntryCall[] = [];

    let parents = node.path.split('.');

    while (parents.length > 0) {
        parents.pop();
        //console.log("________________________________");
        //console.log(parents.join('.'));
        let parentNode = metadata.nodesByPath[parents.join('.')];
        //console.log(parentNode);

        if (parentNode.type === 'call') {
            path.push(parentNode);

            if (parentNode.variant !== 'delegatecall') {
                path.reverse();

                return [parentNode, path];
            }
        }
    }

    throw new Error("strange, didn't find parent node");
};

const NATIVE_TOKEN = 'native_token';

export type TokenInfo = {
    symbol?: string;
    decimals?: number;
    isNft?: boolean;
};

export type TokenMetadata = {
    status: Record<string, 'pending' | 'fetched'>;
    tokens: Record<string, TokenInfo>;
};

export type PriceInfo = {
    decimals: number;
    currentPrice: bigint;
    historicalPrice: bigint;
};

export type PriceMetadata = {
    status: Record<string, 'pending' | 'fetched'>;
    prices: Record<string, PriceInfo>;
};

type AddressValueInfo = {
    hasMissingPrices: boolean;
    totalValueChange: bigint;
    changePerToken: Record<string, bigint>;
};

export const toDefiLlamaId = (chainInfo: ChainConfig, token: string) => {
    if (token === chainInfo.nativeTokenAddress || token == NATIVE_TOKEN) {

        if (chainInfo.id === 'ethereum') {
            return `${chainInfo.defillamaPrefix}:0x0000000000000000000000000000000000000000`;
        }
        return `${chainInfo.defillamaPrefix}:${chainInfo.nativeTokenAddress}`;
    }

    return `${chainInfo.defillamaPrefix}:${token}`;
};

export const getPriceOfToken = (
    metadata: PriceMetadata,
    id: string,
    amount: bigint,
    type: 'current' | 'historical',
): bigint | null => {

    // //console.log("++++++++++++++++++++++++++++++++++++++price of token +++++++++++++++++++++++++++++++++++++++++++++++");
    // //console.log(metadata.status[id], amount, type);

    if (metadata.status[id] !== 'fetched') return null;

    const priceInfo = metadata.prices[id];
    return (
        amount *
        BigInt(10 ** (18 - priceInfo.decimals)) *
        (type === 'current' ? priceInfo.currentPrice : priceInfo.historicalPrice)
    );
};

const computeBalanceChanges = (
    entrypoint: TraceEntryCall,
    traceMetadata: TraceMetadata,
    tokenMetadata: TokenMetadata,
    chainConfig: ChainConfig,
    priceMetadata: PriceMetadata,
): [Record<string, AddressValueInfo>, Set<string>] => {
    const changes: Record<string, AddressValueInfo> = {};
    const allTokens = new Set<string>();

    //console.log("++++++++++++++++++++++++++++++++++++++compute balance changes +++++++++++++++++++++++++++++++++++++++++++++++");
    //console.log(traceMetadata);

    const addChange = (address: string, token: string, change: bigint) => {
        address = address.toLowerCase();
        token = token.toLowerCase();

        allTokens.add(token);

        if (tokenMetadata.status[token] === 'fetched' && tokenMetadata.tokens[token].isNft) {
            change = change > BigInt(0) ? BigInt(1) : BigInt(-1);
        }

        if (!(address in changes)) {
            changes[address] = {
                hasMissingPrices: false,
                totalValueChange: BigInt(0),
                changePerToken: {},
            };
        }
        if (!(token in changes[address].changePerToken)) {
            changes[address].changePerToken[token] = change;
            return;
        }

        changes[address].changePerToken[token] = changes[address].changePerToken[token] + change;
    };

    let parsedArray: (LogDescription | null)[] = [];
    const visitNode = (node: TraceEntryCall) => {
        // skip failed calls because their events don't matter
        if (node.status === 0) return;

        const value = BigInt(node.value);
        if (value != BigInt(0)) {
            addChange(node.from, NATIVE_TOKEN, -value);
            addChange(node.to, NATIVE_TOKEN, value);
        }

        node.children
            .filter((child): child is TraceEntryLog => child.type === 'log')
            .forEach((traceLog) => {
                if (traceLog.topics.length === 0) return;
                if (traceLog.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
                    const [parentNode] = findAffectedContract(traceMetadata, traceLog);

                    try {
                        const parsedEvent = traceMetadata.abis[node.to][node.codehash].parseLog({
                            topics: traceLog.topics,
                            data: traceLog.data,
                        });

                        parsedArray.push(parsedEvent);
                        // console.log("+++++++++++++++++++++++++parsed event ++++++++++++++++++++++++++++++++++++");
                        // console.log(parsedEvent);
                        // console.log("+++++++++++++++++++++++++parent Node ++++++++++++++++++++++++++++++++++++");
                        // console.log(parentNode);



                        if (parsedEvent === null) {
                            console.error('Failed to parse log data');
                            return;
                        }
                        const value = parsedEvent.args[2] as bigint;
                        addChange(parsedEvent.args[0] as string, parentNode.to, -value);
                        addChange(parsedEvent.args[1] as string, parentNode.to, value);
                    } catch (e) {
                        console.error('failed to process value change', e);
                    }
                } else if (
                    traceLog.topics[0] === '0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65'
                ) {
                    const [parentNode] = findAffectedContract(traceMetadata, traceLog);

                    try {
                        const parsedEvent = traceMetadata.abis[node.to][node.codehash].parseLog({
                            topics: traceLog.topics,
                            data: traceLog.data,
                        });
                        parsedArray.push(parsedEvent);


                        // console.log("+++++++++++++++++++++++++parsed event ++++++++++++++++++++++++++++++++++++");
                        // console.log(parsedEvent);
                        // console.log("++++++++++++++++++++++++++parent Node  ++++++++++++++++++++++++++++++++++++");
                        // console.log(parentNode);

                        if (parsedEvent === null) {
                            console.error('Failed to parse log data');
                            return;
                        }
                        // //console.log(parentNode.to, parsedEvent.args[0], parsedEvent.args[1]);
                        const value = parsedEvent.args[1] as bigint;
                        addChange(parsedEvent.args[0] as string, parentNode.to, -value);
                    } catch (e) {
                        console.error('failed to process value change', e);
                    }
                }
            });

        node.children.filter((child): child is TraceEntryCall => child.type === 'call').forEach(visitNode);
    };
    visitNode(entrypoint);

    for (let [addr, addrChanges] of Object.entries(changes)) {
        for (let [token, delta] of Object.entries(addrChanges)) {
            if (delta === BigInt(0)) {
                delete addrChanges.changePerToken[token];
            }
        }

        if (Object.entries(addrChanges).length === 0) {
            delete changes[addr];
        }
    }

    // Object.values(changes).forEach((info) => {
    //     let hasMissingPrice = false;
    //     let changeInValue = BigInt(0);
    //     Object.entries(info.changePerToken).forEach(([token, delta]) => {
    //         const defiLlamaId = toDefiLlamaId(chainConfig, token);

    //         const deltaPrice = getPriceOfToken(priceMetadata, defiLlamaId, delta, 'historical');

    //         if (deltaPrice === null) {
    //             hasMissingPrice = true;
    //             return;
    //         }

    //         changeInValue += deltaPrice;
    //     });

    //     info.hasMissingPrices = hasMissingPrice;
    //     info.totalValueChange = changeInValue;
    // });
    // console.log("+++++++++++++++++++++++++++++parsed array +++++++++++++++++++++++++++++++");
    // console.log(parsedArray);
    return [changes, allTokens];
};

export const defaultTokenMetadata = (): TokenMetadata => {
    return {
        status: SupportedChains.reduce((o, chain) => {
            return {
                ...o,
                [chain.nativeTokenAddress]: 'fetched',
            };
        }, {}),
        tokens: SupportedChains.reduce((o, chain) => {
            return {
                ...o,
                [chain.nativeTokenAddress]: {
                    symbol: chain.nativeSymbol,
                    decimals: 18,
                    isNft: false,
                },
            };
        }, {}),
    };
};

export const fetchDefiLlamaPrices = (
    metadata: PriceMetadata,
    ids: string[],
    when: number,
): Promise<PriceMetadata> => {
    return new Promise<PriceMetadata>((resolve, reject) => {
        setTimeout(() => {
            const newState: PriceMetadata = {
                status: { ...metadata.status },
                prices: { ...metadata.prices }
            };

            const filteredIds = ids.filter((id) => newState.status[id] === undefined);

            if (filteredIds.length === 0) {
                resolve(newState);
                return;
            }

            filteredIds.forEach((id) => (newState.status[id] = 'pending'));

            Promise.all([
                fetch(`https://coins.llama.fi/prices/current/${filteredIds.join(',')}`)
                    .then((resp: any) => resp.json())
                    .then((resp: any) => resp.coins),
                fetch(`https://coins.llama.fi/prices/historical/${when}/${filteredIds.join(',')}`)
                    .then((resp: any) => resp.json())
                    .then((resp: any) => resp.coins),
            ])
                .then(([current, historical]) => {
                    filteredIds.forEach((id) => {
                        newState.status[id] = 'fetched';
                        newState.prices[id] = {
                            decimals: 18,
                            currentPrice: BigInt(0),
                            historicalPrice: BigInt(0),
                        };

                        if (current[id]) {
                            if (current[id].decimals) {
                                newState.prices[id].decimals = current[id].decimals;
                            }
                            newState.prices[id].currentPrice = BigInt((current[id].price * 10000) | 0);
                        }
                        if (historical[id]) {
                            if (historical[id].decimals) {
                                newState.prices[id].decimals = historical[id].decimals;
                            }
                            newState.prices[id].historicalPrice = BigInt((historical[id].price * 10000) | 0);
                        }
                    });
                    resolve(newState);
                })
                .catch(reject);
        }, 0);
    });
};



export const defaultPriceMetadata = (): PriceMetadata => {
    return {
        status: {},
        prices: {},
    };
};



export const fetchTokenMetadata = (
    provider: Provider,
    tokens: Array<string>,
): Promise<TokenMetadata> => {
    return new Promise<TokenMetadata>((resolve, reject) => {
        setTimeout(() => {
            const newState: TokenMetadata = {
                status: {},
                tokens: {}
            };

            const filteredTokens = tokens.filter(
                (token) => newState.status[token] === undefined && token !== NATIVE_TOKEN,
            );

            if (filteredTokens.length === 0) {
                resolve(newState);
                return;
            }

            filteredTokens.forEach((token) => (newState.status[token] = 'pending'));

            Promise.all(
                filteredTokens
                    .map((token) => {
                        return [
                            provider
                                .call({
                                    to: token,
                                    data: id('decimals()').substring(0, 10),
                                })
                                .then((decimalsHex) => {
                                    const decimals = BigInt(decimalsHex);

                                    if (decimals > BigInt(255)) {
                                        throw new Error(
                                            `tried to fetch decimals for token ${token} but got illegal value ${decimalsHex}`,
                                        );
                                    }

                                    return {
                                        token: token,
                                        type: 'decimals',
                                        decimals: Number(decimals),
                                    } as { token: string; type: 'decimals'; decimals: number };
                                })
                                .catch(console.error),
                            provider
                                .call({
                                    to: token,
                                    data: id('symbol()').substring(0, 10),
                                })
                                .then((symbolHex) => {
                                    let symbol;

                                    if (symbolHex.length === 66) {
                                        symbol = toUtf8String(symbolHex.replace(/(00)+$/g, ''));
                                    } else {
                                        try {
                                            let results = AbiCoder.defaultAbiCoder().decode(
                                                [ParamType.from('string')],
                                                symbolHex,
                                            );
                                            symbol = results[0].toString();
                                        } catch (e) {
                                            throw new Error(
                                                `tried to fetch symbol for token ${token} but got illegal value ${symbolHex}`,
                                            );
                                        }
                                    }

                                    return {
                                        token: token,
                                        type: 'symbol',
                                        symbol: symbol,
                                    } as { token: string; type: 'symbol'; symbol: string };
                                })
                                .catch(console.error),
                            provider
                                .call({
                                    to: token,
                                    data:
                                        id('supportsInterface(bytes4)').substring(0, 10) +
                                        AbiCoder.defaultAbiCoder().encode(['bytes4'], ['0x80ac58cd']).substring(2),
                                })
                                .then((isNftHex) => {
                                    const isNft = isNftHex.length > 2 ? BigInt(isNftHex) === BigInt(1) : false;

                                    return {
                                        token: token,
                                        type: 'isNft',
                                        isNft: isNft,
                                    } as { token: string; type: 'isNft'; isNft: boolean };
                                })
                                .catch(console.error),
                        ];
                    })
                    .flatMap((x) => x),
            )
                .then((results) => {
                    filteredTokens.forEach((token) => {
                        newState.status[token] = 'fetched';
                        newState.tokens[token] = {};
                    });

                    results.forEach((result) => {
                        if (!result) return;

                        if (result.type === 'decimals') {
                            newState.tokens[result.token].decimals = result.decimals;
                        } else if (result.type === 'symbol') {
                            newState.tokens[result.token].symbol = result.symbol;
                        } else if (result.type === 'isNft') {
                            newState.tokens[result.token].isNft = result.isNft;
                        }
                    });

                    resolve(newState);
                })
                .catch(reject);
        });
    });
};


export const calculateValueChange = (changes: Record<string, AddressValueInfo>, chainConfig: ChainConfig, priceMetadata: PriceMetadata) => {
    Object.values(changes).forEach((info) => {
        let hasMissingPrice = false;
        let changeInValue = BigInt(0);
        Object.entries(info.changePerToken).forEach(([token, delta]) => {
            const defiLlamaId = toDefiLlamaId(chainConfig, token);

            const deltaPrice = getPriceOfToken(priceMetadata, defiLlamaId, delta, 'historical');

            if (deltaPrice === null) {
                hasMissingPrice = true;
                return;
            }

            changeInValue += deltaPrice;
        });

        info.hasMissingPrices = hasMissingPrice;
        info.totalValueChange = changeInValue;
        // //console.log(info);

    });

    return changes;
}

//console.log("hello");

export const chunkString = (str: string, len: number): string[] => {
    const size = Math.ceil(str.length / len);
    const r = Array(size);
    let offset = 0;

    for (let i = 0; i < size; i++) {
        r[i] = str.substring(offset, offset + len);
        offset += len;
    }

    return r;
};

export const formatUsd = (val: bigint): string => {
    // console.log("++++++++++++++++++++++++++++++++++++++format usd +++++++++++++++++++++++++++++++++++++++++++++++");
    // console.log(val);

    let formatted = formatUnits(val, 22);
    let [left, right] = formatted.split('.');

    // we want at least 4 decimal places on the right
    right = right.substring(0, 4).padEnd(4, '0');

    const isNegative = left.startsWith('-');
    if (isNegative) {
        left = left.substring(1);
    }

    // console.log(`${isNegative ? '-' : ''}${left}.${right.substring(0, 4)}`);

    return `${isNegative ? '-' : ''}${left}.${right.substring(0, 4)}`;
};

function renderRow(address: string, changes: any, priceMetadata: PriceMetadata, tokenMetadata: TokenMetadata, chainConfig: ChainConfig, labels: Record<string, string>) {
    const changeInPriceRendered = changes.hasMissingPrices ? 'Loading...' : formatUsd(changes.totalValueChange);

    const tokenBreakdown = Object.keys(changes.changePerToken)
        .sort()
        .map((token) => {
            let tokenAddress = token;
            let priceId = toDefiLlamaId(chainConfig, token);
            if (token === NATIVE_TOKEN) {
                tokenAddress = chainConfig.nativeTokenAddress || '';
            }
            tokenAddress = tokenAddress.toLowerCase();

            let amountFormatted = changes.changePerToken[token].toString();
            let tokenPriceRendered = 'Loading...';

            let tokenInfo = tokenMetadata.tokens[tokenAddress];
            if (tokenInfo !== undefined && tokenInfo.decimals !== undefined) {
                amountFormatted = formatUnits(changes.changePerToken[token], tokenInfo.decimals);
            }
            if (priceMetadata.status[priceId] === 'fetched') {
                tokenPriceRendered = formatUsd(
                    getPriceOfToken(priceMetadata, priceId, changes.changePerToken[token], 'historical')!
                );
            }

            return [
                tokenAddress,
                amountFormatted,
                tokenPriceRendered
            ];
        });

    const name = address;

    return {
        [name]: {
            changeInPriceRendered,
            tokenBreakdown
        }
    };
}

let checking_arry = [
    "0x5afec0de001999766fb883860cae06f5932e6f32",
    "0x24902aa0cf0000a08c0ea0b003b0c0bf600000e0",
    "0x000000000c923384110e9dca557279491e00f521",
    "0xf2bdcb1ec8810c35bf9b947371820c199bd775db",
    "0xa0d5a274f95decb536bbbaa922d6d0fb692a627d",
    "0x0000000000590b74eb97457bf7b3ff6d63c6fde2",
    "0xba3f5c056500ce033e9d74494b820d495efcf19d",
    "0x97c1a26482099363cb055f0f3ca1d6057fe55447",
    "0xc0ffeebabe5d496b2dde509f9fa189c25cf29671",
    "0xd9985f8d0b63911c51fa6e9594aba5da01e26b74",
    "0x6614fb03d766e8030649b5c733bb34db8827cafa",
    "0x528fca83df13c94823e7fde389bf6ea97c88dab8",
    "0xd3f114075c8563c72571551938c6fe0f820284b8",
    "0xed712f0e0f853fcb4d142cdad47867689df66282",
    "0x04192b74807f697c4e78f4ea1c727f2bfcbfbc04",
    "0xec001d0000004536cad29291f4000000d029abb2",
    "0x81ebd07c0a0c150426c6ed75ab990787173f83bd",
    "0xe4000004000bd8006e00720000d27d1fa000d43e",
    "0x5884d4003df75f96b925bd4b0ed4a0954191f78a",
    "0xc52d16586da91c8524be91f94798c93e90f9e6d8",
    "0x027d24217f18822e6ce11821524c212f507d0787",
    "0x4e0ba53a8bd472424bf304dc84503a9c526bf0a4",
    "0xa0d5a274f95decb536bbbaa922d6d0fb692a627d",
    "0xd9985f8d0b63911c51fa6e9594aba5da01e26b74",
    "0x07197a25bf7297c2c41dd09a79160d05b6232bcf",
    "0x5884d4003df75f96b925bd4b0ed4a0954191f78a",
    "0xfe23f3d1ee716dc77cae278f75b2f7b49b237fde",
    "0x5e029792d2850b60b8c0c86c07854f520a8d8485",
    "0xd050e0a4838d74769228b49dff97241b4ef3805d",
    "0x6219401edaa94454543d5320d73b48ff004c7d57",
    "0xc52d16586da91c8524be91f94798c93e90f9e6d8",
    "0x60c33eec76f1b55185d2030df84438bec7d5a88a",
    "0x1cb55bf2f895fc0e5b4ac7edae086247a41552a0",
    "0x5884d4003df75f96b925bd4b0ed4a0954191f78a",
    "0x027d24217f18822e6ce11821524c212f507d0787",
    "0xc75a65361af17203dfadfcdca3eb6b476c72c164",
    "0x6af49606d941cda32de1ee94397dc821ceb09dac",
    "0x0000000000a84d1a9b0063a910315c7ffa9cd248",
    "0xf11f1254013ad5fd9eaa8484fc78ade76e5cba06",
    "0x5884d4003df75f96b925bd4b0ed4a0954191f78a",
    "0xc52d16586da91c8524be91f94798c93e90f9e6d8",
    "0x50347cae376b0e3fe90b97858e2fdbea6fedff40",
    "0xde1032eeaf6a5ee431205f43647093d44ff2d3be",
    "0x43debe92a7a32dca999593fad617dbd2e6b080a5",
    "0xc0ffeebabe5d496b2dde509f9fa189c25cf29671",
    "0x0000000000590b74eb97457bf7b3ff6d63c6fde2",
    "0xa4ac1f761acb846de73d70d860c8285ea6db525e",
    "0x3293d43cf57cdd7f78e8b193e6628939400b321d",
    "0xa2f729de17d62a7c0049bafc50c5585749085136",
    "0xaeb9b34a309e220899e3f6842122492f2697461b",
    "0xaaecf92bee252ad8a31fdb66aa80e733aa7de609",
    "0xd215ffaf0f85fb6f93f11e49bd6175ad58af0dfd",
    "0x4e0ba53a8bd472424bf304dc84503a9c526bf0a4",
    "0x0124d0fa0dfb1430dfcff16ec6a96945e7a0bc10",
    "0xf6d78d9c50ffbc2917e374fd185b8ff89c55effc",
    "0xb9c6d699134e5c62d3caf62ecc8f1028fecb848e",
    "0x2ab0307d359dccecf30dac5fa02e9562fb09838f",
    "0x64fa9ef54bad5e4bd10cab57cbe6123203e6d384",
    "0x5e51328c0583094b76f28cfd532abc3d454fcfea",
    "0xbcd07d505e9d10f1569a5c0c9f6e7faf00e3b74a",
    "0xb8feffac830c45b4cd210ecdaab9d11995d338ee",
    "0x00000000006004dfb6ab427a47994f2a6a4f6334",
    "0x6de1df17eb8b87c39f7e4fdd72c4a87dbdae1c4e",
    "0x1cb55bf2f895fc0e5b4ac7edae086247a41552a0",
    "0xcaab55e52a2c5dd3fb37407e333beee98720a86b",
    "0xc72d32e7047655181334b7fe1d6c87108d4c1216",
    "0xc0ffeebabe5d496b2dde509f9fa189c25cf29671",
    "0x6db01031355fbf8eea0c06a5d56217ba1967f0df",
    "0x49e183bbdd7c27063e9c5884e375cebc35782312",
    "0x1b9fcb24c533839dc847235bd8eb80e37ec42f85",
    "0x0928dabedea331ea20780e5aa6309fa8fd7f20e1",
    "0x59de70ddc50281635c363e8da0727fdc38042ca0",
    "0xa0d5a274f95decb536bbbaa922d6d0fb692a627d",
    "0xe311bfd4ce91a5c3f600a8f235111003c7d6f987",
    "0xf996ea86f358af5b24d448b18acaa300c0b653ec"
]

let i = 0
async function name(txhash: string, receiver: string, invocation: string, profit_dictionary: Record<string, number>) {
    // console.log("++++++++++++++++++++++++++++++++++++++txhash +++++++++++++++++++++++++++++++++++++++++++++++");
    // console.log(txhash);

    const chain = 'ethereum';
    const [x, labels] = await tryFetchTrace(txhash)
    // console.log(x);
    const traceData = await doApiRequest<TraceResponse>(`/api/v1/trace/${chain}/${txhash}`);

    const [changes, allTokens] = computeBalanceChanges(traceData.entrypoint, x, defaultTokenMetadata(), defaultChainConfig(), defaultPriceMetadata());
    // console.log(changes, allTokens);
    const chainConfig = defaultChainConfig();
    const provider = new JsonRpcProvider(chainConfig.rpcUrl);
    const receipt = await provider.getTransactionReceipt(txhash)

    // for (const [key, value] of Object.entries(changes)) {
    //     contracts_set.add(key);
    // }

    // ++++++++++++++++++++++++++++++++++++++++++++++++++ uncomment later after completing the script ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    const initiator_address: string | undefined = await receipt?.from
    // console.log(initiator_address);

    const blocknumber: number | undefined = receipt?.blockNumber
    //console.log(blocknumber);
    if (blocknumber === undefined) {
        throw new Error('Block number not found');
    }
    const timeStemp = await provider.getBlock(blocknumber)
    //console.log(timeStemp?.timestamp);


    const values = await fetchDefiLlamaPrices(defaultPriceMetadata(), Array.from(allTokens).map((token) => {
        const tokenAddress = token === NATIVE_TOKEN ? '0x0000000000000000000000000000000000000000' : token;
        return `${chainConfig.defillamaPrefix}:${tokenAddress}`;
    }), timeStemp?.timestamp as number);


    //console.log("+++++++++++++++++++++++++++++values +++++++++++++++++++++++++++++++");
    //console.log(values);
    const token_metadata = await fetchTokenMetadata(provider, Array.from(allTokens));
    const valueChange = calculateValueChange(changes, chainConfig, values);
    //console.log("++++++++++++++++++value changes ++++++++++++++++++++++++++++++++");

    //console.log(valueChange);


    const answer = Object.entries(changes).map((entry) => {
        const x = (renderRow(entry[0], entry[1], values, token_metadata, chainConfig, labels));
        return x

    })



    console.log(answer);

    let totalSum = 0;
    for (const element of answer) {
        const x = (element);
        // console.log(x);
        for (const [key, value] of Object.entries(x)) {
            // if (key == "0x0000000000000000000000000000000000000000") {
            //     // console.log(key);
            //     totalSum += 0;
            // }
            // else if (key == receiver || key == invocation || key == initiator_address?.toLowerCase()) {
            //     // console.log(key, "++++++++++++++>", value.changeInPriceRendered);

            //     totalSum += parseFloat(value.changeInPriceRendered);
            // }
            // else {
            //     if (contracts[key as keyof typeof contracts]) {
            //         if (contracts[key as keyof typeof contracts]["verified"] == false) {
            //             totalSum += parseFloat(value.changeInPriceRendered);
            //         }
            //     }
            // }
            // console.log(totalSum);
            //initiator_address?.toLowerCase()
            if (checking_arry.includes(key)) {
                totalSum += parseFloat(value.changeInPriceRendered);
                continue
            }
            else if (key == initiator_address?.toLowerCase()) {
                totalSum += parseFloat(value.changeInPriceRendered);
                continue
            }
            else {
                totalSum += 0
            }

        }
    }
    console.log("++++++++++++++++++++++++++++++total sum +++++++++++++++++++++++++++++++");
    console.log(txhash + " -------------------> " + totalSum);
    i += 1
    console.log("contract number: ", i);

    profit_dictionary[txhash] = totalSum;
    // ++++++++++++++++++++++++++++++++++++++++++++++++++ uncomment later after completing the script ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++



}

async function readLoans() {
    fs.readFile('verified_loans.json', 'utf8', async (err, data) => {
        if (err) {
            console.error(err);
            return;
        }
        const loans = JSON.parse(data);
        for (const loan of loans) {
            let start_time = new Date().getTime();
            // await name(loan["txhash"], loan["receiver_address"], loan["invocation_address"]);
            let end_time = new Date().getTime();
            console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Time taken: ", end_time - start_time, "ms");
            console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

        }
    });
}

// readLoans()
// checkVerifiedContract("0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640")
async function check() {
    let start_time = new Date().getTime()
    // await name("0x3097830e9921e4063d334acb82f6a79374f76f0b1a8f857e89b89bc58df1f311", "0x036cec1a199234fC02f72d29e596a09440825f1C", "0x036cec1a199234fC02f72d29e596a09440825f1C")
    let end_time = new Date().getTime();
    console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
    console.log("Time taken: ", end_time - start_time, "ms");
    console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
}


const index = 4
async function dumpDataToJSON(fileName: string, profit_dictionary: Record<string, number>) {

    fs.writeFileSync(`./profit_folder/profit_balancer/${fileName}.json`, JSON.stringify(profit_dictionary));
}



async function processChunk(chunk: any, chunkIndex: any) {
    // console.log(`Processing chunk ${chunkIndex + 1}/${chunk.length}`);
    let profit_dictionary: Record<string, number> = {};

    for (const contract of chunk) {
        for (const contractName in contract) {
            if (contractName.startsWith("unique") || contractName.startsWith("BancorArbitrage")) {
                console.log("starting with ", contractName);
                let loans = contract[contractName];
                i = 0
                for (const loan of loans) {
                    // let start_time = new Date().getTime();
                    try {
                        await name(loan["txhash"], loan["receiver_address"], loan["invocation_address"], profit_dictionary);
                    }
                    catch (error) {
                        console.error(error);
                        console.log(loan["txhash"]);
                    }
                }
                await dumpDataToJSON(contractName, profit_dictionary);
                console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total contracts: ", loans.length);
                console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log(contractName);

            }
        }
    }
}

async function readLoaning() {
    fs.readFile(`./arb_contracts/balancer_txns.json`, 'utf8', async (err, data) => {
        if (err) {
            console.error(err);
            return;
        }
        const loans = JSON.parse(data);
        const chunkSize = 20
        const chunks = [];
        // for (let i = 0; i < loans.length; i += chunkSize) {
        //     chunks.push(loans.slice(i, i + chunkSize));
        // }

        // Process each chunk in parallel
        // await Promise.all(chunks.map(processChunk));
        await processChunk(loans, 0);
        // await dumpDataToJSON();

        // if (i % 10000 == 0) {
        //     console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
        //     console.log("Total contracts: ", contracts_set.size);
        //     console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
        //     console.log(contracts_set);
        //     console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
        //     console.log("Error contracts: ", error_contracts.size);
        //     console.log(error_contracts);
        //     // await dumpDataToJSON();
        // }

        // console.log("All chunks processed.");
        // console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
        // console.log("Total contracts: ", contracts_set.size);
        // console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
        // console.log(contracts_set);
        // console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
        // console.log("Error contracts: ", error_contracts.size);
        // console.log(error_contracts);
        // await dumpDataToJSON();


    });
}

readLoaning()
//0x2b023d65485c4bb68d781960c2196588d03b871dc9eb1c054f596b7ca6f7da56

// name("0x7396f5fe3bee3f3d1450c8e3b1eb3a0ff1291e5bdf96d5dedf57f40d7c9c3275", "0x7c0d3cf3982142eda2b992e9f912ac4dea662258", "0x80870b156ff0a8508e22b879d4e157d1dfa028ab")