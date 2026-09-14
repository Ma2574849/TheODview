/**
 * CSV 解析 Web Worker
 * 在后台线程解析 CSV 和处理 OD 数据，避免阻塞 UI
 */

// 创建内联 Worker（CRA 不支持直接 import Worker 文件）
const workerCode = `
self.onmessage = function(e) {
    const { type, payload } = e.data;

    if (type === 'parseCSV') {
        try {
            const { csvText, hasHeader } = payload;
            const lines = csvText.split('\\n').filter(l => l.trim());
            if (lines.length === 0) {
                self.postMessage({ type: 'error', error: 'Empty CSV' });
                return;
            }

            // 解析表头
            const delimiter = lines[0].includes('\\t') ? '\\t' : ',';
            let headers;
            let startLine = 0;

            if (hasHeader) {
                headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
                startLine = 1;
            } else {
                const colCount = lines[0].split(delimiter).length;
                headers = Array.from({length: colCount}, (_, i) => 'field' + (i + 1));
            }

            // 解析数据行
            const data = [];
            for (let i = startLine; i < lines.length; i++) {
                const vals = lines[i].split(delimiter);
                if (vals.length < headers.length) continue;
                const row = {};
                headers.forEach((h, idx) => {
                    row[h] = vals[idx] ? vals[idx].trim().replace(/^"|"$/g, '') : '';
                });
                data.push(row);
            }

            self.postMessage({ type: 'csvResult', data, headers });
        } catch (err) {
            self.postMessage({ type: 'error', error: err.message });
        }
    }

    if (type === 'processOD') {
        try {
            const { data, SLON, SLAT, ELON, ELAT, COUNT, TIME } = payload;
            const locationsMap = {};
            const flows = [];
            const timeValues = [];

            for (let i = 0; i < data.length; i++) {
                const f = data[i];
                const sname = f[SLON] + ',' + f[SLAT];
                const ename = f[ELON] + ',' + f[ELAT];
                const count = COUNT === '=1' ? 1 : parseFloat(f[COUNT]) || 1;

                if (!locationsMap[sname]) locationsMap[sname] = 0;
                locationsMap[sname] += count;
                if (!locationsMap[ename]) locationsMap[ename] = 0;
                locationsMap[ename] += count;

                const flow = { origin: sname, dest: ename, count };
                // 时间列
                if (TIME && f[TIME]) {
                    flow.time = f[TIME];
                    timeValues.push(f[TIME]);
                }
                flows.push(flow);
            }

            const locations = [];
            for (const key in locationsMap) {
                const parts = key.split(',');
                locations.push({
                    id: key,
                    count: locationsMap[key],
                    lon: parseFloat(parts[0]),
                    lat: parseFloat(parts[1])
                });
            }

            // 计算时间范围
            let timeRange = null;
            let uniqueTimes = [];
            if (timeValues.length > 0) {
                uniqueTimes = [...new Set(timeValues)].sort();
                timeRange = { min: uniqueTimes[0], max: uniqueTimes[uniqueTimes.length - 1], steps: uniqueTimes };
            }

            const maxFlow = flows.reduce((a, b) => a.count > b.count ? a : b, {count: 0}).count;

            self.postMessage({
                type: 'odResult',
                locations,
                flows,
                maxFlow,
                timeRange,
            });
        } catch (err) {
            self.postMessage({ type: 'error', error: err.message });
        }
    }
};
`;

let workerInstance = null;

function getWorker() {
    if (!workerInstance) {
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        workerInstance = new Worker(URL.createObjectURL(blob));
    }
    return workerInstance;
}

// 解析 CSV（返回 Promise）
export function parseCSVInWorker(csvText, hasHeader = true) {
    return new Promise((resolve, reject) => {
        const worker = getWorker();
        const handler = (e) => {
            worker.removeEventListener('message', handler);
            if (e.data.type === 'csvResult') {
                resolve({ data: e.data.data, headers: e.data.headers });
            } else if (e.data.type === 'error') {
                reject(new Error(e.data.error));
            }
        };
        worker.addEventListener('message', handler);
        worker.postMessage({ type: 'parseCSV', payload: { csvText, hasHeader } });
    });
}

// 处理 OD 数据（返回 Promise）
export function processODInWorker(data, fieldMapping) {
    return new Promise((resolve, reject) => {
        const worker = getWorker();
        const handler = (e) => {
            worker.removeEventListener('message', handler);
            if (e.data.type === 'odResult') {
                resolve(e.data);
            } else if (e.data.type === 'error') {
                reject(new Error(e.data.error));
            }
        };
        worker.addEventListener('message', handler);
        worker.postMessage({ type: 'processOD', payload: { data, ...fieldMapping } });
    });
}

// 清理 Worker
export function terminateWorker() {
    if (workerInstance) {
        workerInstance.terminate();
        workerInstance = null;
    }
}
