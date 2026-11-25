
// ==========================================
// CPU SCHEDULING SIMULATOR
// FCFS, SJF, SRTF, dan ROUND ROBIN
// ==========================================

const algorithm = document.getElementById("algorithm");
const processCount = document.getElementById("processCount");
const quantum = document.getElementById("quantum");
const quantumGroup = document.getElementById("quantumGroup");
const processInputs = document.getElementById("processInputs");
const generateBtn = document.getElementById("generateBtn");
const calculateBtn = document.getElementById("calculateBtn");
const ganttChart = document.getElementById("ganttChart");
const results = document.getElementById("results");
const averages = document.getElementById("averages");
const message = document.getElementById("message");

const colors = [
    "#2563eb",
    "#0d9488",
    "#9333ea",
    "#d97706",
    "#0891b2",
    "#dc2626"
];

// ==========================================
// 1. MENAMPILKAN INPUT PROSES
// ==========================================

function generateInputs() {
    const count = Number(processCount.value);

    if (!Number.isInteger(count) || count < 1 || count > 6) {
        message.textContent = "Jumlah proses harus antara 1 sampai 6.";
        return;
    }

    message.textContent = "";
    processInputs.innerHTML = "";

    for (let i = 0; i < count; i++) {
        const row = document.createElement("div");
        row.className = "process-row";

        row.innerHTML = `
            <h3>Proses P${i + 1}</h3>

            <div>
                <label>Arrival Time (AT)</label>
                <input type="number" class="at"
                       min="0" step="1" value="${i}">
            </div>

            <div>
                <label>Burst Time (BT)</label>
                <input type="number" class="bt"
                       min="1" step="1" value="${i + 3}">
            </div>
        `;

        processInputs.appendChild(row);
    }
}

// ==========================================
// 2. MENGAMBIL DATA PROSES
// ==========================================

function getProcesses() {
    const atInputs = document.querySelectorAll(".at");
    const btInputs = document.querySelectorAll(".bt");

    const processes = [];

    for (let i = 0; i < atInputs.length; i++) {
        const at = Number(atInputs[i].value);
        const bt = Number(btInputs[i].value);

        if (
            atInputs[i].value.trim() === "" ||
            btInputs[i].value.trim() === "" ||
            !Number.isInteger(at) ||
            !Number.isInteger(bt) ||
            at < 0 ||
            bt <= 0
        ) {
            throw new Error(
                `Data P${i + 1} tidak valid. AT harus 0 atau lebih dan BT harus lebih dari 0.`
            );
        }

        processes.push({
            id: `P${i + 1}`,
            at: at,
            bt: bt,
            remaining: bt,
            firstStart: null,
            ct: 0,
            order: i
        });
    }

    return processes;
}

// ==========================================
// 3. MENAMBAHKAN SEGMENT GANTT CHART
// ==========================================

function addSegment(chart, id, start, end) {
    if (end <= start) return;

    const last = chart[chart.length - 1];

    // Gabungkan proses yang sama dan berurutan
    if (last && last.id === id && last.end === start) {
        last.end = end;
    } else {
        chart.push({
            id: id,
            start: start,
            end: end
        });
    }
}

// ==========================================
// 4. ALGORITMA FCFS
// ==========================================

function runFCFS(processes) {
    const chart = [];
    let time = 0;

    const queue = [...processes].sort(
        (a, b) => a.at - b.at || a.order - b.order
    );

    for (const p of queue) {
        if (time < p.at) {
            addSegment(chart, "Idle", time, p.at);
            time = p.at;
        }

        p.firstStart = time;

        const start = time;
        time += p.bt;

        addSegment(chart, p.id, start, time);
        p.ct = time;
    }
    if (algorithm === "hrn") {
    const output = runHRN(processes);
    renderHRN(output);
    return;
}

    return chart;
}

// ==========================================
// 5. ALGORITMA SJF NON-PREEMPTIVE
// ==========================================

function runSJF(processes) {
    const chart = [];
    let time = 0;
    let completed = 0;

    while (completed < processes.length) {
        const available = processes
            .filter(p => p.at <= time && p.ct === 0)
            .sort(
                (a, b) =>
                    a.bt - b.bt ||
                    a.at - b.at ||
                    a.order - b.order
            );

        if (available.length === 0) {
            const nextArrival = Math.min(
                ...processes
                    .filter(p => p.ct === 0)
                    .map(p => p.at)
            );

            addSegment(chart, "Idle", time, nextArrival);
            time = nextArrival;
            continue;
        }

        const p = available[0];

        p.firstStart = time;

        const start = time;
        time += p.bt;

        addSegment(chart, p.id, start, time);
        p.ct = time;
        completed++;
    }

    return chart;
}

// ==========================================
// 6. ALGORITMA SRTF PREEMPTIVE
// ==========================================

function runSRTF(processes) {
    const chart = [];
    let time = 0;
    let completed = 0;

    while (completed < processes.length) {
        const available = processes
            .filter(p => p.at <= time && p.remaining > 0)
            .sort(
                (a, b) =>
                    a.remaining - b.remaining ||
                    a.at - b.at ||
                    a.order - b.order
            );

        if (available.length === 0) {
            const nextArrival = Math.min(
                ...processes
                    .filter(p => p.remaining > 0)
                    .map(p => p.at)
            );

            addSegment(chart, "Idle", time, nextArrival);
            time = nextArrival;
            continue;
        }

        const p = available[0];

        if (p.firstStart === null) {
            p.firstStart = time;
        }

        addSegment(chart, p.id, time, time + 1);

        p.remaining--;
        time++;

        if (p.remaining === 0) {
            p.ct = time;
            completed++;
        }
    }

    return chart;
}

// ==========================================
// 7. ALGORITMA ROUND ROBIN
// ==========================================

function runRR(processes, tq) {
    const chart = [];
    const queue = [];

    const sorted = [...processes].sort(
        (a, b) => a.at - b.at || a.order - b.order
    );

    let time = 0;
    let index = 0;
    let completed = 0;

    while (completed < processes.length) {

        // Masukkan proses yang sudah tiba
        while (
            index < sorted.length &&
            sorted[index].at <= time
        ) {
            queue.push(sorted[index]);
            index++;
        }

        // Jika antrean kosong, CPU Idle
        if (queue.length === 0) {
            const nextArrival = sorted[index].at;

            addSegment(chart, "Idle", time, nextArrival);
            time = nextArrival;
            continue;
        }

        const p = queue.shift();

        if (p.firstStart === null) {
            p.firstStart = time;
        }

        const duration = Math.min(tq, p.remaining);
        const start = time;

        time += duration;
        p.remaining -= duration;

        addSegment(chart, p.id, start, time);

        // Masukkan proses baru yang tiba selama eksekusi
        while (
            index < sorted.length &&
            sorted[index].at <= time
        ) {
            queue.push(sorted[index]);
            index++;
        }

        if (p.remaining > 0) {
            // Proses yang belum selesai kembali ke antrean
            queue.push(p);
        } else {
            p.ct = time;
            completed++;
        }
    }

    return chart;
}

// ==========================================
// 8. MENGHITUNG CT, TAT, WT, DAN RT
// ==========================================

function calculateMetrics(processes) {
    for (const p of processes) {
        p.tat = p.ct - p.at;
        p.wt = p.tat - p.bt;
        p.rt = p.firstStart - p.at;
    }
}

// ==========================================
// 9. MENAMPILKAN GANTT CHART
// ==========================================


function displayGantt(chart) {
    ganttChart.innerHTML = "";

    const blocks = document.createElement("div");
    blocks.className = "gantt-blocks";

    const times = document.createElement("div");
    times.className = "gantt-time";

    chart.forEach((segment) => {
        const duration = segment.end - segment.start;

        const block = document.createElement("div");
        block.className = "gantt-block";
        block.style.flex = `${duration} 1 0%`;
        block.style.background =
            segment.id === "Idle"
                ? "#64748b"
                : colors[Number(segment.id.slice(1)) - 1];

        block.textContent = segment.id;
        blocks.appendChild(block);

        const timeLabel = document.createElement("span");
        timeLabel.textContent = segment.start;
        timeLabel.style.flex = `${duration} 1 0%`;
        times.appendChild(timeLabel);
    });

    if (chart.length > 0) {
        const endLabel = document.createElement("span");
        endLabel.textContent = chart[chart.length - 1].end;
        endLabel.className = "end-time";
        times.appendChild(endLabel);
    }

    ganttChart.appendChild(blocks);
    ganttChart.appendChild(times);
}

// 10. MENAMPILKAN TABEL HASIL

function displayResults(processes) {
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Proses</th>
                    <th>AT</th>
                    <th>BT</th>
                    <th>CT</th>
                    <th>TAT</th>
                    <th>WT</th>
                    <th>RT</th>
                </tr>
            </thead>
            <tbody>
    `;

    for (const p of processes) {
        html += `
            <tr>
                <td>${p.id}</td>
                <td>${p.at}</td>
                <td>${p.bt}</td>
                <td>${p.ct}</td>
                <td>${p.tat}</td>
                <td>${p.wt}</td>
                <td>${p.rt}</td>
            </tr>
        `;
    }

    html += "</tbody></table>";
    results.innerHTML = html;
}

// ==========================================
// 11. MENAMPILKAN RATA-RATA
// ==========================================

function displayAverages(processes) {
    const totalTAT = processes.reduce(
        (sum, p) => sum + p.tat, 0
    );

    const totalWT = processes.reduce(
        (sum, p) => sum + p.wt, 0
    );

    const totalRT = processes.reduce(
        (sum, p) => sum + p.rt, 0
    );

    const count = processes.length;

    averages.innerHTML = `
        <p>Average Turnaround Time:
            <strong>${(totalTAT / count).toFixed(2)}</strong>
        </p>

        <p>Average Waiting Time:
            <strong>${(totalWT / count).toFixed(2)}</strong>
        </p>

        <p>Average Response Time:
            <strong>${(totalRT / count).toFixed(2)}</strong>
        </p>
    `;
}

// ==========================================
// 12. MENJALANKAN PERHITUNGAN
// ==========================================

function calculateScheduling() {
    try {
        message.textContent = "";

        const processes = getProcesses();
        const selected = algorithm.value;

        let chart = [];

        if (selected === "fcfs") {
            chart = runFCFS(processes);
        } else if (selected === "sjf") {
            chart = runSJF(processes);
        } else if (selected === "srtf") {
            chart = runSRTF(processes);
        } else if (selected === "rr") {
            const tq = Number(quantum.value);

            if (
                quantum.value.trim() === "" ||
                !Number.isInteger(tq) ||
                tq <= 0
            ) {
                throw new Error("Time Quantum harus bilangan bulat lebih dari 0.");
            }

            chart = runRR(processes, tq);
        }

        calculateMetrics(processes);

        displayGantt(chart);
        displayResults(processes);
        displayAverages(processes);

    } catch (error) {
        message.textContent = error.message;
    }
}

// ==========================================
// 13. EVENT LISTENER
// ==========================================

generateBtn.addEventListener("click", generateInputs);

calculateBtn.addEventListener("click", calculateScheduling);

algorithm.addEventListener("change", () => {
    quantumGroup.hidden = algorithm.value !== "rr";
});

// Input awal otomatis ditampilkan
generateInputs();

function runHRN(processes) {
    let currentTime = 0;
    let completed = 0;

    let gantt = [];
    let results = [];
    let logs = [];

    // Salin data proses agar data asli tidak berubah
    let data = processes.map((p, index) => ({
        id: p.id,
        arrivalTime: Number(p.arrivalTime),
        burstTime: Number(p.burstTime),
        index: index,
        isCompleted: false
    }));

    while (completed < data.length) {

        // Cari proses yang sudah tiba
        let readyQueue = data.filter(p =>
            !p.isCompleted &&
            p.arrivalTime <= currentTime
        );

        // Jika belum ada proses yang datang
        if (readyQueue.length === 0) {

            let nextArrival = Math.min(
                ...data
                    .filter(p => !p.isCompleted)
                    .map(p => p.arrivalTime)
            );

            gantt.push({
                id: "IDLE",
                start: currentTime,
                end: nextArrival
            });

            currentTime = nextArrival;
            continue;
        }

        // Hitung Response Ratio setiap kandidat
        let candidates = readyQueue.map(p => {

            let waitingTime = currentTime - p.arrivalTime;

            let responseRatio =
                (waitingTime + p.burstTime) / p.burstTime;

            return {
                ...p,
                waitingTime,
                responseRatio
            };
        });

        // Pilih Response Ratio tertinggi
        candidates.sort((a, b) => {

            if (Math.abs(
                b.responseRatio - a.responseRatio
            ) > 1e-9) {
                return b.responseRatio - a.responseRatio;
            }

            if (a.arrivalTime !== b.arrivalTime) {
                return a.arrivalTime - b.arrivalTime;
            }

            return a.index - b.index;
        });

        let selected = candidates[0];

        // Catat proses yang dipilih
        logs.push({
            time: currentTime,
            candidates: candidates.map(p => ({
                id: p.id,
                waitingTime: p.waitingTime,
                burstTime: p.burstTime,
                responseRatio: p.responseRatio
            })),
            selected: selected.id
        });

        // Eksekusi proses sampai selesai
        let startTime = currentTime;

        let completionTime =
            startTime + selected.burstTime;

        let turnaroundTime =
            completionTime - selected.arrivalTime;

        let waitingTime =
            turnaroundTime - selected.burstTime;

        let responseTime =
            startTime - selected.arrivalTime;

        // Simpan hasil perhitungan
        results.push({
            id: selected.id,
            arrivalTime: selected.arrivalTime,
            burstTime: selected.burstTime,
            startTime,
            completionTime,
            turnaroundTime,
            waitingTime,
            responseTime
        });

        // Simpan Gantt Chart
        gantt.push({
            id: selected.id,
            start: startTime,
            end: completionTime
        });

        selected.isCompleted = true;

        currentTime = completionTime;
        completed++;
    }

    // Hitung rata-rata
    let totalWT = results.reduce(
        (sum, p) => sum + p.waitingTime, 0
    );

    let totalTAT = results.reduce(
        (sum, p) => sum + p.turnaroundTime, 0
    );

    let totalRT = results.reduce(
        (sum, p) => sum + p.responseTime, 0
    );

    let totalBurst = data.reduce(
        (sum, p) => sum + p.burstTime, 0
    );

    let totalTime = currentTime;

    let averages = {
        averageWT: totalWT / results.length,
        averageTAT: totalTAT / results.length,
        averageRT: totalRT / results.length,
        throughput: results.length / totalTime,
        cpuUtilization: (totalBurst / totalTime) * 100
    };

    return {
        gantt,
        results,
        logs,
        averages,
        totalTime
    };
}

function runHRN(processes) {
    let currentTime = 0;
    let completed = 0;

    const gantt = [];
    const results = [];
    const logs = [];

    // Membaca dan memeriksa data proses
    const data = processes.map((p, index) => ({
        id: String(p.id || `P${index + 1}`),
        arrivalTime: Number(p.arrivalTime ?? p.at),
        burstTime: Number(p.burstTime ?? p.bt),
        index,
        isCompleted: false
    }));

    if (data.length === 0) {
        throw new Error("Masukkan minimal satu proses.");
    }

    for (const p of data) {
        if (
            !Number.isFinite(p.arrivalTime) ||
            p.arrivalTime < 0 ||
            !Number.isFinite(p.burstTime) ||
            p.burstTime <= 0
        ) {
            throw new Error("AT harus >= 0 dan BT harus lebih dari 0.");
        }
    }

    // Jalankan proses sampai semuanya selesai
    while (completed < data.length) {

        // Cari proses yang sudah tiba
        const readyQueue = data.filter(p =>
            !p.isCompleted &&
            p.arrivalTime <= currentTime
        );

        // Jika belum ada proses yang tiba, CPU menganggur
        if (readyQueue.length === 0) {
            const nextArrival = Math.min(
                ...data
                    .filter(p => !p.isCompleted)
                    .map(p => p.arrivalTime)
            );

            gantt.push({
                id: "IDLE",
                start: currentTime,
                end: nextArrival
            });

            currentTime = nextArrival;
            continue;
        }

        // Hitung Waiting Time dan Response Ratio
        const candidates = readyQueue.map(p => {
            const waitingTime = currentTime - p.arrivalTime;

            const responseRatio =
                (waitingTime + p.burstTime) / p.burstTime;

            return {
                ...p,
                waitingTime,
                responseRatio
            };
        });

        // Pilih RR tertinggi
        candidates.sort((a, b) => {
            if (Math.abs(a.responseRatio - b.responseRatio) > 1e-9) {
                return b.responseRatio - a.responseRatio;
            }

            // Jika RR sama, pilih AT lebih awal
            if (a.arrivalTime !== b.arrivalTime) {
                return a.arrivalTime - b.arrivalTime;
            }

            return a.index - b.index;
        });

        const selected = candidates[0];

        // Simpan langkah perhitungan RR
        logs.push({
            time: currentTime,
            candidates: candidates.map(p => ({
                id: p.id,
                waitingTime: p.waitingTime,
                burstTime: p.burstTime,
                responseRatio: p.responseRatio
            })),
            selected: selected.id
        });

        // HRN bersifat non-preemptive:
        // proses berjalan sampai selesai
        const startTime = currentTime;
        const completionTime = startTime + selected.burstTime;

        const turnaroundTime =
            completionTime - selected.arrivalTime;

        const waitingTime =
            turnaroundTime - selected.burstTime;

        const responseTime =
            startTime - selected.arrivalTime;

        // Simpan hasil proses
        results.push({
            id: selected.id,
            arrivalTime: selected.arrivalTime,
            burstTime: selected.burstTime,
            startTime,
            completionTime,
            turnaroundTime,
            waitingTime,
            responseTime
        });

        // Simpan blok Gantt Chart
        gantt.push({
            id: selected.id,
            start: startTime,
            end: completionTime
        });

        selected.isCompleted = true;
        currentTime = completionTime;
        completed++;
    }

    // Menghitung total
    const totalWT = results.reduce(
        (sum, p) => sum + p.waitingTime, 0
    );

    const totalTAT = results.reduce(
        (sum, p) => sum + p.turnaroundTime, 0
    );

    const totalRT = results.reduce(
        (sum, p) => sum + p.responseTime, 0
    );

    const totalAT = data.reduce(
        (sum, p) => sum + p.arrivalTime, 0
    );

    const totalBT = data.reduce(
        (sum, p) => sum + p.burstTime, 0
    );

    const totalST = results.reduce(
        (sum, p) => sum + p.startTime, 0
    );

    const totalCT = results.reduce(
        (sum, p) => sum + p.completionTime, 0
    );

    const totalTime = currentTime;

    // Rata-rata
    const averages = {
        averageAT: totalAT / results.length,
        averageBT: totalBT / results.length,
        averageST: totalST / results.length,
        averageCT: totalCT / results.length,
        averageWT: totalWT / results.length,
        averageTAT: totalTAT / results.length,
        averageRT: totalRT / results.length,

        throughput: results.length / totalTime,

        cpuUtilization: (totalBT / totalTime) * 100
    };

    return {
        gantt,
        results,
        logs,
        averages,
        totalTime
    };
}

function renderHRN(output) {
    const ganttChart = document.getElementById("ganttChart");
    const resultsContainer = document.getElementById("results");
    const averagesContainer = document.getElementById("averages");
    const logsContainer = document.getElementById("hrnLogs");

    const { gantt, results, logs, averages, totalTime } = output;

    // Format angka
    const fmt = value =>
        Number(value).toFixed(2).replace(/\.00$/, "");

    const safe = value =>
        String(value).replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);

    // 1. GANTT CHART
    const colors = [
        "#2563eb", "#0d9488", "#7c3aed",
        "#d97706", "#db2777", "#0891b2"
    ];

    const pixelsPerUnit = 64;

    ganttChart.innerHTML = `
        <div class="hrn-gantt-scroll">
            <div class="hrn-gantt-track">
                ${gantt.map((item, index) => {
                    const duration = item.end - item.start;
                    const color = item.id === "IDLE"
                        ? "#64748b"
                        : colors[index % colors.length];

                    return `
                        <div class="hrn-gantt-block"
                             style="
                                width: ${duration * pixelsPerUnit}px;
                                background-color: ${color};
                             ">
                            <strong>${safe(item.id)}</strong>
                            <span>${fmt(item.start)} - ${fmt(item.end)}</span>
                        </div>
                    `;
                }).join("")}
            </div>
        </div>
        <p class="hrn-caption">
            Gantt Chart HRN Non-Preemptive
        </p>
    `;

    // 2. TABEL HASIL PERHITUNGAN
    resultsContainer.innerHTML = `
        <div class="hrn-table-scroll">
            <table class="hrn-table">
                <thead>
                    <tr>
                        <th>Proses</th>
                        <th>AT</th>
                        <th>BT</th>
                        <th>ST</th>
                        <th>CT</th>
                        <th>TAT</th>
                        <th>WT</th>
                        <th>RT</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map(p => `
                        <tr>
                            <td>${safe(p.id)}</td>
                            <td>${fmt(p.arrivalTime)}</td>
                            <td>${fmt(p.burstTime)}</td>
                            <td>${fmt(p.startTime)}</td>
                            <td>${fmt(p.completionTime)}</td>
                            <td>${fmt(p.turnaroundTime)}</td>
                            <td>${fmt(p.waitingTime)}</td>
                            <td>${fmt(p.responseTime)}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;

    // 3. RATA-RATA DAN PERFORMA
    const metrics = [
        ["Rata-rata AT", averages.averageAT],
        ["Rata-rata BT", averages.averageBT],
        ["Rata-rata ST", averages.averageST],
        ["Rata-rata CT", averages.averageCT],
        ["Rata-rata TAT", averages.averageTAT],
        ["Rata-rata WT", averages.averageWT],
        ["Rata-rata RT", averages.averageRT],
        ["Total waktu", totalTime],
        ["Throughput", averages.throughput.toFixed(3)],
        ["CPU Utilization", averages.cpuUtilization.toFixed(2) + "%"]
    ];

    averagesContainer.innerHTML = `
        <div class="hrn-average-grid">
            ${metrics.map(([label, value]) => `
                <div class="hrn-metric">
                    <span>${safe(label)}</span>
                    <strong>${safe(value)}</strong>
                </div>
            `).join("")}
        </div>
    `;

    // 4. LANGKAH PERHITUNGAN RESPONSE RATIO
    logsContainer.innerHTML = `
        <h3>Langkah Perhitungan Response Ratio</h3>

        ${logs.map((log, index) => `
            <div class="hrn-log-card">
                <h4>Langkah ${index + 1} - Waktu ${fmt(log.time)}</h4>

                <div class="hrn-table-scroll">
                    <table class="hrn-table">
                        <thead>
                            <tr>
                                <th>Proses</th>
                                <th>Waiting Time</th>
                                <th>Burst Time</th>
                                <th>Response Ratio</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${log.candidates.map(p => `
                                <tr>
                                    <td>${safe(p.id)}</td>
                                    <td>${fmt(p.waitingTime)}</td>
                                    <td>${fmt(p.burstTime)}</td>
                                    <td>${fmt(p.responseRatio)}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>

                <p>
                    Proses terpilih:
                    <strong>${safe(log.selected)}</strong>
                </p>
            </div>
        `).join("")}
    `;
}
