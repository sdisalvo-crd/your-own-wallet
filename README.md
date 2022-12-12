### Instructions

1. Start from a basic React app + Webpack 5 boilerplate (example: https://github.com/sdisalvo-crd/react-template.git).

2. Add the following dependencies to the `package.json` file and run `npm install` to install them (remove the comments):

```
// This is Emurgo Serialization lib https://github.com/Emurgo/cardano-serialization-lib
"@emurgo/cardano-serialization-lib-browser": "11.1.0",
// This is the Bitcoin Improvement Proposal (in this case it's number 39) which handles the seedphrase.
"bip39": "^3.0.4",
// This is to run node's crypto module in the browser
"crypto-browserify": "^3.12.0",
"stream-browserify": "^3.0.0",
"buffer": "^6.0.3",
```

3. Add the following properties to the `webpack.config.js` file:

```
experiments: {
    asyncWebAssembly: true,
    syncWebAssembly: true,
},
devServer: {
    historyApiFallback: true,
    client: {
        overlay: false,
    },
},
```

4. Add the following `fallback` Webpack property inside `resolve`:

```
resolve: {
    ...
    fallback: {
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer/'),
    },
},
```

5. Add the following Webpack plugin:

```
plugins: [
    ...
    new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
    }),
],
```

6. Inside the `src/lib` folder, create a new folder called `emurgo` and inside that create a file called `loader.ts` with the following content:

```
type Lib = typeof import('@emurgo/cardano-serialization-lib-browser');

class Module {
  private _wasm: Lib | null = null;

  private async load(): Promise<Lib> {
    if (!this._wasm) {
      this._wasm = await import('@emurgo/cardano-serialization-lib-browser/cardano_serialization_lib');
    }
    return this._wasm;
  }

  async CardanoWasm(): Promise<Lib> {
    return this.load();
  }
}

export const EmurgoModule: Module = new Module();
```

7. Inside the `lib` folder, create a file called `account.ts` and add the following code to it:

```
import { generateMnemonic, mnemonicToEntropy, validateMnemonic } from 'bip39';

// To generate a 15 word seedphrase use size 160.
// To generate a 24 word seedphase use size 256.
export const generateMnemonicSeed = (size: number) => {
  return generateMnemonic(size);
};

export const validateSeedPhrase = (seedPhrase: string) => {
    return validateMnemonic(seedPhrase);
}
```

8. Add the following code to the App.tsx file.

Import at the top:

```
import { EmurgoModule } from './lib/emurgo/loader';
import { generateMnemonicSeed, validateSeedPhrase } from './lib/account';
```

And add this on a new line just before the `return`:

```
EmurgoModule.CardanoWasm().then((cardano) => {
    // This will return the whole object
    console.log(cardano);
    // This will generate a seedphrase
    const testSeedPhrase = generateMnemonicSeed(160);
    console.log('Seedphrase: ', testSeedPhrase);
    // This will verify if the seedphrase is valid
    console.log(
        'Is the seedphrase valid? ',
        validateSeedPhrase(testSeedPhrase)
    );
});
```

9. Run `npm start` and check your console logs in the browser. You should now see the seedphrase and a line indicating the validity.
