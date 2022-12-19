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

3. Next, we open the `webpack.config.js` file and we add the following properties:

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

We add the following `fallback` Webpack property inside `resolve`:

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

And we add the following Webpack plugin:

```
plugins: [
    ...
    new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
    }),
],
```

4. We now take a look at the `src/lib` folder. Inside of that we should create a new folder called `emurgo` and inside of that we create a file called `loader.ts` with the following content:

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

5. Inside the `lib` folder, create a file called `account.ts` and add the following code to it:

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

An initial key is created using a Ed25519 cryptographic elliptic curve from a seed (encoded in the form of mnemonic words). From this wallet Key, other keys can be derived. We therefore define a hierarchy of depth 2, where a single root key and derivation indexes defines a derivation path ([read more here](https://input-output-hk.github.io/cardano-wallet/concepts/address-derivation)).

6. Open the `App.tsx` file and add the following import lines at the top:

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

If you now run `npm start` and check your console logs in the browser you should see the seedphrase and a line indicating the validity.

![13122022120208](https://user-images.githubusercontent.com/119612231/207313203-9745fdca-ad9f-4c50-a59d-8cd99c39c4d4.jpg)

7. Now that we have the seed phrase, we can generate a private key and a stake address. To generate a BIP32PrivateKey from a BIP39 recovery phrase it must be first converted to entropy following the BIP39 protocol ([more info](https://developers.cardano.org/docs/get-started/cardano-serialization-lib/generating-keys/#bip39-entropy)). We will do that adding the following code to the `account.ts` file:

```
export const generateEntropy = (seedPhrase: string) => {
  return mnemonicToEntropy(seedPhrase);
}
```

We are now ready to generate our private key. In the same file, add the following import lines at the top:

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

8. As we mentioned earlier, other keys can also be derived from our wallet key. With the following code we will generate our private key:

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

9. In the code shared earlier at step number 6 we added some logs to the console in order to see the seed phrase and the verification. We will now change that so we won't need to open the console in order to take a look at our data. First of all, open `App.tsx` and import the following React hooks from React:

```
import { useState, useEffect } from 'react';
```

Then we import some more methods from `./lib/account` and in the end that should look like this:

```
import {
  generateMnemonicSeed,
  validateSeedPhrase,
  generatePrivateKey,
  derivePrivateKey,
  generateStakeObject,
} from './lib/account';
```

Now we delete the entire `export const App` function we have created before and replace it with the following:

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

10. We will now generate multiple external and internal payment addresses in a similar way as we did earlier for the stake address, adding the following new methods to the `account.ts` file:

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

export const generateMultipleAddresses = async (derivePkey: Bip32PrivateKey, network: number, chain: number, totalAddresses: number) => {
  let addresses: string[] = [];
  for(let i = 0; i < totalAddresses; i++) {
    addresses = [...addresses, await generatePaymentAddress(derivePkey, network, chain, i)];
  }
  return addresses;
}
```

Then, inside the `App.tsx` file, we will add `generatePaymentAddress` to the list of methods imported from `./lib/account` and the we will add the following new state variables on a new line at line 18:

```
const [externalPaymentAddresses, setExternalPaymentAddresses] = useState<string[]>([]);
const [internalPaymentAddresses, setInternalPaymentAddresses] = useState<string[]>([]);
```

And the following code on a new line below the `getStakeAddress` variable:

```
// This will generate a set of payment addresses based on the private key, the network ID,
// the chain (which can be external (0) or internal(1)) and the amount of addresses we want to generate.
const totalAddresses = 30;
// Generate external payment addresses
generateMultipleAddresses(pkey, 0, 0, totalAddresses).then(
  (pAddresses) => {
    setExternalPaymentAddresses(pAddresses);
  }
);
// Generate internal payment addresses
generateMultipleAddresses(pkey, 0, 1, totalAddresses).then(
  (pAddresses) => {
    setInternalPaymentAddresses(pAddresses);
  }
);
```

Since we will now have a lot more info to display in the browser, we will reformat and replace the JSX code returned in our app with the following one:

```
<>
  <h1>Your own wallet</h1>
  <h3>Seed phrase:</h3>
  <p>
    {seedPhrase}
    {isValid ? ' (valid)' : ' (invalid)'}
  </p>
  <h3>Stake address:</h3>
  <p>{stakeAddress}</p>
  <h3>External payment addresses:</h3>
  <ol start='0'>
    {externalPaymentAddresses.map((address, index) => (
      <li key={index}>{address}</li>
    ))}
  </ol>
  <h3>Internal payment addresses:</h3>
  <ol start='0'>
    {internalPaymentAddresses.map((address, index) => (
      <li key={index}>{address}</li>
    ))}
  </ol>
</>
```

The final result should look like this:

![15122022141627](https://user-images.githubusercontent.com/119612231/207883967-f8fd1170-7b8d-4208-ba27-fad50a023786.jpg)

11. Every time we reload the page, the system will generate a new seed phrase and then it will calculate the addresses. However, we should now introduce a way to reuse the same seed phrase multiple time. In order to do that, we need to add an input field with an update button that will discard the auto generated seed phrase and will accept our manual seed phrase. We will start by adding a new state variable to the `App.tsx` file:

```
const [updatedSeedPhrase, setUpdatedSeedPhrase] = useState('');
```

We will add the following code before the `useEffect()` hook. This will help us checking if the React component is mounted or not:

```
const useIsMounted = () => {
  const isMounted = useRef(false);
  // @ts-ignore
  useEffect(() => {
    isMounted.current = true;
    return () => (isMounted.current = false);
  }, []);
  return isMounted;
};

const isMounted = useIsMounted();
```

Then, we will replace the entire useEffect() hook with the following code:

```
useEffect(() => {
  const initAccount = async () => {
    const Cardano = await EmurgoModule.CardanoWasm();
    let sPhrase = undefined;
    if (!seedPhrase.length) {
      // This will generate a new seedphrase
      sPhrase = generateMnemonicSeed(160);
      setSeedPhrase(sPhrase);
    } else {
      sPhrase = seedPhrase;
    }
    // This will verify that the seedphrase is valid
    setIsValid(validateSeedPhrase(sPhrase));
    // This will generate a private key
    const pKey = await generatePrivateKey(sPhrase);
    setPrivateKey(pKey);
    // This will generate a stake address based on the private key
    const sObject = await generateStakeObject(derivePrivateKey(pKey));
    setStakeAddress(sObject);
    // This will generate a set of payment addresses based on the private key, the network ID,
    // the chain (which can be external (0) or internal(1)) and the amount of addresses we want to generate.
    const totalAddresses = 30;
    // Generate external payment addresses
    const extAddr = await generateMultipleAddresses(
      derivePrivateKey(pKey),
      0,
      0,
      totalAddresses
    );
    setExternalPaymentAddresses(extAddr);
    // Generate internal payment addresses
    const intAddr = await generateMultipleAddresses(
      derivePrivateKey(pKey),
      0,
      1,
      totalAddresses
    );
    setInternalPaymentAddresses(intAddr);
  };
  if (isMounted.current) {
    // call the function
    initAccount()
      // make sure to catch any error
      .catch(console.error);
  }
}, [seedPhrase]);
```

After that and right before the `return` we will add the following code which will take care of handling the click on our update button:

```
const handleClick = () => {
  if (validateSeedPhrase(updatedSeedPhrase)) {
    setSeedPhrase(updatedSeedPhrase);
  } else {
    alert('invalid seed phrase');
  }
};
```

Ultimately, on a new line right after the title of our page, we will add the following code:

```
<h3>Use custom seed phrase:</h3>
<input onChange={(event) => setUpdatedSeedPhrase(event.target.value)} />
<button onClick={handleClick}>Update</button>
```

If you now look at your browser you should see what follows.

![15122022165838](https://user-images.githubusercontent.com/119612231/207921773-bbd788fa-34ad-4b96-ac70-06e26c795e3a.jpg)

12. At this point, we are ready to introduce our spending password and an encryption method that we will use for our private key. We start by running `npm i nanoid` in the terminal and adding the following import at the top of the `account.ts` file:

```
import { customAlphabet } from 'nanoid';
```

Then, we will add the following methods at the bottom for encrypting and decrypting:

```
export const encryptWithPassword = async (privateKey: Bip32PrivateKey, spendingPassword: string) => {
  const Cardano = await EmurgoModule.CardanoWasm();
  const privateKeyHex = Buffer.from(privateKey.as_bytes()).toString('hex');
  const generateRandomHex = customAlphabet('0123456789abcdef');
  const salt = generateRandomHex(64);
  const nonce = generateRandomHex(24);
  const encryptedKey = Cardano.encrypt_with_password(spendingPassword, salt, nonce, privateKeyHex);
  return encryptedKey;
}

export const decryptWithPassword = async (spendingPassword: string, data: string) => {
  const Cardano = await EmurgoModule.CardanoWasm();
  const decryptedKey = Cardano.decrypt_with_password(spendingPassword, data);
  return decryptedKey;
}
```

13. We move to the `App.tsx` file, where we will add a new import from React, in this case the `useRef` method, so the whole line will look like this:

```
import { useState, useEffect, useRef } from 'react';
```

We will then import the two newly created methods for encrypting and decrypting to the list of other methods we are importing from `./lib/account` so that will now look like this:

``` 
import {
  generateMnemonicSeed,
  validateSeedPhrase,
  generatePrivateKey,
  derivePrivateKey,
  generateStakeObject,
  generateMultipleAddresses,
  encryptWithPassword,
  decryptWithPassword,
} from './lib/account';
```

We will now add the following variables to our list:

```
const [spendingPassword, setSpendingPassword] = useState('B1234567bcde');
const [encryptedPrivateKey, setEncryptedPrivateKey] = useState<any>(undefined);
const [decryptedPrivateKey, setDecryptedPrivateKey] = useState<any>(undefined);
```

On a new line below `setInternalPaymentAddresses(intAddr);` we add the following code:

``` 
const encryptedPKey = await encryptWithPassword(pKey, spendingPassword);
setEncryptedPrivateKey(encryptedPKey);
const decryptedKey = await decryptWithPassword(
  spendingPassword,
  encryptedPKey
);
setDecryptedPrivateKey(decryptedKey);
```

Then we add the following code to our JSX, between the seed phrase and the stake address:

```
<h3>Private Key:</h3>
<p>{privateKey?.to_hex()}</p>
<h3>Encrypted Private Key:</h3>
<p>{encryptedPrivateKey}</p>
<h3>Decrypted Private Key:</h3>
<p>{decryptedPrivateKey}</p>
```

If we now take a look at the browser we should see what follows:

Note that the fields `Private key` and `Decrypted private key` should return the same value.
