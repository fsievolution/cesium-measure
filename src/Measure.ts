import type { DrawOption } from "@cesium-extends/drawer";
import Drawer from "@cesium-extends/drawer";
import { MouseTooltip } from "@cesium-extends/tooltip";
import type { Units } from "@turf/helpers";
import type { Cartesian3, Entity, Viewer } from "cesium";
import {
  Cartesian2,
  Math as CMath,
  Color,
  HeightReference,
  LabelCollection,
  LabelStyle,
  NearFarScalar,
} from "cesium";
import { formatArea, formatLength } from "./utils";

export type MeasureUnits = Units;

export type MeasureLocaleOptions = {
  start: string;
  total: string;
  area: string;
  /**
   * Format length display
   * @param length in meters
   * @param unit target unit
   */
  formatLength(
    length: number,
    unitedLength: number,
    unit: MeasureUnits,
  ): string;
  /**
   * Format area display
   * @param area in square meters
   * @param unit target unit
   */
  formatArea(area: number, unitedArea: number, unit: MeasureUnits): string;
};

export type MeasureOptions = {
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

export type Status = "INIT" | "WORKING" | "DESTROY";

const DefaultOptions: MeasureOptions = {
  labelStyle: {
    font: `bold 20px Arial`,
    fillColor: Color.WHITE,
    backgroundColor: new Color(0.165, 0.165, 0.165, 0.8),
    backgroundPadding: new Cartesian2(4, 4),
    outlineWidth: 4,
    style: LabelStyle.FILL_AND_OUTLINE,
    pixelOffset: new Cartesian2(4, 0),
    scale: 1,
    scaleByDistance: new NearFarScalar(1, 0.85, 8.0e6, 0.75),
    heightReference: HeightReference.CLAMP_TO_GROUND,
  },
};

export default class Measure {
  protected _viewer: Viewer;
  protected _status: Status;
  protected _labels: LabelCollection;
  protected _labelStyle: MeasureOptions["labelStyle"];
  protected _units: MeasureUnits;
  protected _locale: MeasureLocaleOptions;
  protected _disableTooltip: boolean;

  mouseTooltip: MouseTooltip | null;
  drawer: Drawer;
  private _onEnd: ((entity: Entity) => void) | undefined;

  /**
   * Measurement tool
   * @param viewer
   * @param {MeasureOptions['locale']} [options.locale] Tooltip messages during drawing
   */
  constructor(viewer: Viewer, options: MeasureOptions = {}) {
    if (!viewer) throw new Error("undefined viewer");
    this._viewer = viewer;
    this._labelStyle = {
      ...DefaultOptions.labelStyle,
      ...options.labelStyle,
    };
    this._units = options.units ?? "kilometers";
    this._onEnd = options.onEnd;
    this._locale = {
      area: "Area",
      start: "start",
      total: "Total",
      formatLength,
      formatArea,
      ...options.locale,
    };
    this._disableTooltip = options.disableTooltip ?? false;

    this.mouseTooltip = this._disableTooltip ? null : new MouseTooltip(viewer);
    this.mouseTooltip?.hide();

    this.drawer = new Drawer(viewer, {
      sameStyle: true,
      terrain: true,
      ...options.drawerOptions,
    });

    this._labels = new LabelCollection({
      scene: this._viewer.scene,
    });
    this._viewer.scene.primitives.add(this._labels);

    this._status = "INIT";
  }

  /**
   * @return {boolean} Returns whether the measurement tool has been destroyed
   */
  get destroyed() {
    return this._status === "DESTROY";
  }

  /**
   * Update labels based on input coordinates
   * @param {Cartesian3[]} positions
   */

  protected _updateLabelFunc(positions: Cartesian3[]): void {}

  protected _cartesian2Lonlat(positions: Cartesian3[]) {
    return positions.map((pos) => {
      const cartographic =
        this._viewer.scene.globe.ellipsoid.cartesianToCartographic(pos);
      const lon = +CMath.toDegrees(cartographic.longitude);
      const lat = +CMath.toDegrees(cartographic.latitude);
      return [lon, lat];
    });
  }

  start() {}

  /**
   * Start drawing
   * @param {string} type Drawing shape type
   * @param {boolean} clampToGround Whether to clamp to ground
   */
  protected _start(
    type: "POLYGON" | "POLYLINE" | "POINT" | "CIRCLE" | "RECTANGLE",
    options?: {
      style?: object;
      clampToGround?: boolean;
    },
  ) {
    const { style, clampToGround } = options ?? {};
    if (this._status !== "INIT") return;

    const self = this;
    this.drawer.start({
      type,
      onPointsChange: self._updateLabelFunc.bind(self),
      dynamicOptions: {
        ...style,
        clampToGround,
      },
      finalOptions: {
        ...style,
        clampToGround,
      },
      onEnd: this._onEnd,
    });
    this._status = "WORKING";
  }

  /**
   * Clear measurement results, reset drawing
   */
  end() {
    this.drawer.reset();
    this._labels.removeAll();
    this._status = "INIT";
  }

  destroy() {
    this.end();
    this.mouseTooltip?.destroy();
    if (this._viewer && !this._viewer.isDestroyed()) {
      this._viewer.scene.primitives.remove(this._labels);
    }
    this._status = "DESTROY";
  }
}
