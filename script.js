// ==========================================
// CPU SCHEDULING SIMULATOR
// FCFS, SJF, SRTF, ROUND ROBIN, dan HRN
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
const hrnLogs = document.getElementById("hrnLogs");

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
// 8. ALGORITMA HRN (NON-PREEMPTIVE)
//    Response Ratio = (Waiting Time + Burst Time) / Burst Time
//    Proses dengan RR tertinggi dijalankan lebih dulu.
// ==========================================

function runHRN(processes, logs) {
    const chart = [];
    let time = 0;
    let completed = 0;

    while (completed < processes.length) {

        // Proses yang sudah tiba dan belum selesai
        const ready = processes.filter(
            p => p.at <= time && p.remaining > 0
        );

        // Jika belum ada yang tiba, CPU Idle
        if (ready.length === 0) {
            const nextArrival = Math.min(
                ...processes
                    .filter(p => p.remaining > 0)
                    .map(p => p.at)
            );

            addSegment(chart, "Idle", time, nextArrival);
            time = nextArrival;
            continue;
        }

        // Hitung Response Ratio tiap kandidat
        const candidates = ready.map(p => {
            const waiting = time - p.at;
            const ratio = (waiting + p.bt) / p.bt;

            return { p, waiting, ratio };
        });

        // Pilih RR tertinggi; jika sama, AT lebih awal, lalu urutan input
        candidates.sort((a, b) => {
            if (Math.abs(a.ratio - b.ratio) > 1e-9) {
                return b.ratio - a.ratio;
            }

            return a.p.at - b.p.at || a.p.order - b.p.order;
        });

        const selected = candidates[0].p;

        // Simpan langkah perhitungan untuk ditampilkan
        logs.push({
            time: time,
            selected: selected.id,
            candidates: candidates.map(c => ({
                id: c.p.id,
                waiting: c.waiting,
                bt: c.p.bt,
                ratio: c.ratio
            }))
        });

        // Non-preemptive: jalan sampai selesai
        selected.firstStart = time;

        const start = time;
        time += selected.bt;

        addSegment(chart, selected.id, start, time);

        selected.remaining = 0;
        selected.ct = time;
        completed++;
    }

    return chart;
}

// ==========================================
// 9. MENGHITUNG CT, TAT, WT, DAN RT
// ==========================================

function calculateMetrics(processes) {
    for (const p of processes) {
        p.tat = p.ct - p.at;
        p.wt = p.tat - p.bt;
        p.rt = p.firstStart - p.at;
    }
}

// ==========================================
// 10. MENAMPILKAN GANTT CHART
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

// ==========================================
// 11. MENAMPILKAN TABEL HASIL
// ==========================================

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
// 12. MENAMPILKAN RATA-RATA
// ==========================================

function displayAverages(processes) {
    const totalTAT = processes.reduce((sum, p) => sum + p.tat, 0);
    const totalWT = processes.reduce((sum, p) => sum + p.wt, 0);
    const totalRT = processes.reduce((sum, p) => sum + p.rt, 0);

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
// 13. MENAMPILKAN LOG PERHITUNGAN HRN
// ==========================================

function displayHRNLogs(logs) {
    if (!logs || logs.length === 0) {
        hrnLogs.innerHTML = "";
        return;
    }

    let html = "<h3>Langkah Perhitungan HRN</h3>";

    logs.forEach((log, i) => {
        html += `
            <div class="hrn-log-card">
                <h4>Langkah ${i + 1} (waktu = ${log.time})</h4>
                <div class="hrn-table-scroll">
                    <table class="hrn-table">
                        <thead>
                            <tr>
                                <th>Proses</th>
                                <th>WT</th>
                                <th>BT</th>
                                <th>RR = (WT + BT) / BT</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        for (const c of log.candidates) {
            html += `
                <tr>
                    <td>${c.id}</td>
                    <td>${c.waiting}</td>
                    <td>${c.bt}</td>
                    <td>${c.ratio.toFixed(2)}</td>
                </tr>
            `;
        }

        html += `
                        </tbody>
                    </table>
                </div>
                <p>Dipilih: <strong>${log.selected}</strong> (RR tertinggi)</p>
            </div>
        `;
    });

    hrnLogs.innerHTML = html;
}

// ==========================================
// 14. MENJALANKAN PERHITUNGAN
// ==========================================

function calculateScheduling() {
    try {
        message.textContent = "";
        hrnLogs.innerHTML = "";

        const processes = getProcesses();
        const selected = algorithm.value;

        let chart = [];

        if (selected === "fcfs") {
            chart = runFCFS(processes);
        } else if (selected === "sjf") {
            chart = runSJF(processes);
        } else if (selected === "srtf") {
            chart = runSRTF(processes);
        } else if (selected === "hrn") {
            const logs = [];
            chart = runHRN(processes, logs);
            displayHRNLogs(logs);
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
// 15. EVENT LISTENER
// ==========================================

generateBtn.addEventListener("click", generateInputs);

calculateBtn.addEventListener("click", calculateScheduling);

algorithm.addEventListener("change", () => {
    quantumGroup.hidden = algorithm.value !== "rr";
});

// Input awal otomatis ditampilkan
generateInputs();
