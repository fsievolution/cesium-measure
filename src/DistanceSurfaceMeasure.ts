import {
  Cartesian2,
  Cartographic,
  EllipsoidGeodesic,
  SceneTransforms,
} from 'cesium';

import DistanceMeasure from './DistanceMeasure';
import { pickCartesian3 } from './utils';

import type { Cartesian3, PolylineGraphics, Viewer } from 'cesium';
import type { MeasureOptions } from './Measure';

/**
 * Surface distance measurement class
 */
class DistanceSurfaceMeasure extends DistanceMeasure {
  private _splitNum: number;

  constructor(
    viewer: Viewer,
    options: MeasureOptions & {
      splitNum?: number;
    } = {},
  ) {
    super(viewer, options);
    this._splitNum = options.splitNum ?? 100;
  }
  /**
   * Calculate surface distance of a line segment
   * @param startPoint - screen coordinates of line segment start point
   * @param endPoint - screen coordinates of line segment end point
   * @returns surface distance
   */
  private _calculateSurfaceDistance(
    startPoint: Cartesian2,
    endPoint: Cartesian2,
  ): number {
    let resultDistance = 0;
    const sampleWindowPoints = [startPoint];
    const interval =
      Math.sqrt(
        Math.pow(endPoint.x - startPoint.x, 2) + (endPoint.y - startPoint.y, 2),
      ) / this._splitNum;
    for (let ii = 1; ii <= this._splitNum; ii += 1) {
      const tempPositon = this._findWindowPositionByPixelInterval(
        startPoint,
        endPoint,
        ii * interval,
      );
      sampleWindowPoints.push(tempPositon);
    }
    sampleWindowPoints.push(endPoint);
    for (let jj = 0; jj < sampleWindowPoints.length - 1; jj += 1) {
      resultDistance += this._calculateDetailSurfaceLength(
        sampleWindowPoints[jj + 1],
        sampleWindowPoints[jj],
      );
    }
    return resultDistance;
  }

  /**
   * Calculate the Cartesian coordinate distance of each subdivided segment (geodetic distance)
   * @param startPoint - start point of each segment
   * @param endPoint - end point of each segment
   * @returns surface distance
   */
  private _calculateDetailSurfaceLength(
    startPoint: Cartesian2,
    endPoint: Cartesian2,
  ): number {
    let innerS = 0;
    const surfaceStartCartesian3 = pickCartesian3(this._viewer, startPoint);
    const surfaceEndCartesian3 = pickCartesian3(this._viewer, endPoint);
    if (surfaceStartCartesian3 && surfaceEndCartesian3) {
      const cartographicStart = Cartographic.fromCartesian(
        surfaceStartCartesian3,
      );
      const cartographicEnd = Cartographic.fromCartesian(surfaceEndCartesian3);
      const geoD = new EllipsoidGeodesic();
      geoD.setEndPoints(cartographicStart, cartographicEnd);
      innerS = geoD.surfaceDistance;
      innerS = Math.sqrt(
        Math.pow(innerS, 2) +
          Math.pow(cartographicStart.height - cartographicEnd.height, 2),
      );
    }
    return innerS;
  }

  /**
   * Get coordinates of a point on the line at a certain distance from the start point (screen coordinates)
   * @param startPosition - line segment start point (screen coordinates)
   * @param endPosition - line segment end point (screen coordinates)
   * @param interval - distance from start point
   * @returns - result coordinates (screen coordinates)
   */
  private _findWindowPositionByPixelInterval(
    startPosition: Cartesian2,
    endPosition: Cartesian2,
    interval: number,
  ): Cartesian2 {
    const result = new Cartesian2(0, 0);
    const length = Math.sqrt(
      Math.pow(endPosition.x - startPosition.x, 2) +
        Math.pow(endPosition.y - startPosition.y, 2),
    );
    if (length < interval) {
      return result;
    } else {
      const x =
        (interval / length) * (endPosition.x - startPosition.x) +
        startPosition.x;
      //alert(interval/length)
      const y =
        (interval / length) * (endPosition.y - startPosition.y) +
        startPosition.y;
      result.x = x;
      result.y = y;
    }
    return result;
  }

  getDistance(pos1: Cartesian3, pos2: Cartesian3): number {
    const start = SceneTransforms.worldToWindowCoordinates(
      this._viewer.scene,
      pos1,
    )!;
    const end = SceneTransforms.worldToWindowCoordinates(
      this._viewer.scene,
      pos2,
    )!;

    return this._calculateSurfaceDistance(start, end);
  }

  start(style: PolylineGraphics.ConstructorOptions = {}) {
    this._start('POLYLINE', {
      clampToGround: true,
      style,
    });
  }
}

export default DistanceSurfaceMeasure;
