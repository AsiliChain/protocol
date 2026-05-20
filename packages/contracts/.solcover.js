module.exports = {
  skipFiles: [
    "test/",
    "FarmerRegistryV2.sol",
  ],
  providerOptions: {
    allowUnlimitedContractSize: true,
  },
  configureYulOptimizer: true,
};
