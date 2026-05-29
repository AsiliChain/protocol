// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IBatchToken {
    function checkExists(uint256 tokenId) external view;
    function hasActiveLoan(uint256 tokenId) external view returns (bool);
    function lockAsCollateral(uint256 tokenId) external;
    function unlockCollateral(uint256 tokenId) external;
    function burnSettled(uint256 tokenId) external;
}