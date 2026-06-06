// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IFarmerRegistry {
    struct Farmer {
        string maaifFarmerId;
        address cooperativeWallet;
        bytes32 farmBoundaryIpfsCid;
        uint256 farmAreaHectares;
        bool gfwDeforestationFree;
        bool active;
        uint256 registrationTimestamp;
        string nationalId;
        string farmerName;
        string phoneNumber;
    }

    function getFarmer(address farmerWallet) external view returns (Farmer memory);
    function isRegistered(address farmerWallet) external view returns (bool);
    function farmerExists(address farmerWallet) external view returns (bool);
    function isIndependent(address farmerWallet) external view returns (bool);
    function getFarmerCount(address cooperativeWallet) external view returns (uint256);
}
