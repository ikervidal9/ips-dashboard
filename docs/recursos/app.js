const API_URL = "http://172.20.10.4:5000";

let graficaPaquetes;
let graficaBloqueadas;
let graficaSeguridad;

let historialPaquetes = [];
let etiquetasTiempo = [];

function crearGraficas() {
    Chart.defaults.color = "#94a3b8";
    Chart.defaults.borderColor = "#263244";

    graficaPaquetes = new Chart(
        document.getElementById("grafica-paquetes"),
        {
            type: "line",
            data: {
                labels: [],
                datasets: [{
                    label: "Paquetes",
                    data: [],
                    borderColor: "#38bdf8",
                    backgroundColor: "rgba(56, 189, 248, 0.14)",
                    fill: true,
                    tension: 0.35,
                    pointRadius: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        }
    );

    graficaBloqueadas = new Chart(
        document.getElementById("grafica-bloqueadas"),
        {
            type: "bar",
            data: {
                labels: ["Bloqueadas"],
                datasets: [{
                    label: "IPs",
                    data: [0],
                    backgroundColor: "#ef4444",
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        }
    );

    graficaSeguridad = new Chart(
        document.getElementById("grafica-seguridad"),
        {
            type: "doughnut",
            data: {
                labels: ["Seguro", "Alerta", "Ataque"],
                datasets: [{
                    data: [1, 0, 0],
                    backgroundColor: ["#22c55e", "#facc15", "#ef4444"],
                    borderColor: "#111827",
                    borderWidth: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "68%",
                plugins: {
                    legend: {
                        position: "bottom"
                    }
                }
            }
        }
    );
}

function setEstado(nombreEstado) {
    const estado = document.getElementById("estado-sistema");

    estado.textContent = nombreEstado;
    estado.classList.remove("status-alerta", "status-ataque");

    if (nombreEstado === "Alerta") {
        estado.classList.add("status-alerta");
    }

    if (nombreEstado === "Ataque") {
        estado.classList.add("status-ataque");
    }
}

function actualizarDashboard() {
    fetch(`${API_URL}/eventos`)
        .then(response => response.json())
        .then(data => {
            let totalPaquetes = 0;
            let ips = new Set();
            let ultimaAlerta = "Sin alertas";

            const tabla = document.getElementById("tabla-ips");
            tabla.innerHTML = "";

            data.forEach(evento => {
                totalPaquetes += evento.packets;
                ips.add(evento.ip);
                ultimaAlerta = evento.time || "Sin hora";

                tabla.innerHTML += `
                    <tr>
                        <td>${evento.ip}</td>
                        <td>${evento.protocol}</td>
                        <td>${evento.packets}</td>
                        <td>${evento.time}</td>
                        <td>
                            <button onclick="desbloquear('${evento.ip}')">
                                Desbloquear
                            </button>
                        </td>
                    </tr>
                `;
            });

            if (data.length === 0) {
                tabla.innerHTML = `
                    <tr>
                        <td class="empty-row" colspan="5">No hay eventos detectados</td>
                    </tr>
                `;
            }

            const ahora = new Date().toLocaleTimeString();

            document.getElementById("kpi-paquetes").textContent = totalPaquetes;
            document.getElementById("kpi-ips").textContent = ips.size;
            document.getElementById("kpi-ultima").textContent = ultimaAlerta;
            document.getElementById("kpi-actualizacion").textContent = ahora;

            etiquetasTiempo.push(ahora);
            historialPaquetes.push(totalPaquetes);

            if (historialPaquetes.length > 10) {
                historialPaquetes.shift();
                etiquetasTiempo.shift();
            }

            graficaPaquetes.data.labels = etiquetasTiempo;
            graficaPaquetes.data.datasets[0].data = historialPaquetes;
            graficaPaquetes.update();

            graficaBloqueadas.data.datasets[0].data = [ips.size];
            graficaBloqueadas.update();

            let seguro = 1;
            let alerta = 0;
            let ataque = 0;
            let estado = "Seguro";

            if (ips.size === 0) {
                seguro = 1;
            } else if (ips.size < 3) {
                seguro = 0;
                alerta = 1;
                estado = "Alerta";
            } else {
                seguro = 0;
                ataque = 1;
                estado = "Ataque";
            }

            setEstado(estado);

            graficaSeguridad.data.datasets[0].data = [seguro, alerta, ataque];
            graficaSeguridad.update();
        })
        .catch(error => {
            console.error("Error al cargar eventos:", error);
            setEstado("Alerta");
        });
}

function desbloquear(ip) {
    fetch(`${API_URL}/desbloquear`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ ip })
    })
        .then(response => response.json())
        .then(() => actualizarDashboard())
        .catch(error => {
            console.error("Error al desbloquear IP:", error);
        });
}

crearGraficas();
actualizarDashboard();
setInterval(actualizarDashboard, 3000);
