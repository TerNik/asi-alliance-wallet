import { ChainInfo } from "@keplr-wallet/types";
import { KVStore, sortedJsonByKeyStringify } from "@keplr-wallet/common";
import { ChainIdHelper } from "@keplr-wallet/cosmos";
import { ChainInfoWithCoreTypes, ChainsService } from "../chains";
import {
  checkChainFeatures,
  validateBasicChainInfoType,
} from "@keplr-wallet/chain-validator";
import { simpleFetch } from "@keplr-wallet/simple-fetch";

export class ChainUpdaterService {
  public chainsService!: ChainsService;

  constructor(
    protected readonly kvStore: KVStore,
    protected readonly communityChainInfoRepo: {
      readonly organizationName: string;
      readonly repoName: string;
      readonly branchName: string;
    }
  ) {}

  init(chainsService: ChainsService) {
    this.chainsService = chainsService;
  }

  async replaceChainInfo(origin: ChainInfo): Promise<ChainInfo> {
    const chainIdentifier = ChainIdHelper.parse(origin.chainId).identifier;

    let chainInfo: ChainInfo = origin;

    const updatedChainInfo = await this.kvStore.get<ChainInfo>(
      "updated-chain-info/" + chainIdentifier
    );

    if (updatedChainInfo) {
      chainInfo = {
        ...updatedChainInfo,
        govUrl: updatedChainInfo.govUrl || origin.govUrl,
        walletUrlForStaking:
          updatedChainInfo.walletUrlForStaking || origin.walletUrlForStaking,
        features: (() => {
          const features = chainInfo.features ?? [];

          for (const f of updatedChainInfo.features ?? []) {
            if (!features.includes(f)) {
              features.push(f);
            }
          }

          return features;
        })(),
        currencies: (() => {
          const currencies = chainInfo.currencies ?? [];
          const currencyMinimalDenoms = currencies.map(
            (c) => c.coinMinimalDenom
          );

          for (const f of updatedChainInfo.currencies ?? []) {
            if (!currencyMinimalDenoms.includes(f.coinMinimalDenom)) {
              currencies.push(f);
            }
          }

          return currencies;
        })(),
        beta: origin.beta,
      };
    }

    const local = await this.kvStore.get<Partial<ChainInfo>>(chainIdentifier);
    if (local) {
      chainInfo = {
        ...chainInfo,
        ...{
          chainId: local.chainId || chainInfo.chainId,
          features: (() => {
            if (!local.features) {
              return chainInfo.features;
            }

            const features = chainInfo.features ?? [];
            for (const add of local.features) {
              if (!features.includes(add)) {
                features.push(add);
              }
            }

            return features;
          })(),
          currencies: (() => {
            if (!local.currencies) {
              return chainInfo.currencies;
            }

            const currencies = chainInfo.currencies ?? [];
            const currencyMinimalDenoms = currencies.map(
              (c) => c.coinMinimalDenom
            );

            for (const curr of local.currencies) {
              if (!currencyMinimalDenoms.includes(curr.coinMinimalDenom)) {
                currencies.push(curr);
              }
            }

            return currencies;
          })(),
        },
      };
    }

    // Reduce the confusion from different coin type on ecosystem.
    // Unite coin type for all chain to 118 with allowing alternatives.
    // (If coin type is 60, it is probably to be compatible with metamask. So, in this case, do nothing.)
    if (chainInfo.bip44.coinType !== 118 && chainInfo.bip44.coinType !== 60) {
      chainInfo = {
        ...chainInfo,
        alternativeBIP44s: (() => {
          let res = chainInfo.alternativeBIP44s ?? [];

          if (res.find((c) => c.coinType === 118)) {
            return res;
          }

          res = [...res, { coinType: 118 }];

          return res;
        })(),
      };
    }

    const endpoints = await this.getChainEndpoints(origin.chainId);

    return {
      ...chainInfo,
      rpc: endpoints.rpc || chainInfo.rpc,
      rest: endpoints.rest || chainInfo.rest,
    };
  }

  async tryUpdateChainInfo(chainId: string): Promise<boolean> {
    if (
      (await this.chainsService.getChainInfo(chainId)).updateFromRepoDisabled
    ) {
      return false;
    }

    try {
      const chainIdentifier = ChainIdHelper.parse(chainId).identifier;

      let repoUpdated = false;

      try {
        const res = await simpleFetch<ChainInfo>(
          `https://raw.githubusercontent.com/${this.communityChainInfoRepo.organizationName}/${this.communityChainInfoRepo.repoName}/${this.communityChainInfoRepo.branchName}/cosmos/${chainIdentifier}.json`
        );

        let chainInfo: ChainInfo = res.data;

        const fetchedChainIdentifier = ChainIdHelper.parse(
          chainInfo.chainId
        ).identifier;
        if (chainIdentifier !== fetchedChainIdentifier) {
          console.log(
            `The chainId is not valid.(${chainId} -> ${fetchedChainIdentifier})`
          );
          return false;
        }

        const prevFetchedChainInfo = await this.kvStore.get<ChainInfo>(
          "updated-chain-info/" + chainIdentifier
        );
        if (
          !prevFetchedChainInfo ||
          sortedJsonByKeyStringify(prevFetchedChainInfo) !==
            sortedJsonByKeyStringify(chainInfo)
        ) {
          repoUpdated = true;

          chainInfo = await validateBasicChainInfoType(chainInfo);

          await this.kvStore.set<ChainInfo>(
            "updated-chain-info/" + chainIdentifier,
            chainInfo
          );

          this.chainsService.clearCachedChainInfos();
        }
      } catch (e) {
        // Proceed logic event if fetching from github failed
        console.log(e);
      }

      const updatedChainInfo = await this.chainsService.getChainInfo(chainId);

      let chainIdUpdated = false;
      const chainIdFromRPC = await this.checkChainIdFromRPC(
        updatedChainInfo.rpc
      );
      if (ChainIdHelper.parse(chainIdFromRPC).identifier !== chainIdentifier) {
        throw new Error(
          `Chain id is different from rpc: (expected: ${chainId}, actual: ${chainIdFromRPC})`
        );
      }
      if (updatedChainInfo.chainId !== chainIdFromRPC) {
        chainIdUpdated = true;

        const local = await this.kvStore.get<Partial<ChainInfo>>(
          chainIdentifier
        );

        await this.kvStore.set<Partial<ChainInfo>>(chainIdentifier, {
          ...local,
          chainId: chainIdFromRPC,
        });
      }

      const toUpdateFeatures = await checkChainFeatures(updatedChainInfo);

      const featuresUpdated = toUpdateFeatures.length !== 0;

      if (featuresUpdated) {
        const local = await this.kvStore.get<Partial<ChainInfo>>(
          chainIdentifier
        );

        await this.kvStore.set<Partial<ChainInfo>>(chainIdentifier, {
          ...local,
          features: [
            ...new Set([...toUpdateFeatures, ...(local?.features ?? [])]),
          ],
        });
      }

      if (chainIdUpdated || featuresUpdated) {
        this.chainsService.clearCachedChainInfos();
      }

      return repoUpdated || chainIdUpdated || featuresUpdated;
    } catch (e) {
      console.log(`Failed to try to update chain info for ${chainId}`, e);
    }

    return false;
  }

  // This method is called on `ChainsService`.
  // TODO: Refactor
  async clearUpdatedProperty(chainId: string) {
    await this.kvStore.set(ChainIdHelper.parse(chainId).identifier, null);
    await this.kvStore.set<ChainInfo>(
      "updated-chain-info/" + ChainIdHelper.parse(chainId).identifier,
      null
    );

    this.chainsService.clearCachedChainInfos();
  }

  // XXX: It is not conceptually valid that the function to set the rpc/rest endpoint of the chain exists in this service.
  //      However, in order to focus on adding feature rather than making a big change, the refactor is postponed later and the configuration of the rpc/rest endpoint is handled here.

  public async setChainEndpoints(
    chainId: string,
    rpc: string | undefined,
    rest: string | undefined
  ): Promise<ChainInfoWithCoreTypes[]> {
    await this.kvStore.set(
      "chain-info-endpoints/" + ChainIdHelper.parse(chainId).identifier,
      {
        rpc,
        rest,
      }
    );

    this.chainsService.clearCachedChainInfos();

    return await this.chainsService.getChainInfos();
  }

  public async getChainEndpoints(chainId: string): Promise<{
    rpc: string | undefined;
    rest: string | undefined;
  }> {
    const saved = await this.kvStore.get<{
      rpc: string | undefined;
      rest: string | undefined;
    }>("chain-info-endpoints/" + ChainIdHelper.parse(chainId).identifier);

    if (!saved) {
      return {
        rpc: undefined,
        rest: undefined,
      };
    }

    return saved;
  }

  public async resetChainEndpoints(
    chainId: string
  ): Promise<ChainInfoWithCoreTypes[]> {
    await this.kvStore.set(
      "chain-info-endpoints/" + ChainIdHelper.parse(chainId).identifier,
      null
    );

    this.chainsService.clearCachedChainInfos();

    return await this.chainsService.getChainInfos();
  }

  protected async checkChainIdFromRPC(rpc: string): Promise<string> {
    const isInfura = rpc.includes("infura.io");
    if (isInfura) {
      const response = await fetch(rpc, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_chainId",
          params: [],
          id: 1,
        }),
      });

      const data = await response.json();

      if (!data.result) {
        throw new Error("Invalid response from Infura RPC");
      }

      return parseInt(data.result, 16).toString(); // Convert hex to decimal string
    } else {
      const statusResponse = await simpleFetch<
        | {
            result: {
              node_info: {
                network: string;
              };
            };
          }
        | {
            node_info: {
              network: string;
            };
          }
      >(rpc + "/status");

      if ("result" in statusResponse.data) {
        return statusResponse.data.result.node_info.network;
      }

      return statusResponse.data.node_info.network;
    }
  }
}
