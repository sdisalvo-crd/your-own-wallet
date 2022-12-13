import './styles.css';
import { useState, useEffect } from 'react';
import { EmurgoModule } from './lib/emurgo/loader';
import {
  generateMnemonicSeed,
  validateSeedPhrase,
  generatePrivateKey,
  derivePrivateKey,
  generateStakeAddress,
} from './lib/account';

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
      // This will generate a private key and a stake address
      const getPrivateKey = generatePrivateKey(getSeedPhrase).then((pkey) => {
        setPrivateKey(pkey);
        const getStakeAddress = generateStakeAddress(
          derivePrivateKey(pkey)
        ).then((sAddr) => {
          setStakeAddress(sAddr);
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
