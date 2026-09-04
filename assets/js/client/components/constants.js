// @flow
// Application constants
export const PERSPECTIVE_PRODUCTION = 'Hotspot';
export const PERSPECTIVE_CONSUMPTION = 'Contribution';

export const VIZ_TREEMAP = 'Sectoral';
export const VIZ_GEOMAP = 'Geographic';

export const VIZDETAIL_TOTAL = 'total';
export const VIZDETAIL_CONTINENT = 'continent';
export const VIZDETAIL_COUNTRY = 'country';

export const MAX_JOB_COUNT = 15;
export const WAIT_INTERVAL = 5000;

// Default query for initial load
export const getDefaultQuery = () => ({
    dimType: PERSPECTIVE_PRODUCTION,
    vizType: VIZ_TREEMAP,
    nodesSec: [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
    nodesReg: [1],
    extn: [1],
    year: [2011]
});

// Initial state
export const getInitialState = () => ({
    selectedPerspectiveOption: PERSPECTIVE_PRODUCTION,
    selectedVisualizationOption: VIZ_TREEMAP,
    selectedVisualizationDetailOption: VIZDETAIL_COUNTRY,
    selectedYearOption: [],
    selectedProductOptions: [],
    selectedRegionOptions: [],
    selectedIndicatorOptions: [],
    selectMultiProduct: true,
    selectMultiRegion: false,
    busy: true,
    jobs: [],
    model_details: [],
    waiting_modal_open: false
});