import { StateCreator } from 'zustand';
import { PointCloudToolConfigStore } from './types';

const pointCloudToolStateCreator: StateCreator<PointCloudToolConfigStore> = (set, get) => ({
  selectBoxVisibleSwitch: false,
  setSelectBoxVisibleSwitch: (selectBoxVisibleSwitch: boolean) =>
    set(() => ({ selectBoxVisibleSwitch })),
  checkoutAttrVer: 0,
  setCheckoutAttrVer: (checkoutAttrVer: number) => set(() => ({ checkoutAttrVer })),
});

export default pointCloudToolStateCreator;
