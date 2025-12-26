![License][github-license]
[![NPM Package Version][npm-image-version]][npm-url]
![Node Version](https://img.shields.io/node/v/%40cedra-labs%2Fcedra-client)
![NPM bundle size](https://img.shields.io/bundlephobia/min/%40cedra-labs/cedra-client)
[![NPM Package Downloads][npm-image-downloads]][npm-url]

# @cedra-labs/cedra-client

This package implements a client with which you can interact with the Cedra network. It can be used standalone, and it is the client package used by the Cedra TypeScript SDK.

#### Implementation

The `@cedra-labs/cedra-client` package supports http2 protocol and implements 2 clients environment based:

1. [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) - implemented in `index.browser.ts` to use in `browser` environment (in a browser env it is up to the browser and the server to negotiate http2 connection)
2. [got](https://github.com/sindresorhus/got) - implemented in `index.node.ts` to use in `node` environment (to support http2 in node environment, still the server must support http2 also)

#### Function signature

```ts
async function cedraClient<Res>(
  requestOptions: CedraClientRequest,
): Promise<CedraClientResponse<Res>>;
```

#### Types

```ts
type CedraClientResponse<Res> = {
  status: number;
  statusText: string;
  data: Res;
  config?: any;
  request?: any;
  response?: any;
  headers?: any;
};

type CedraClientRequest = {
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
import cedraClient from "@cedra-labs/cedra-client";

const response = await cedraClient<Res>({
  url,
  method,
  body,
  params,
  headers,
  overrides,
});
return response;
```

[npm-image-version]: https://img.shields.io/npm/v/%40cedra-labs%2Fcedra-client.svg
[npm-image-downloads]: https://img.shields.io/npm/dm/%40cedra-labs%2Fcedra-client.svg
[npm-url]: https://npmjs.org/package/@cedra-labs/cedra-client
[github-license]: https://img.shields.io/github/license/cedra-labs/cedra-client
