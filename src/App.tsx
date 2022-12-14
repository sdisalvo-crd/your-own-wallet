import './styles.css';
import { useState, useEffect } from 'react';
import { EmurgoModule } from './lib/emurgo/loader';
import {
  generateMnemonicSeed,
  validateSeedPhrase,
  generatePrivateKey,
  derivePrivateKey,
  generateStakeObject,
  generatePaymentAddress,
} from './lib/account';

export const App = () => {
  const [seedPhrase, setSeedPhrase] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [privateKey, setPrivateKey] = useState<any>(undefined);
  const [stakeAddress, setStakeAddress] = useState<any>(undefined);
  const [paymentAddresses, setPaymentAddresses] = useState<string[]>([]);

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
        // This will generate a payment address based on the private key, the network ID,
        // the chain (which can be internal or external) and the index.
        const paymentAddress = generatePaymentAddress(pkey, 0, 0, 0).then(
          (pAddress) => {
            setPaymentAddresses([...paymentAddresses, pAddress]);
          }
        );
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
      <p>
        <strong>Payment address:</strong> {paymentAddresses[0]}
      </p>
    </>
  );
};
