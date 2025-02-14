// Define basic generic types that will be used by all state modules
export interface BaseStore {
  onlyLoadFirstData: boolean;
  setOnlyLoadFirstData: (onlyLoadFirstData: boolean) => void;
}

// Define point cloud type: PointCloudToolConfig Store
export interface PointCloudToolConfigStore {
  selectBoxVisibleSwitch: boolean;
  setSelectBoxVisibleSwitch: (selectBoxVisibleSwitch: boolean) => void;
  // Version number when switching to the same attribute, used to force updates to the relevant values of the main attribute
  checkoutAttrVer: number;
  setCheckoutAttrVer: (checkoutAttrVer: number) => void;
}

// Import all types into toolConfig Store through inheritance
export interface ToolConfigStore extends BaseStore, PointCloudToolConfigStore {}
