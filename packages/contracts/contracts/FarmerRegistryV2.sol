// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./FarmerRegistry.sol";

/**
 * @title FarmerRegistryV2
 * @notice Identical to V1 with an added version() getter.
 *         Used exclusively for upgrade tests.
 */
contract FarmerRegistryV2 is FarmerRegistry {
    function version() external pure returns (string memory) {
        return "2.0.0";
    }
}
