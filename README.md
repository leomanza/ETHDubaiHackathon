# Gains Network Staking on Arbitrum (ETHDubai Hackathon)

Submission for a live working frontend component deployed to the NEAR mainnet that interacts with Gains Network on the Arbitrum One mainnet, allowing stake GNS and receive DAI in rewards.

## What it does

The decentralized frontend component is deployed to the NEAR mainnet and interacts with Gains Network on the Arbitrum One mainnet, allowing users to stake GNS and receive DAI rewards while staking. The user can connect to the component with a wallet and make a transaction on the Arbitrum mainnet.

 Build it by implementing a decentralised front end on top of the Blockchain Operating System (BOS).


## What's next for Gains Network Staking on Arbitrum

Improve UI and including more features, such as trading on long and short.

## Try it out

 [bos.gg](https://bos.gg/#/manzanal.near/widget/GainsStakingArbitrum)

 ## How to deploy

## Download the on-chain code from BOS

To download the widgets, use the [`near-social` CLI](https://github.com/FroVolod/near-social). 
Run this command and follow the steps
```
near-social download manzanal.near
```
It will download a bunch of widgets from this account. The files in this repository were downloaded using this command to get the on-chain code developed during the hackathon.

### Deploy for Testing
To deploy the widgets, use [`near-social` CLI](https://github.com/FroVolod/near-social). 
Run this command and follow the steps:

```
near-social deploy
```

Once deployed, open `GainStakingArbitrum` widget on your account on testnet NEAR Social:

```
https://test.near.social/#/YOUR_ACCOUNT_ID/widget/GainStakingArbitrum
```
### Deploy for Production

On future improvements it will included a GitHub Actions automation that deploys all the widgets to a specified account on mainnet on every push to the main branch.

Meanwhile, follow the deploy for testing steps but changing NEAR_ENV=mainnet