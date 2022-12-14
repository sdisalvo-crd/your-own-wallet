### Build your own crypto wallet on Cardano

A cryptocurrency wallet is a safe and secure place where users can keep their digital currencies. In this tutorial we will show some real code example that will help you creating your own wallet using the [Cardano Serialization Lib](https://developers.cardano.org/docs/get-started/cardano-serialization-lib/overview/). For more information on the different types of wallets we recommend taking a look at [this page](https://docs.cardano.org/new-to-cardano/types-of-wallets).

In order to better understand, we recommend that the user has at least some knowledge of HTML, JavaScript and React.js. We have purposely decided not to spend too much effort on the UI in order to keep it simple and straight to the point, leaving the user with plenty of room to implement their own UI.

## Instructions

1. For this tutorial, we recommend to start with a basic React app + Webpack 5. Feel free to create your own app from scratch or make use of a pre-made boilerplate that you can find on [this page](https://github.com/sdisalvo-crd/react-template-1.0.0).

2. We will start adding the following dependencies to the `package.json` file and run `npm install` to install them:

The Emurgo Serialization lib ([link here](https://github.com/Emurgo/cardano-serialization-lib))

```
"@emurgo/cardano-serialization-lib-browser": "11.1.0",
```

The Bitcoin Improvement Proposal (in this case it's number 39) which handles the seedphrase.

```
"bip39": "^3.0.4",
```

The following dependencies allow to run node's crypto module in the browser

```
"crypto-browserify": "^3.12.0",
"stream-browserify": "^3.0.0",
"buffer": "^6.0.3",
```

3. Next, we add the following properties to the `webpack.config.js` file:

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

7. An initial key is created using a Ed25519 cryptographic elliptic curve from a seed (encoded in the form of mnemonic words). From this wallet Key, other keys can be derived. We therefore define a hierarchy of depth 2, where a single root key and derivation indexes defines a derivation path ([read more here](https://input-output-hk.github.io/cardano-wallet/concepts/address-derivation)). Inside the `lib` folder, create a file called `account.ts` and add the following code to it:

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

![13122022120208](https://user-images.githubusercontent.com/119612231/207313203-9745fdca-ad9f-4c50-a59d-8cd99c39c4d4.jpg)

10. Now that we have the seed phrase, we can generate a private key and a stake address. To generate a BIP32PrivateKey from a BIP39 recovery phrase it must be first converted to entropy following the BIP39 protocol ([more info](https://developers.cardano.org/docs/get-started/cardano-serialization-lib/generating-keys/#bip39-entropy)). We will do that adding the following code to the `account.ts` file:

```
export const generateEntropy = (seedPhrase: string) => {
  return mnemonicToEntropy(seedPhrase);
}
```

11. We can now generate our private key. In the same file, add the following imports:

```
import { Bip32PrivateKey } from '@emurgo/cardano-serialization-lib-browser';
import { EmurgoModule } from './emurgo/loader';
```

And then add the following code at the bottom of the file:

```
export const generatePrivateKey = async (seedPhrase: string) => {
  const Cardano = await EmurgoModule.CardanoWasm();
  const bip39entropy = generateEntropy(seedPhrase);
  const entropyBuffer = Buffer.from(bip39entropy, 'hex');
  const emptyPassword = Buffer.from('');
  const privateKey = Cardano.Bip32PrivateKey.from_bip39_entropy(entropyBuffer, emptyPassword);
  return privateKey;
}
```

12. As we mentioned earlier, other keys can be derived from our wallet key. With the following code we will generate our private key:

```
export const derivePrivateKey = (privateKey: Bip32PrivateKey, index = 0) => {
  // The following ones are fixed values. More info here: https://cips.cardano.org/cips/cip1852/
  const DERIVE_PUROPOSE = 1852;
  const DERIVE_COIN_TYPE = 1815;

  return privateKey.derive(harden(DERIVE_PUROPOSE)).derive(harden(DERIVE_COIN_TYPE)).derive(harden(index));
}
```

And the following code will generate an object containing the public stake key and the stake address:

```
export const harden = (num: number) => {
  return 0x80000000 + num;
};

export const generateStakeObject = async (derivePkey: Bip32PrivateKey) => {
  const CHIMERIC_ACCOUNT = 2;
  const STAKING_INDEX = 0;
  const stakeKey = derivePkey.derive(CHIMERIC_ACCOUNT).derive(STAKING_INDEX);
  const publicStakeKey = stakeKey.to_raw_key().to_public();
  const Cardano = await EmurgoModule.CardanoWasm();
  const stakeAddressTestnet = Cardano.RewardAddress.new(0, Cardano.StakeCredential.from_keyhash(publicStakeKey.hash()));
  const stakeAddress = stakeAddressTestnet.to_address().to_bech32();
  return {
    publicStakeKey,
    stakeAddress,
  };
}
```

More info about this can be found in [this page](https://developers.cardano.org/docs/get-started/cardano-serialization-lib/generating-keys/#bip39-entropy) and [this page](https://cardanoupdates.com/commits/0c207e01ff6a8a02a402a66163338b6aadfc992a).

13. In the code shared earlier at step number 8, we added some logs to the console in order to see the seed phrase and the verification. We will now change that so we won't need to open the console in order to take a look at our data. First of all, open `App.tsx` and import the following React hooks from React:

```
import { useState, useEffect } from 'react';
```

Then we import some more methods from './lib/account' and in the end that should look like this:

```
import {
  generateMnemonicSeed,
  validateSeedPhrase,
  generatePrivateKey,
  derivePrivateKey,
  generateStakeObject,
} from './lib/account';
```

Now we delete the `export const App` we have created before and replace it with the following code:

```
export const App = () => {
  const [seedPhrase, setSeedPhrase] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [privateKey, setPrivateKey] = useState<any>(undefined);
  const [stakeAddress, setStakeAddress] = useState<any>(undefined);

  useEffect(() => {
    EmurgoModule.CardanoWasm().then((cardano) => {
      // This will generate a seedphrase
      const getSeedPhrase = generateMnemonicSeed(160);
      setSeedPhrase(getSeedPhrase);
      // This will verify that the seedphrase is valid
      setIsValid(validateSeedPhrase(getSeedPhrase));
      // This will generate a private key
      const getPrivateKey = generatePrivateKey(getSeedPhrase).then((pkey) => {
        setPrivateKey(pkey);
        // This will generate a stake address based on the private key
        const getStakeAddress = generateStakeObject(
          derivePrivateKey(pkey)
        ).then((sObj) => {
          setStakeAddress(sObj.stakeAddress);
        });
      });
    });
  }, []);

  return (
    <>
      <h1>Your own wallet</h1>
      <p>
        <strong>Seed phrase:</strong> {seedPhrase}
        {isValid ? ' (valid)' : ' (invalid)'}
      </p>
      <p>
        <strong>Stake address:</strong> {stakeAddress}
      </p>
    </>
  );
};
```

If you now run `npm start` and take a look at your browser you should see the seed phrase (with validation info) and the stake address as follows:

![13122022151446](https://user-images.githubusercontent.com/119612231/207372478-29a31a6b-0515-4a7d-8aa3-51fb9d441ec9.jpg)

14. We will now generate a payment address in a similar way as we did for the stake address adding the following new method to the `account.ts` file:

```
export const generatePaymentAddress = async (derivePkey: Bip32PrivateKey, network: number, chain: number, index: number) => {
  const Cardano = await EmurgoModule.CardanoWasm();
  const stakeObject = await generateStakeObject(derivePkey);
  const paymentKey = derivePkey.derive(chain).derive(index);
  const paymentAddress = Cardano.BaseAddress.new(network,
    Cardano.StakeCredential.from_keyhash(paymentKey.to_raw_key().to_public().hash()),
    Cardano.StakeCredential.from_keyhash(stakeObject.publicStakeKey.hash()));
  return paymentAddress.to_address().to_bech32();
}
```

We will add the following new state on a new line at line 18 of the `App.tsx` file:

```
const [paymentAddresses, setPaymentAddresses] = useState<string[]>([]);
```

And the following new variable below the `getStakeAddress` variable on a new line at line 36:

```
// This will generate a payment address based on the private key, the network ID,
// the chain (which can be internal or external) and the index.
const paymentAddress = generatePaymentAddress(pkey, 0, 0, 0).then(
  (pAddress) => {
    setPaymentAddresses([...paymentAddresses, pAddress]);
  }
);
```

Then we will display our address in the browser adding the following code in a new line at line 57:

```
<p>
  <strong>Payment address:</strong> {paymentAddresses[0]}
</p>
```

The final result should look like this:

![14122022135839](https://user-images.githubusercontent.com/119612231/207621244-b1af9eb9-07bc-45cf-8b45-902165ca0428.jpg)
