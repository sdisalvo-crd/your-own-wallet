import './styles.css';
import { useState, useEffect } from 'react';
import { EmurgoModule } from './lib/emurgo/loader';
import {
  generateMnemonicSeed,
  validateSeedPhrase,
  generatePrivateKey,
  derivePrivateKey,
  generateStakeObject,
  generateMultipleAddresses,
} from './lib/account';

export const App = () => {
  const [seedPhrase, setSeedPhrase] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [privateKey, setPrivateKey] = useState<any>(undefined);
  const [stakeAddress, setStakeAddress] = useState<any>(undefined);
  const [externalPaymentAddresses, setExternalPaymentAddresses] = useState<
    string[]
  >([]);
  const [internalPaymentAddresses, setInternalPaymentAddresses] = useState<
    string[]
  >([]);

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
      });
    });
  }, []);

  return (
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
  );
};
