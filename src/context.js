import React from 'react';
import { CURRENT_MONTH_IDX } from './constants';
export const MonthContext = React.createContext({ selectedMonthIdx: CURRENT_MONTH_IDX, setSelectedMonthIdx: ()=>{} });
export const useMonth = () => React.useContext(MonthContext);
