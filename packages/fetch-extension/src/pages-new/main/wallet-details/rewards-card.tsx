import React from "react";
import style from "../style.module.scss";

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
        <img src={require("@assets/svg/wireframe/stake.svg")} alt="" />
        <div>You've claimable staking rewards </div>
      </div>
      <i key="next" className="fas fa-chevron-right" />
    </div>
  );
};
