import './styles.css';
import { useState, useEffect, useRef } from 'react';
import { EmurgoModule } from './lib/emurgo/loader';
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

export const App = () => {
  const [seedPhrase, setSeedPhrase] = useState('');
  const [updatedSeedPhrase, setUpdatedSeedPhrase] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [privateKey, setPrivateKey] = useState<any>(undefined);
  const [stakeAddress, setStakeAddress] = useState<any>(undefined);
  const [spendingPassword, setSpendingPassword] = useState('B1234567bcde');
  const [encryptedPrivateKey, setEncryptedPrivateKey] =
    useState<any>(undefined);
  const [decryptedPrivateKey, setDecryptedPrivateKey] =
    useState<any>(undefined);
  const [externalPaymentAddresses, setExternalPaymentAddresses] = useState<
    string[]
  >([]);
  const [internalPaymentAddresses, setInternalPaymentAddresses] = useState<
    string[]
  >([]);

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
      const encryptedPKey = await encryptWithPassword(pKey, spendingPassword);
      setEncryptedPrivateKey(encryptedPKey);
      const decryptedKey = await decryptWithPassword(
        spendingPassword,
        encryptedPKey
      );
      setDecryptedPrivateKey(decryptedKey);
    };
    if (isMounted.current) {
      // call the function
      initAccount()
        // make sure to catch any error
        .catch(console.error);
    }
  }, [seedPhrase]);

  const handleClick = () => {
    if (validateSeedPhrase(updatedSeedPhrase)) {
      setSeedPhrase(updatedSeedPhrase);
    } else {
      alert('invalid seed phrase');
    }
  };

  return (
    <>
      <h1>Your own wallet</h1>
      <h3>Use custom seed phrase:</h3>
      <input onChange={(event) => setUpdatedSeedPhrase(event.target.value)} />
      <button onClick={handleClick}>Update</button>
      <h3>Seed phrase:</h3>
      <p>
        {seedPhrase}
        {isValid ? ' (valid)' : ' (invalid)'}
      </p>
      <h3>Private Key:</h3>
      <p>{privateKey?.to_hex()}</p>
      <h3>Encrypted Private Key:</h3>
      <p>{encryptedPrivateKey}</p>
      <h3>Decrypted Private Key:</h3>
      <p>{decryptedPrivateKey}</p>
      <h3>Stake address:</h3>
      <p>{stakeAddress && stakeAddress.stakeAddress}</p>
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
  );
};
