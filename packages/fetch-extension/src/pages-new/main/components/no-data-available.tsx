import React from "react";
import style from "./main-page.module.scss";

export const NoDataAvailable: React.FC = () => {
  return <div className={style["noDataContainer"]}>No data available</div>;
};
