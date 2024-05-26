import { APIRequester } from "@initia/initia.js";
import { Responses } from "@cosmjs/tendermint-rpc/build/comet38/adaptor/responses";
import { Params } from "@cosmjs/tendermint-rpc/build/comet38/adaptor/requests";
import { Method } from "@cosmjs/tendermint-rpc/build/comet38/requests";

import * as http from "http";
import * as https from "https";
import { isJsonRpcErrorResponse, parseJsonRpcResponse } from "@cosmjs/json-rpc";

// Use custom rpc client instead of comet38Client to set keepAlive option
export class RPCClient {
  requester: APIRequester;
  constructor(rpcUri: string) {
    this.requester = new APIRequester(rpcUri, {
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent: new https.Agent({ keepAlive: true }),
    });
  }

  public async blockResults(height: number) {
    const rawResponse: any = await this.requester.get("block_results", {
      height,
    });
    return Responses.decodeBlockResults(rawResponse);
  }

  public async abciQuery(params: {
    path: string;
    data: Uint8Array;
    prove: boolean;
    height: number;
  }) {
    const query = Params.encodeAbciQuery({ method: Method.AbciQuery, params });
    const response = parseJsonRpcResponse(await this.requester.post("", query));
    if (isJsonRpcErrorResponse(response)) {
      throw new Error(JSON.stringify(response.error));
    }

    return Responses.decodeAbciQuery(response);
  }

  public async validators(params: {
    height?: number;
    page?: number;
    per_page?: number;
  }) {
    const { height, page, per_page } = params;
    const rawResponse: any = await this.requester.get("validators", {
      height,
      page,
      per_page,
    });

    return Responses.decodeValidators(rawResponse);
  }

  public async validatorsAll(height: number) {
    const validators = [];
    let page = 1;
    let done = false;
    let blockHeight = height;

    while (!done) {
      const response = await this.validators({
        per_page: 50,
        height: blockHeight,
        page: page,
      });
      validators.push(...response.validators);
      blockHeight = blockHeight || response.blockHeight;
      if (validators.length < response.total) {
        page++;
      } else {
        done = true;
      }
    }

    return {
      // NOTE: Default value is for type safety but this should always be set
      blockHeight: blockHeight ?? 0,
      count: validators.length,
      total: validators.length,
      validators: validators,
    };
  }

  public async commit(height: number) {
    const rawResponse: any = await this.requester.get("commit", {
      height,
    });

    return Responses.decodeCommit(rawResponse);
  }
}