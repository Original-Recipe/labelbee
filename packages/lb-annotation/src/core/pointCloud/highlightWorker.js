import HighlightWorker from 'web-worker:./highlightChildrenWorker.js';

function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

onmessage = function onmessage(e) {
  const { position: points, color, cuboidList, colorList, highlightIndex, modifiedBoxIds, resetAreas } = e.data;

  const chunkSize = Math.ceil(points.length / navigator.hardwareConcurrency);
  const pointChunks = chunkArray(points, chunkSize);
  const colorChunks = chunkArray(color, chunkSize);

  const workerPromises = pointChunks.map((chunk, i) => {
    return new Promise((resolve) => {
      const worker = new HighlightWorker({ type: 'module' });
      worker.postMessage({
        points: chunk,
        color: colorChunks[i],
        cuboidList,
        colorList,
        highlightIndex,
        modifiedBoxIds,
        resetAreas,
      });

      worker.onmessage = (event) => {
        resolve(event.data);
        worker.terminate();
      };
    });
  });

  Promise.all(workerPromises).then((results) => {
    const mergedResults = results.reduce((acc, cur) => acc.concat(Array.from(new Float32Array(cur))), []);

    // let offset = 0;
    // results.forEach((result) => {
    //   finalColor.set(result.color, offset);
    //   offset += result.color.length;
    // });

    // eslint-disable-next-line no-console
    console.log(mergedResults);
    postMessage({ points, color: mergedResults });
  });
};
