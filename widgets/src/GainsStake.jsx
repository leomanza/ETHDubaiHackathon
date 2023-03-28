const gainsStakingContract = "0x6B8D3C08072a020aC065c467ce922e3A36D3F9d6";
const gainsTokenContract = "0x18c11FD286C5EC11c3b683Caa813B77f5163A122";
const tokenDecimals = 18;
const fetchAbiRaw = (contract) => {
  return fetch(
    `https://raw.githubusercontent.com/leomanza/ETHDubaiHackathon/main/abis/gains/${contract}`
  );
};

const font = fetch(
  "'https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500;700&display=swap'"
).body;
const css = fetch(
  "https://pluminite.mypinata.cloud/ipfs/Qmboz8aoSvVXLeP5pZbRtNKtDD3kX5D9DEnfMn2ZGSJWtP"
).body;

let stakingAbi = fetchAbiRaw(gainsStakingContract);
let tokenAbi = fetchAbiRaw(gainsTokenContract);
const arbitrumApr = fetch("https://backend-arbitrum.gains.trade/apr", {
  subscribe: true,
});

if (!stakingAbi.ok && !tokenAbi.ok && !arbitrumApr && !font && !css) {
  return "Loading";
}
stakingAbi = JSON.parse(stakingAbi.body);
tokenAbi = JSON.parse(tokenAbi.body);
const iface = new ethers.utils.Interface(stakingAbi);
const tokenIFace = new ethers.utils.Interface(tokenAbi);

State.init({
  apr: arbitrumApr.body.sssBaseApr.toFixed(2),
});
const formatBigNumber = (big) => {
  return Big(big)
    .div(Big(10).pow(tokenDecimals))
    .toFixed(2)
    .replace(/\d(?=(\d{3})+\.)/g, "$&,");
};
const getStakedBalance = (receiver) => {
  const encodedData = iface.encodeFunctionData("users", [receiver]);

  return Ethers.provider()
    .call({
      to: gainsStakingContract,
      data: encodedData,
    })
    .then((rawBalance) => {
      const receiverBalanceHex = iface.decodeFunctionResult(
        "users",
        rawBalance
      );
      State.update({ rawStaked: receiverBalanceHex.stakedTokens.toString() });
      State.update({
        rawBoost: receiverBalanceHex.totalBoostTokens.toString(),
      });
      State.update({ rawDebtDai: receiverBalanceHex.debtDai.toString() });
      return formatBigNumber(receiverBalanceHex.stakedTokens.toString());
    });
};
const getRewardBalance = () => {
  const encodedData = iface.encodeFunctionData("accDaiPerToken");
  return Ethers.provider()
    .call({
      to: gainsStakingContract,
      data: encodedData,
    })
    .then((accDaiPerToken) => {
      const DaiPerToken = iface.decodeFunctionResult(
        "accDaiPerToken",
        accDaiPerToken
      );
      const daiReward =
        ((parseFloat(state.rawStaked) + parseFloat(state.rawBoost)) *
          parseFloat(DaiPerToken.toString())) /
          1e18 -
        state.rawDebtDai;

      return formatBigNumber(daiReward.toString());
    });
};

const getTokenBalance = (receiver) => {
  const encodedData = tokenIFace.encodeFunctionData("balanceOf", [receiver]);
  return Ethers.provider()
    .call({
      to: gainsTokenContract,
      data: encodedData,
    })
    .then((rawBalance) => {
      const receiverBalanceHex = tokenIFace.decodeFunctionResult(
        "balanceOf",
        rawBalance
      );
      return formatBigNumber(receiverBalanceHex.toString());
    });
};

const getTokenAllowance = (receiver) => {
  const encodedData = tokenIFace.encodeFunctionData("allowance", [
    receiver,
    gainsStakingContract,
  ]);
  return Ethers.provider()
    .call({
      to: gainsTokenContract,
      data: encodedData,
    })
    .then((rawBalance) => {
      const receiverBalanceHex = tokenIFace.decodeFunctionResult(
        "allowance",
        rawBalance
      )[0];
      return Big(receiverBalanceHex.toString())
        .div(Big(10).pow(tokenDecimals))
        .toFixed(2);
    });
};

const stakeTokens = (tokenAmount) => {
  if (!tokenAmount || tokenAmount > state.balance) {
    return;
  }
  const erc20 = new ethers.Contract(
    gainsStakingContract,
    stakingAbi,
    Ethers.provider().getSigner()
  );
  erc20
    .stakeTokens(ethers.utils.parseEther(state.tokenAmount))
    .then((transactionHash) => transactionHash.wait())
    .then((receipt) => {
      getTokenBalance(state.sender).then((balance) => {
        State.update({ balance });
      });
      getStakedBalance(state.sender).then((stakedBalance) => {
        State.update({ stakedBalance });
      });
      getRewardBalance().then((rewards) => {
        State.update({ rewards });
      });
      State.update({ tokenAmount: 0 });
    });
};
const unStakeTokens = () => {
  if (parseFloat(state.stakedBalance) == 0) {
    return;
  }
  const erc20 = new ethers.Contract(
    gainsStakingContract,
    stakingAbi,
    Ethers.provider().getSigner()
  );
  erc20
    .unstakeTokens(ethers.utils.parseEther(state.stakedBalance))
    .then((transactionHash) => transactionHash.wait())
    .then((receipt) => {
      getTokenBalance(state.sender).then((balance) => {
        State.update({ balance });
      });
      getStakedBalance(state.sender).then((stakedBalance) => {
        State.update({ stakedBalance });
      });
      getRewardBalance().then((rewards) => {
        State.update({ rewards });
      });
    });
};

const harverstRewards = () => {
  if (!(state.rewards > 0) && state.sender) {
    return;
  }
  const erc20 = new ethers.Contract(
    gainsStakingContract,
    stakingAbi,
    Ethers.provider().getSigner()
  );
  erc20
    .harvest()
    .then((transactionHash) => transactionHash.wait())
    .then((response) => {
      State.update({ rewards: 0 });
    });
};

const updateTokenAmount = (tokenAmount) => {
  State.update({ tokenAmount: tokenAmount });
};
const approveToken = () => {
  const erc20 = new ethers.Contract(
    gainsTokenContract,
    tokenAbi,
    Ethers.provider().getSigner()
  );
  const maxAllowance =
    "115792089237316195423570985008687907853269984665640564039457584007913129639935";
  erc20
    .approve(gainsStakingContract, maxAllowance)
    .then((transactionHash) => transactionHash.wait())
    .then((receipt) => {
      State.update({
        allowance: Big(maxAllowance).div(Big(10).pow(tokenDecimals)).toFixed(2),
      });
    });
};
const getTotalRewardDistributed = () => {
  const encodedData = iface.encodeFunctionData("totalRewardsDistributedDai");
  return Ethers.provider()
    .call({
      to: gainsStakingContract,
      data: encodedData,
    })
    .then((rawBalance) => {
      const receiverBalanceHex = iface.decodeFunctionResult(
        "totalRewardsDistributedDai",
        rawBalance
      );
      return Big(receiverBalanceHex.toString())
        .div(Big(10).pow(tokenDecimals))
        .toFixed(2)
        .replace(/\d(?=(\d{3})+\.)/g, "$&,");
    });
};
if (state.sender === undefined) {
  const accounts = Ethers.send("eth_requestAccounts", []);
  if (accounts.length) {
    State.update({ sender: accounts[0] });
  }
}
if (!state.totalRewards && state.sender) {
  getTotalRewardDistributed().then((totalRewards) => {
    State.update({ totalRewards });
  });
}
if (state.sender && state.balance === undefined) {
  getTokenBalance(state.sender).then((balance) => {
    State.update({ balance });
  });
}
if (state.sender && state.stakedBalance === undefined) {
  getStakedBalance(state.sender).then((stakedBalance) => {
    State.update({ stakedBalance });
  });
}
if (state.sender && state.allowance == undefined) {
  getTokenAllowance(state.sender).then((allowance) => {
    State.update({ allowance });
  });
}
if (state.sender && state.rewards == undefined) {
  getRewardBalance().then((rewards) => {
    State.update({ rewards });
  });
}
const Theme = styled.div`
    font-family: 'Source Code Pro', monospace;
    ${font}
    ${css}
`;
const getSender = () => {
  return !state.sender
    ? ""
    : state.sender.substring(0, 6) +
        "..." +
        state.sender.substring(state.sender.length - 10, state.sender.length);
};
return (
  <Theme>
    <div class="LidoContainer">
      <div class="Header">Gains Network Staking on Arbitrum</div>
      <div class="SubHeader">
        Stake GNS and receive DAI rewards while staking.
      </div>
      <div class="LidoForm">
        <>
          <div class="LidoFormTopContainer">
            <div class="LidoFormTopContainerLeft">
              <div class="LidoFormTopContainerLeftContent1">
                <div class="LidoFormTopContainerLeftContent1Container">
                  <span>GNS balance to stake</span>
                  <div class="LidoFormTopContainerLeftContent1Circle" />
                </div>
              </div>
              <div class="LidoFormTopContainerLeftContent2">
                <span>
                  {state.balance ?? (!state.sender ? "0" : "...")}
                  &nbsp;GNS
                </span>
              </div>

              <a
                class="LidoStakeFormInputContainerSpan3Content btn btn-secondary btn-lg active"
                role="button"
                aria-pressed="true"
                href="https://traderjoexyz.com/arbitrum/trade?inputCurrency=ETH&outputCurrency=0x18c11fd286c5ec11c3b683caa813b77f5163a122"
                target="_blank"
              >
                Get more GNS <i class="bi bi-link"></i>
              </a>
            </div>
            <div class="LidoFormTopContainerRight">
              <div class="LidoFormTopContainerRightContent1">
                <div class="LidoFormTopContainerRightContent1Text">
                  <span>{state.sender ? getSender() : "0x00..."}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="LidoSplitter" />
        </>
        <div
          class={
            state.sender ? "LidoFormBottomContainer" : "LidoFormTopContainer"
          }
        >
          <div class="LidoFormTopContainerLeft">
            <div class="LidoFormTopContainerLeftContent1">
              <div class="LidoFormTopContainerLeftContent1Container">
                <span>Your staked amount</span>
              </div>
            </div>
            <div class="LidoFormTopContainerLeftContent2">
              <span>
                {state.stakedBalance ?? (!state.sender ? "0" : "0")}
                &nbsp;GNS
              </span>
            </div>
            <button
              class="LidoStakeFormInputContainerSpan3Content"
              onClick={() => unStakeTokens()}
            >
              <span class="LidoStakeFormInputContainerSpan3Max">Unstake</span>
            </button>
          </div>
          <div class="LidoFormTopContainerLeft">
            <div class="LidoFormTopContainerLeftContent1">
              <div class="LidoFormTopContainerLeftContent1Container">
                <span>Your pending rewards</span>
              </div>
            </div>
            <div class="LidoFormTopContainerLeftContent2">
              <span>
                {state.rewards ?? 0}
                &nbsp;DAI
              </span>
            </div>
            <button
              class="LidoStakeFormInputContainerSpan3Content"
              onClick={() => harverstRewards()}
            >
              <span class="LidoStakeFormInputContainerSpan3Max">Harvest</span>
            </button>
          </div>
          <div class="LidoFormTopContainerRight">
            <div class="LidoAprContainer">
              <div class="LidoAprTitle">APR</div>
              <div class="LidoAprValue">{state.apr}%</div>
            </div>
          </div>
        </div>
      </div>
      <div class="LidoStakeForm">
        <div class="LidoStakeFormInputContainer">
          <span class="LidoStakeFormInputContainerSpan1">
            <img
              src="https://research.binance.com/static/images/projects/gains-network/logo.png"
              width="24"
              height="24"
            />
          </span>
          <span class="LidoStakeFormInputContainerSpan2">
            <input
              disabled={!state.sender}
              class="LidoStakeFormInputContainerSpan2Input"
              value={state.tokenAmount}
              onChange={(e) => updateTokenAmount(e.target.value)}
              placeholder="Amount"
            />
          </span>
          <span
            class="LidoStakeFormInputContainerSpan3"
            onClick={() =>
              updateTokenAmount(parseFloat(state.balance).toFixed(2))
            }
          >
            <button
              class="LidoStakeFormInputContainerSpan3Content"
              disabled={!state.sender}
            >
              <span class="LidoStakeFormInputContainerSpan3Max">MAX</span>
            </button>
          </span>
        </div>
        {!!state.sender ? (
          state.allowance > 0 ? (
            <button
              class="LidoStakeFormSubmitContainer"
              onClick={() => stakeTokens(state.tokenAmount)}
            >
              <span>Stake</span>
            </button>
          ) : (
            <button
              class="LidoStakeFormSubmitContainer"
              onClick={() => approveToken()}
            >
              <span>Approve</span>
            </button>
          )
        ) : (
          <Web3Connect
            className="LidoStakeFormSubmitContainer"
            connectLabel="Connect with Wallet"
          />
        )}
      </div>
    </div>
  </Theme>
);