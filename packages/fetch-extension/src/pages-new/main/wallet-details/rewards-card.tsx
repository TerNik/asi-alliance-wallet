import React from "react";
import style from "../style.module.scss";
import stakeIcon from "@assets/svg/wireframe/stake.svg";

interface RewardsCardProps {
  rewardsBalance: number;
  onNavigate: () => void;
}

export const RewardsCard: React.FC<RewardsCardProps> = ({
  rewardsBalance,
  onNavigate,
}) => {
  if (rewardsBalance <= 0) {
    return null;
  }

  return (
    <div className={style["rewards-card"]} onClick={onNavigate}>
      <div className={style["address-item"]}>
        <img src={stakeIcon} alt="" />
        <div>You&apos;ve claimable staking rewards </div>
      </div>
      <i key="next" className="fas fa-chevron-right" />
    </div>
  );
};
