import './styles.css';
import { EmurgoModule } from './lib/emurgo/loader';
import { generateMnemonicSeed, validateSeedPhrase } from './lib/account';

export const App = () => {
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
  return <h1>Your own wallet</h1>;
};
