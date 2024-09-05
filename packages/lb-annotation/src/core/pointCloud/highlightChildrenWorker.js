/**
 *  Refactored by hexing@senseauto.com
 *  Date: 2024-06-23
 *  !!! break change !!!
 *  1. color retained from the last rendering, and there is external processing logic
 *  2. Narrow the rendering range by modifiedBoxIds and resetAreas
 *  3. Refactor highlightIndex highlight logic
 *  4. resetAreas currently only supports one area, TODO supports multiple areas, personally feel the priority is not high
 */
const REMAINED_COLOR_FLAG = [-1, -1, -1];

// let isLastRender2DToggleOn = false;

/**
 * Generate index with a fixed range.
 *
 * @param {*} z
 * @returns
 */
function getIndex(z) {
  const minZ = -7;
  const maxZ = 3;
  const len = maxZ - minZ;

  if (z < minZ) {
    z = minZ;
  }

  if (z > maxZ) {
    z = maxZ;
  }

  return Math.floor(((z - minZ) / len) * 255);
}

// COLOR_MAP_JET
function createColorMapJet() {
  let s;
  const p = Array.from({ length: 256 }, () => [0, 0, 0]);
  for (let i = 0; i < 20; i++) {
    for (s = 0; s < 32; s++) {
      p[s][0] = 128 + 4 * s;
      p[s][1] = 0;
      p[s][2] = 0;
    }
    p[32][0] = 255;
    p[32][1] = 0;
    p[32][2] = 0;
    for (s = 0; s < 63; s++) {
      p[33 + s][0] = 255;
      p[33 + s][1] = 4 + 4 * s;
      p[33 + s][2] = 0;
    }
    p[96][0] = 254;
    p[96][1] = 255;
    p[96][2] = 2;
    for (s = 0; s < 62; s++) {
      p[97 + s][0] = 250 - 4 * s;
      p[97 + s][1] = 255;
      p[97 + s][2] = 6 + 4 * s;
    }
    p[159][0] = 1;
    p[159][1] = 255;
    p[159][2] = 254;
    for (s = 0; s < 64; s++) {
      p[160 + s][0] = 0;
      p[160 + s][1] = 252 - s * 4;
      p[160 + s][2] = 255;
    }
    for (s = 0; s < 32; s++) {
      p[224 + s][0] = 0;
      p[224 + s][1] = 0;
      p[224 + s][2] = 252 - 4 * s;
    }
  }
  return p;
}

const COLOR_MAP_JET = createColorMapJet();

export function isInPolygon(checkPoint, polygonPoints, lineType = 0) {
  let counter = 0;
  let i;
  let xinters;
  let p1;
  let p2;

  polygonPoints = [...polygonPoints];
  if (lineType === 1) {
    polygonPoints = createSmoothCurvePoints(
      polygonPoints.reduce((acc, cur) => {
        return [...acc, cur.x, cur.y];
      }, []),
      0.5,
      true,
      SEGMENT_NUMBER,
    );
  }

  [p1] = polygonPoints;
  const pointCount = polygonPoints.length;

  for (i = 1; i <= pointCount; i++) {
    p2 = polygonPoints[i === pointCount ? 0 : i];
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const maxY = Math.max(p1.y, p2.y);

    if (checkPoint.x > minX && checkPoint.x <= maxX && checkPoint.y <= maxY) {
      if (p1.x !== p2.x) {
        xinters = ((checkPoint.x - p1.x) * (p2.y - p1.y)) / (p2.x - p1.x) + p1.y;
        if (p1.y === p2.y || checkPoint.y <= xinters) {
          counter++;
        }
      }
    }
    p1 = p2;
  }
  if (counter % 2 === 0) {
    return false;
  }
  return true;
}

function getNewColorByBox({ zMin, zMax, polygonPointList, attribute, x, y, z, colorList, valid }) {
  const inPolygon = isInPolygon({ x, y }, polygonPointList);
  if (inPolygon && z >= zMin && z <= zMax) {
    if (valid === false) {
      /** INVALID-COlOR rgba(255, 51, 51, 1) - It is same with lb-utils( /src/constant/style.ts ) */
      return [1, 103 / 255, 102 / 255];
    }

    if (colorList[attribute]) {
      return colorList[attribute].rgba.slice(0, 3).map((v) => v / 255);
    }

    return [1, 0, 0];
  }
}

/**
 * Update the color of points based on z-value
 * @param {number} z - z-coordinate value of a point
 */
function getPointColorByZ(z) {
  const index = getIndex(z);
  const newColor = COLOR_MAP_JET[index];
  const [r, g, b] = newColor;
  return [r / 255, g / 255, b / 255];
}

// 将原本的some查找换成原始for循环查找，210w大数据量只做一次赋值的情况下，性能提升8倍
function calcRenderCuboidList(list, { x, y, z }, colorList) {
  let newColorInfo;
  let found = false;
  for (let i = 0; i < list.length; i++) {
    const cuboid = list[i];
    const insideColor = getNewColorByBox({
      polygonPointList: cuboid.polygonPointList,
      zMin: cuboid.zMin,
      zMax: cuboid.zMax,
      x,
      y,
      z,
      attribute: cuboid.attribute,
      colorList,
      valid: cuboid.valid,
    });
    if (insideColor) {
      // updateNum();
      // cb();
      newColorInfo = insideColor;
      found = true;
      break;
    }
  }
  return {
    newColorInfo,
    found,
  };
}

function processPointsChunk(
  chunk,
  color,
  cuboidList,
  colorList,
  highlightIndex,
  is2DToggleOn,
  isLastRender2DToggleOn,
  modifiedBoxIds,
  resetAreas,
) {
  if (!chunk) {
    return;
  }

  const isPointHighlightBy2D = (index) => {
    const pointIndex = Math.floor(index / 3);
    return highlightIndex && highlightIndex[pointIndex] === 1;
  };

  // 将选中和没选中的进行分类，缩减2N时间复杂度到N
  let toRenderCuboidList = [];
  let otherCuboidList = [];
  if (modifiedBoxIds.length) {
    for (let i = 0; i < cuboidList.length; i++) {
      const v = cuboidList[i];
      if (modifiedBoxIds.includes(v.id)) {
        toRenderCuboidList.push(v);
      } else {
        otherCuboidList.push(v);
      }
    }
  } else {
    toRenderCuboidList = cuboidList;
    otherCuboidList = cuboidList;
  }

  // eslint-disable-next-line no-console
  // console.log(resetAreas, modifiedBoxIds, isLastRender2DToggleOn);
  for (let i = 0; i < chunk.length; i += 3) {
    const x = chunk[i];
    const y = chunk[i + 1];
    const z = chunk[i + 2];
    let newColorInfo;
    if (resetAreas.length === 1 && !modifiedBoxIds.length) {
      // deleting a single box
      if (isInPolygon({ x, y }, resetAreas[0])) {
        newColorInfo = getPointColorByZ(z);
      } else {
        // Preserve previous color outside delete area
        newColorInfo = REMAINED_COLOR_FLAG;
      }
    } else if (resetAreas.length || modifiedBoxIds.length) {
      // not init, Non-Single Box Delete
      let found = false;
      let isInReset = false;
      // 先找是否在选中的矩形坐标内
      const toRenderCuboidResult = calcRenderCuboidList(toRenderCuboidList, { x, y, z }, colorList);
      newColorInfo = toRenderCuboidResult.newColorInfo;
      found = toRenderCuboidResult.found;

      // 如果没找到的话，继续先看是否开启高亮，如果没有开启，那么走老逻辑，如果开启那么还得先判断是否在高亮范围内
      if (!found && resetAreas.length) {
        resetAreas.some((area) => {
          if (isInPolygon({ x, y }, area)) {
            newColorInfo = getPointColorByZ(z);
            isInReset = true;
            return true; // Find the color in the reset area and stop iterating
          }
          return false; // continue traversing
        });
      }

      if (found) {
        // 表示在当前操作的矩形框内，优先级第一
        //不改变
      } else if (is2DToggleOn && isPointHighlightBy2D(i)) {
        //当高亮开启的时候并且在高亮的视角内的时候，优先级第二，改成灰色
        newColorInfo = REMAINED_COLOR_FLAG;
        const otherCuboidResult = calcRenderCuboidList(otherCuboidList, { x, y, z }, colorList);
        newColorInfo = otherCuboidResult.newColorInfo;
      } else if (isInReset) {
        // eslint-disable-next-line no-console
        // console.log();
      } else {
        // The second situation is not for the next rendering after closing,
        // in the normal logic, the saved results of last time should be used
        newColorInfo = REMAINED_COLOR_FLAG;
      }

      if (!found && !isInReset && !is2DToggleOn) {
        // First determine if not inside a box, also not inside reset zone
        // Also 2d highlight is not on
        if (isLastRender2DToggleOn) {
          // 2d highlight not started has two situations, one is the next rendering after closing 2d highlight,
          // the color of origin highlight area is reset to default color by z value
          // This time, all points will be forced to refresh, so the color of the last time need not be considered
          newColorInfo = getPointColorByZ(z);
        } else {
          // The second situation is not for the next rendering after closing,
          // in the normal logic, the saved results of last time should be used
          newColorInfo = REMAINED_COLOR_FLAG;
        }
      }
    } else {
      // init
      const toRenderCuboidResult = calcRenderCuboidList(toRenderCuboidList, { x, y, z }, colorList);
      newColorInfo = toRenderCuboidResult.newColorInfo;
    }

    // Notice. Scope: [0, 1];
    if (newColorInfo) {
      if (newColorInfo[0] === REMAINED_COLOR_FLAG[0] && isPointHighlightBy2D(i)) {
        // Up to this point in the logic, it indicates that it is neither within the frame nor within the reset area,
        // when both the color of last time and the 2D highlight rendering are remembered,
        // the priority of 2D highlight rendering is higher
        color[i] = 0;
        color[i + 1] = 0;
        color[i + 2] = 0;
      } else {
        const [r, g, b] = newColorInfo;
        color[i] = r;
        color[i + 1] = g;
        color[i + 2] = b;
      }
    } else if (isPointHighlightBy2D(i)) {
      // 2D highlighting
      color[i] = 0;
      color[i + 1] = 0;
      color[i + 2] = 0;
    } else {
      // DEFAULT COLOR RENDER
      // Recover the originPoint
      const [r, g, b] = getPointColorByZ(z);
      color[i] = r;
      color[i + 1] = g;
      color[i + 2] = b;
    }
  }
  isLastRender2DToggleOn = is2DToggleOn;

  return color;
}

onmessage = (e) => {
  const { points, color, cuboidList, colorList, highlightIndex, modifiedBoxIds, resetAreas } = e.data;
  const is2DToggleOn = !!highlightIndex?.length;
  const isLastRender2DToggleOn = false; // 根据实际逻辑设定

  const processedColor = processPointsChunk(
    points,
    color,
    cuboidList,
    colorList,
    highlightIndex,
    is2DToggleOn,
    isLastRender2DToggleOn,
    modifiedBoxIds,
    resetAreas,
  );

  postMessage({ color: processedColor });
};
