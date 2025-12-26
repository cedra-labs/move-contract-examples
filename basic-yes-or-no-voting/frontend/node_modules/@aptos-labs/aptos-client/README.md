![License][github-license]
[![NPM Package Version][npm-image-version]][npm-url]
![Node Version](https://img.shields.io/node/v/%40aptos-labs%2Faptos-client)
![NPM bundle size](https://img.shields.io/bundlephobia/min/%40aptos-labs/aptos-client)
[![NPM Package Downloads][npm-image-downloads]][npm-url]

# @aptos-labs/aptos-client

This package implements a client with which you can interact with the Aptos network. It can be used standalone, and it is the client package used by the Aptos TypeScript SDK.

#### Implementation

The `@aptos-labs/aptos-client` package supports http2 protocol and implements 2 clients environment based:

1. [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) - implemented in `index.browser.ts` to use in `browser` environment (in a browser env it is up to the browser and the server to negotiate http2 connection)
2. [got](https://github.com/sindresorhus/got) - implemented in `index.node.ts` to use in `node` environment (to support http2 in node environment, still the server must support http2 also)

#### Function signature

```ts
async function aptosClient<Res>(
  requestOptions: AptosClientRequest,
): Promise<AptosClientResponse<Res>>;
```

#### Types

```ts
type AptosClientResponse<Res> = {
  status: number;
  statusText: string;
  data: Res;
  config?: any;
  request?: any;
  response?: any;
  headers?: any;
};

type AptosClientRequest = {
  url: string;
  method: "GET" | "POST";
  body?: any;
  params?: any;
  headers?: any;
  overrides?: any;
};
```

#### Usage

```ts
import aptosClient from "@aptos-labs/aptos-client";

const response = await aptosClient<Res>({
  url,
  method,
  body,
  params,
  headers,
  overrides,
});
return response;
```

[npm-image-version]: https://img.shields.io/npm/v/%40aptos-labs%2Faptos-client.svg
[npm-image-downloads]: https://img.shields.io/npm/dm/%40aptos-labs%2Faptos-client.svg
[npm-url]: https://npmjs.org/package/@aptos-labs/aptos-client
[github-license]: https://img.shields.io/github/license/aptos-labs/aptos-client
