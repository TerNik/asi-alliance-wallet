import React from "react";
import style from "../style.module.scss";

export const NoDataAvailable: React.FC = () => {
  return <div className={style["noDataContainer"]}>No data available</div>;
};
