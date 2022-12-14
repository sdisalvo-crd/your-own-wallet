import { Bip32PrivateKey } from '@emurgo/cardano-serialization-lib-browser';
import { generateMnemonic, mnemonicToEntropy, validateMnemonic } from 'bip39';
import { EmurgoModule } from './emurgo/loader';

// To generate a 15 word seedphrase use size 160.
// To generate a 24 word seedphase use size 256.
export const generateMnemonicSeed = (size: number) => {
  return generateMnemonic(size);
};

export const validateSeedPhrase = (seedPhrase: string) => {
    return validateMnemonic(seedPhrase);
}

export const generateEntropy = (seedPhrase: string) => {
  return mnemonicToEntropy(seedPhrase);
}

export const generatePrivateKey = async (seedPhrase: string) => {
  const Cardano = await EmurgoModule.CardanoWasm();
  const bip39entropy = generateEntropy(seedPhrase);
  const entropyBuffer = Buffer.from(bip39entropy, 'hex');
  const emptyPassword = Buffer.from('');
  const privateKey = Cardano.Bip32PrivateKey.from_bip39_entropy(entropyBuffer, emptyPassword);
  return privateKey;
}

export const derivePrivateKey = (privateKey: Bip32PrivateKey, index = 0) => {
  // The following ones are fixed values. More info here: https://cips.cardano.org/cips/cip1852/
  const DERIVE_PUROPOSE = 1852;
  const DERIVE_COIN_TYPE = 1815;
  
  return privateKey.derive(harden(DERIVE_PUROPOSE)).derive(harden(DERIVE_COIN_TYPE)).derive(harden(index));
}

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

export const generatePaymentAddress = async (derivePkey: Bip32PrivateKey, network: number, chain: number, index: number) => {
  const Cardano = await EmurgoModule.CardanoWasm();
  const stakeObject = await generateStakeObject(derivePkey);
  const paymentKey = derivePkey.derive(chain).derive(index);
  const paymentAddress = Cardano.BaseAddress.new(network, 
    Cardano.StakeCredential.from_keyhash(paymentKey.to_raw_key().to_public().hash()), 
    Cardano.StakeCredential.from_keyhash(stakeObject.publicStakeKey.hash()));
  return paymentAddress.to_address().to_bech32();
}
