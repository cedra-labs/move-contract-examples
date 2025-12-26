# cedra CLI

The `@cedra-labs/cedra-cli` package allows you to use the cedra CLI from inside a `Nodejs` project.

## Download

To install the cedra CLI, you need to have Node.js and npm installed on your system. Then, you can install it using:

```bash
npm install @cedra-labs/cedra-cli
```

That command will download the cedra CLI and create a Node bin file, making it available to use in a Node environment.

## Install

Once you have the package installed and the Node bin file, you can run the following command, in your project environment, to install the cedra CLI in your project:

```bash
npx cedra --install
```

Alternatively, you can simply run the cli using the `npx cedra` command. That will install the cedra CLI in your project if it's not already installed.

```bash
npx cedra
```

## Usage

To use the cedra CLI, in your project environment, run the `npx cedra` command, to see the available commands.

```bash
npx cedra
```

## Updating the cedra CLI

To update the cedra CLI, you can run the following command within your project environment:

```bash
npx cedra --update
```

## Development

To set up the project for development:

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

This will build the project and run the CLI.

## Building

To build the project:

```bash
npm run build
```
