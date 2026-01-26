import { Viewer, LabelCollection, Color, Cartesian2, LabelStyle, NearFarScalar, HeightReference, Entity, Cartesian3, PolygonGraphics, PolylineGraphics } from 'cesium';
import Drawer, { DrawOption } from '@cesium-extends/drawer';
import { MouseTooltip } from '@cesium-extends/tooltip';
import { Units } from '@turf/helpers';

type MeasureUnits = Units;
type MeasureLocaleOptions = {
    start: string;
    total: string;
    area: string;
    /**
     * Format length display
     * @param length in meters
     * @param unit target unit
     */
    formatLength(length: number, unitedLength: number, unit: MeasureUnits): string;
    /**
     * Format area display
     * @param area in square meters
     * @param unit target unit
     */
    formatArea(area: number, unitedArea: number, unit: MeasureUnits): string;
};
type MeasureOptions = {
    labelStyle?: {
        font?: string;
        fillColor?: Color;
        backgroundColor?: Color;
        backgroundPadding?: Cartesian2;
        outlineWidth?: number;
        style?: LabelStyle;
        pixelOffset?: Cartesian2;
        scale?: number;
        scaleByDistance?: NearFarScalar;
        heightReference?: HeightReference;
        disableDepthTestDistance?: number;
    };
    /** defaults to kilometers */
    units?: MeasureUnits;
    onEnd?: (entity: Entity) => void;
    drawerOptions?: Partial<DrawOption>;
    disableTooltip?: boolean;
    /**
     * @example
     * {
          start: 'Start',
          area: 'Area',
          total: 'Total',
          formatLength: (length, unitedLength) => {
            if (length < 1000) {
              return length + ' meters';
            }
            return unitedLength + ' kilometers';
          },
          formatArea: (area, unitedArea) => {
            if (area < 1000000) {
              return area + ' square meters';
            }
            return unitedArea + ' square kilometers';
          }
        }
     */
    locale?: Partial<MeasureLocaleOptions>;
};
type Status = "INIT" | "WORKING" | "DESTROY";
declare class Measure {
    protected _viewer: Viewer;
    protected _status: Status;
    protected _labels: LabelCollection;
    protected _labelStyle: MeasureOptions["labelStyle"];
    protected _units: MeasureUnits;
    protected _locale: MeasureLocaleOptions;
    protected _disableTooltip: boolean;
    mouseTooltip: MouseTooltip | null;
    drawer: Drawer;
    private _onEnd;
    /**
     * Measurement tool
     * @param viewer
     * @param {MeasureOptions['locale']} [options.locale] Tooltip messages during drawing
     */
    constructor(viewer: Viewer, options?: MeasureOptions);
    /**
     * @return {boolean} Returns whether the measurement tool has been destroyed
     */
    get destroyed(): boolean;
    /**
     * Update labels based on input coordinates
     * @param {Cartesian3[]} positions
     */
    protected _updateLabelFunc(positions: Cartesian3[]): void;
    protected _cartesian2Lonlat(positions: Cartesian3[]): number[][];
    start(): void;
    /**
     * Start drawing
     * @param {string} type Drawing shape type
     * @param {boolean} clampToGround Whether to clamp to ground
     */
    protected _start(type: "POLYGON" | "POLYLINE" | "POINT" | "CIRCLE" | "RECTANGLE", options?: {
        style?: object;
        clampToGround?: boolean;
    }): void;
    /**
     * Clear measurement results, reset drawing
     */
    end(): void;
    destroy(): void;
}

/**
 * Area measurement class
 */
declare class AreaMeasure extends Measure {
    protected _updateLabelFunc(positions: Cartesian3[]): void;
    /**
     * Calculate polygon area
     * @param {Cartesian3[]} positions positions
     * @returns {number} area in square meters
     */
    getArea(positions: Cartesian3[]): number;
    protected _updateLabelTexts(positions: Cartesian3[]): void;
    protected _getDistance(pos1: Cartesian3, pos2: Cartesian3): number;
    start(style?: PolygonGraphics.ConstructorOptions): void;
}

/**
 * Surface area measurement class
 */
declare class AreaSurfaceMeasure extends AreaMeasure {
    private _splitNum;
    /**
     * Surface area measurement constructor
     * @param viewer
     * @param [options.splitNum = 10] Interpolation count, number of grid cells to split the area into, default is 10
     */
    constructor(viewer: Viewer, options?: MeasureOptions & {
        splitNum?: number;
    });
    private _calculateSurfaceArea;
    private calculateDetailSurfaceArea;
    private _getWorldPositionsArea;
    private _Cartesian2turfPolygon;
    private _intersect;
    private _turfPloygon2CartesianArr;
    /**
     * Calculate surface polygon area
     * @param {Cartesian3[]} positions positions
     * @returns {number} area in square meters
     */
    getArea(positions: Cartesian3[]): number;
}

/**
 * Distance measurement class
 */
declare class DistanceMeasure extends Measure {
    protected _updateLabelFunc(positions: Cartesian3[]): void;
    /**
     * Calculate distance between two points
     * @param {Cartesian3} start position 1
     * @param {Cartesian3} end position 2
     * @returns {number} distance in meters
     */
    getDistance(start: Cartesian3, end: Cartesian3): number;
    getCart3AxisDistance(start: Cartesian3, end: Cartesian3): Cartesian3;
    getCart3Height(start: Cartesian3, end: Cartesian3): number;
    protected _updateLabelTexts(positions: Cartesian3[]): void;
    start(style?: PolylineGraphics.ConstructorOptions): void;
}

/**
 * Surface distance measurement class
 */
declare class DistanceSurfaceMeasure extends DistanceMeasure {
    private _splitNum;
    constructor(viewer: Viewer, options?: MeasureOptions & {
        splitNum?: number;
    });
    /**
     * Calculate surface distance of a line segment
     * @param startPoint - screen coordinates of line segment start point
     * @param endPoint - screen coordinates of line segment end point
     * @returns surface distance
     */
    private _calculateSurfaceDistance;
    /**
     * Calculate the Cartesian coordinate distance of each subdivided segment (geodetic distance)
     * @param startPoint - start point of each segment
     * @param endPoint - end point of each segment
     * @returns surface distance
     */
    private _calculateDetailSurfaceLength;
    /**
     * Get coordinates of a point on the line at a certain distance from the start point (screen coordinates)
     * @param startPosition - line segment start point (screen coordinates)
     * @param endPosition - line segment end point (screen coordinates)
     * @param interval - distance from start point
     * @returns - result coordinates (screen coordinates)
     */
    private _findWindowPositionByPixelInterval;
    getDistance(pos1: Cartesian3, pos2: Cartesian3): number;
    start(style?: PolylineGraphics.ConstructorOptions): void;
}

export { AreaMeasure, AreaSurfaceMeasure, DistanceMeasure, DistanceSurfaceMeasure, Measure };
