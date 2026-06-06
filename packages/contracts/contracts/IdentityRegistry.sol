// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";

/**
 * @title IdentityRegistry
 * @notice ERC-8004 Identity Registry — assigns each AI agent a unique ERC-721 NFT identity.
 * @dev UUPS upgradeable. Deployed as a proxy. Follows the canonical ERC-8004 spec:
 *      - register() / register(agentURI) → mint agent NFT, return agentId
 *      - tokenURI(agentId) → resolve agent metadata
 *      - Ownable: DEFAULT_ADMIN controls the registry
 */
contract IdentityRegistry is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ERC721Upgradeable,
    ERC721URIStorageUpgradeable
{
    // ──────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────

    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);

    // ──────────────────────────────────────────
    //  Storage
    // ──────────────────────────────────────────

    // ──────────────────────────────────────────
    //  Constructor + Initializer
    // ──────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address defaultAdmin) external initializer {
        require(defaultAdmin != address(0), "IdentityRegistry: zero admin");
        __Ownable_init(defaultAdmin);
        __ERC721_init("AgentIdentity", "AGENT");
        __ERC721URIStorage_init();
    }

    // ──────────────────────────────────────────
    //  Registration
    // ──────────────────────────────────────────

    uint256 private _lastId;

    /**
     * @notice Register a new agent without metadata URI.
     * @return agentId The newly minted agent token ID.
     */
    function register() external returns (uint256 agentId) {
        agentId = _lastId;
        _lastId++;

        _safeMint(msg.sender, agentId);
        emit Registered(agentId, "", msg.sender);
    }

    /**
     * @notice Register a new agent with a metadata URI.
     * @param agentURI URI pointing to agent registration file (JSON).
     * @return agentId The newly minted agent token ID.
     */
    function register(string memory agentURI) external returns (uint256 agentId) {
        agentId = _lastId;
        _lastId++;

        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, agentURI);
        emit Registered(agentId, agentURI, msg.sender);
    }

    /**
     * @notice Register an agent and mint the identity NFT to a specific wallet.
     * @dev Used by the agent invite flow to mint the NFT directly to the agent's wallet.
     * @param agentWallet The wallet that will own the agent identity NFT.
     * @return agentId The newly minted agent token ID.
     */
    function registerFor(address agentWallet) external returns (uint256 agentId) {
        require(agentWallet != address(0), "IdentityRegistry: zero address");
        agentId = _lastId;
        _lastId++;

        _safeMint(agentWallet, agentId);
        emit Registered(agentId, "", agentWallet);
    }

    /**
     * @notice Update an agent's metadata URI.
     * @param agentId The agent token ID.
     * @param newURI  New URI pointing to the agent registration file.
     */
    function setAgentURI(uint256 agentId, string memory newURI) external {
        require(ownerOf(agentId) == msg.sender, "IdentityRegistry: not agent owner");
        _setTokenURI(agentId, newURI);
    }

    // ──────────────────────────────────────────
    //  ERC-721 Overrides (required by Solidity)
    // ──────────────────────────────────────────

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return ERC721URIStorageUpgradeable.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (bool)
    {
        return ERC721Upgradeable.supportsInterface(interfaceId);
    }

    // ──────────────────────────────────────────
    //  UUPS
    // ──────────────────────────────────────────

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}
}
