$(document).ready(function() {
    
    // --- Configuración Global ---
    const STORAGE_MOVIMIENTOS_KEY = 'trading_movimientos';
    const STORAGE_CONTADORES_KEY = 'trading_contadores';
    const VALOR_CAPITAL_INICIAL = 118.93; 
    
    // ==========================================================
    // 1. FUNCIONES DE ALMACENAMIENTO LOCAL
    // ==========================================================
    
    // Carga los movimientos guardados o los inicializa
    function getMovimientos() {
        const movimientosStr = localStorage.getItem(STORAGE_MOVIMIENTOS_KEY);
        if (!movimientosStr) {
            // Inicializar con el capital base (si no hay nada guardado)
            const inicial = [{
                fecha: new Date().toLocaleDateString('es-ES'),
                tipo: "Inversion Inicial", // Cambié a "Inversion Inicial" para diferenciar
                valor: VALOR_CAPITAL_INICIAL
            }];
            saveMovimientos(inicial);
            return inicial;
        }
        return JSON.parse(movimientosStr);
    }

    // Guarda los movimientos en LocalStorage
    function saveMovimientos(movimientos) {
        localStorage.setItem(STORAGE_MOVIMIENTOS_KEY, JSON.stringify(movimientos));
    }
    
    // Carga los contadores guardados o los inicializa (Lógica: Solo cuenta operaciones)
    function getContadores() {
        const contadoresStr = localStorage.getItem(STORAGE_CONTADORES_KEY);
        // Estructura: Solo cuenta operaciones (no valores monetarios)
        return contadoresStr ? JSON.parse(contadoresStr) : { 
            operaciones_ganadas: 0, 
            operaciones_perdidas: 0
        };
    }
    
    // Guarda los contadores en LocalStorage
    function saveContadores(contadores) {
        localStorage.setItem(STORAGE_CONTADORES_KEY, JSON.stringify(contadores));
    }

    // ==========================================================
    // 2. LÓGICA DEL CAPITAL, CÁLCULO Y RENDERIZADO
    // ==========================================================

    function calcularYRenderizarCapital() {
        const movimientos = getMovimientos();
        let capitalActual = 0;
        
        // Calcular el capital actual a partir del historial (Inversion, Retirada, Ganancia, Pérdida)
        movimientos.forEach(mov => {
            if (mov.tipo === 'Retirada' || mov.tipo === 'Pérdida') {
                capitalActual -= mov.valor;
            } else {
                // Incluye 'Inversion', 'Inversion Inicial', 'Ganancia'
                capitalActual += mov.valor;
            }
        });

        // 1. Actualiza el campo VERDE de Capital Total
        $('#capital-total-display').text(capitalActual.toFixed(2) + '$');
        $('#capital-total').val(capitalActual.toFixed(2)); // Actualiza el input oculto para AJAX
        
        // 2. Renderiza la tabla de Historial de Movimientos
        const $tbody = $('#tabla-movimientos tbody');
        $tbody.empty(); 

        // Mostrar del más reciente al más antiguo
        [...movimientos].reverse().forEach(mov => { 
            const valorDisplay = mov.valor.toFixed(2) + '$';
            let claseFila = 'inversion'; // Clase por defecto
            if (mov.tipo === 'Retirada' || mov.tipo === 'Pérdida') {
                claseFila = 'retirada';
            } else if (mov.tipo === 'Ganancia') {
                 claseFila = 'ganancia-op'; 
            }

            const newRow = `<tr class="${claseFila}">
                <td>${mov.fecha}</td>
                <td>${mov.tipo}</td>
                <td>${valorDisplay}</td>
            </tr>`;
            $tbody.append(newRow);
        });
        
        // 3. Llama a la calculadora principal para actualizar Meta y Valor Operación (FASE 01/02)
        actualizarCalculadora();
        
        // Dibuja la gráfica con el historial actualizado
        renderizarGrafica();
        
        // 🚨 NUEVA LÍNEA: Renderiza el resumen P&L
        renderizarResumenPNL();
    }
    
    // ==========================================================
    // 3. FUNCIÓN DE REGISTRO DE MOVIMIENTOS Y CONTROL FASE 03
    // ==========================================================
    
    function registrarMovimiento(tipo) {
        const fecha = $('#input-fecha').val();
        const valorStr = $('#input-valor').val();
        const valor = parseFloat(valorStr);
        
        if (!fecha || isNaN(valor) || valor <= 0) {
            alert("Por favor, introduce una fecha y un valor positivo válidos.");
            return;
        }
        
        const movimientos = getMovimientos();
        
        // 1. Añadir el nuevo movimiento al historial
        movimientos.push({
            fecha: new Date(fecha).toLocaleDateString('es-ES'),
            tipo: tipo,
            valor: valor
        });
        
        saveMovimientos(movimientos); 
        
        $('#input-valor').val(''); 
        
        // LÓGICA DE REINICIO DE CONTADORES:
        if (tipo === 'Retirada') {
            alert("¡Movimiento registrado! Los contadores de operaciones de la FASE 03 se han reiniciado.");
            resetContadores(); 
        }

        // 2. Vuelve a calcular el Capital Total y renderizar todo
        calcularYRenderizarCapital();
    }

    // Registra la ganancia/pérdida MONETARIA de una operación.
    function registrarGananciaOPerdida(tipo, valorMovimiento) {
        const movimientos = getMovimientos();
        const fechaActual = new Date().toLocaleDateString('es-ES');
        
        // 1. Añadir el nuevo movimiento al historial
        movimientos.push({
            fecha: fechaActual,
            // Si el tipo es 'ganada', registra como 'Ganancia'. Si es 'perdida', registra como 'Pérdida'.
            tipo: (tipo === 'ganada' ? 'Ganancia' : 'Pérdida'), 
            valor: valorMovimiento
        });
        
        saveMovimientos(movimientos); 
        
        // 2. Vuelve a calcular el Capital Total y renderizar todo (esto actualiza la gráfica)
        calcularYRenderizarCapital();
    }
    
    // ==========================================================
    // 4. FUNCIONES DE CÁLCULO FASE 01/02 (AJAX a Flask)
    // ==========================================================
    
    function actualizarCalculadora() {
        const capital = $('#capital-total').val(); 
        const porcentajeDiario = $('#porcentaje-diario').val();
        const numOperaciones = $('#cantidad-operaciones').val();
        const porcentajeLucro = $('#porcentaje-lucro').val();
        
        if (!capital || !porcentajeDiario || !numOperaciones || !porcentajeLucro) {
            return; 
        }

        $.ajax({
            url: '/calcular',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                'capital': capital,
                'porcentaje_diario': porcentajeDiario,
                'num_operaciones': numOperaciones,
                'porcentaje_lucro': porcentajeLucro
            }),
            success: function(response) {
                // Actualiza los campos VERDES de Meta y Valor Operación
                $('#meta-diaria').text(response.meta_diaria);
                $('#valor-operacion').text(response.valor_de_cada_operacion);
                
                // Actualiza la cantidad faltante (FASE 03)
                actualizarFaltante();
            },
            error: function(error) {
                console.error("Error al calcular:", error);
            }
        });
    }

    // ==========================================================
    // 5. FUNCIONES DE CONTEO Y ACTUALIZACIÓN FASE 03 (META DE VICTORIAS)
    // ==========================================================
    
    // Inicializa la pantalla con los valores guardados
    function initContadores() {
        const contadores = getContadores();
        $('#cantidad-ganada').text(contadores.operaciones_ganadas);
        $('#cantidad-perdida').text(contadores.operaciones_perdidas);
        actualizarFaltante();
    }
    
    function resetContadores() {
        const contadores = { 
            operaciones_ganadas: 0, 
            operaciones_perdidas: 0
        };
        saveContadores(contadores); 
        
        $('#cantidad-ganada').text(0);
        $('#cantidad-perdida').text(0);
        
        actualizarFaltante(); 
    }

    function actualizarContadores(tipo) {
        let contadores = getContadores();
        const totalOperacionesMeta = parseInt($('#cantidad-operaciones').val()) || 0;

        // Obtener valores necesarios para el cálculo de dinero
        const valorOperacionStr = $('#valor-operacion').text().replace('$', '');
        const valorOperacionBase = parseFloat(valorOperacionStr) || 0;
        const porcentajeLucro = parseFloat($('#porcentaje-lucro').val()) / 100 || 0;

        if (totalOperacionesMeta === 0 || valorOperacionBase === 0) {
            alert("Define la Meta de Operaciones y el Valor de cada Operación en FASE 02.");
            return;
        }

        // Verificación de META basada solo en GANADAS
        if (tipo === 'ganada' && contadores.operaciones_ganadas >= totalOperacionesMeta) {
            alert("¡Ya has alcanzado la meta de operaciones ganadas diaria!");
            return;
        }

        let valorMonetario = 0;
        
        // 1. Aumentar el contador correcto Y registrar el movimiento monetario
        if (tipo === 'ganada') {
            contadores.operaciones_ganadas += 1; 
            // Calcular la ganancia real (base * porcentaje de lucro)
            valorMonetario = valorOperacionBase * (porcentajeLucro);
            registrarGananciaOPerdida('ganada', valorMonetario);

        } else if (tipo === 'perdida') {
            contadores.operaciones_perdidas += 1;
            // Pérdida es la operación base (es un valor negativo para el capital)
            valorMonetario = valorOperacionBase;
            registrarGananciaOPerdida('perdida', valorMonetario); 

        }
        
        saveContadores(contadores); 
        
        // 2. Actualizar la pantalla (FASE 03)
        $('#cantidad-ganada').text(contadores.operaciones_ganadas);
        $('#cantidad-perdida').text(contadores.operaciones_perdidas);

        // 3. Recalcular la Cantidad faltante
        actualizarFaltante();
    }
    
    function actualizarFaltante() {
        const contadores = getContadores();
        const totalOperacionesMeta = parseInt($('#cantidad-operaciones').val()) || 0;

        // CÁLCULO CLAVE: Faltantes = Meta - Ganadas (solo victorias)
        const operacionesGanadas = contadores.operaciones_ganadas;
        let faltantes = totalOperacionesMeta - operacionesGanadas;
        
        if (faltantes < 0) faltantes = 0;
        
        $('#cantidad-faltante').text(faltantes);
        
        // Deshabilitar botones solo si la meta de GANADAS se alcanzó
        if (faltantes === 0 && totalOperacionesMeta > 0) {
             $('#btn-ganada, #btn-perdida').prop('disabled', true).css('cursor', 'not-allowed');
        } else {
             $('#btn-ganada, #btn-perdida').prop('disabled', false).css('cursor', 'pointer');
        }
    }
    
    // ==========================================================
    // 6. FUNCIONES DE EXPORTACIÓN Y REINICIO TOTAL
    // ==========================================================
    
    function descargarHistorialCSV() {
        const tabla = document.getElementById('tabla-movimientos');
        let csv = [];
        
        // Obtener cabecera y datos
        const cabeceras = Array.from(tabla.querySelectorAll('thead th')).map(th => th.innerText);
        csv.push(cabeceras.join(',')); 
        
        const filas = tabla.querySelectorAll('tbody tr');
        filas.forEach(fila => {
            const rowData = Array.from(fila.querySelectorAll('td')).map(td => {
                let text = td.innerText.replace('$', '').trim();
                if (text.includes(',')) {
                    text = `"${text}"`;
                }
                return text;
            });
            csv.push(rowData.join(',')); 
        });
        
        // Crear y forzar la descarga del archivo
        const csvContent = csv.join('\n');
        const a = document.createElement('a');
        a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
        a.target = '_blank';
        a.download = 'Historial_Trading_' + new Date().toISOString().slice(0, 10) + '.csv';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Preguntar si desea borrar (usamos confirm, ya que no estamos en iframes para este tipo de app)
        const confirmarBorrado = confirm(
            "¡Descarga completa! ¿Deseas borrar el historial de la tabla y reiniciar el Capital Total para empezar un nuevo ciclo?"
        );

        if (confirmarBorrado) {
            resetearHistorialCompleto(); 
        } else {
            alert("El historial se ha conservado. ¡No se ha borrado nada!");
        }
    }
    
    function resetearHistorialCompleto() {
        // 1. Borrar el historial de movimientos del LocalStorage
        localStorage.removeItem(STORAGE_MOVIMIENTOS_KEY); 
        resetContadores(); 

        // 2. Recargar la página para forzar la inicialización
        window.location.reload(); 
    }

    // ==========================================================
    // 7. FUNCIÓN DE GRÁFICA DE EVOLUCIÓN DE CAPITAL (FASE 04)
    // ==========================================================

    function renderizarGrafica() {
        const movimientos = getMovimientos();
        const etiquetas = [];
        const datosCapital = [];
        let capitalAcumulado = 0;
        
        // Si no hay suficientes movimientos (solo el inicial), no dibujamos
        if (movimientos.length <= 1) { 
            if (window.capitalChartInstance) {
                window.capitalChartInstance.destroy();
            }
            return; 
        }

        // 1. Procesar el historial para obtener la evolución del capital
        movimientos.forEach((mov) => {
            // Lógica de acumulación basada en el tipo de movimiento
            if (mov.tipo === 'Retirada' || mov.tipo === 'Pérdida') {
                capitalAcumulado -= mov.valor;
            } else {
                capitalAcumulado += mov.valor;
            }
            
            // Usamos la fecha y el tipo de movimiento como etiqueta
            etiquetas.push(`${mov.fecha} (${mov.tipo.charAt(0)})`);
            // Guardamos el capital en ese punto del tiempo
            datosCapital.push(capitalAcumulado.toFixed(2));
        });

        // 2. Dibujar la gráfica usando Chart.js
        const ctx = document.getElementById('capitalChart');
        if (!ctx) return; // Asegura que el canvas exista en el HTML

        // Destruye la instancia anterior de la gráfica si existe (IMPRESCINDIBLE)
        if (window.capitalChartInstance) {
            window.capitalChartInstance.destroy();
        }

        window.capitalChartInstance = new Chart(ctx.getContext('2d'), {
            type: 'line', 
            data: {
                labels: etiquetas, 
                datasets: [{
                    label: 'Capital Total Acumulado ($)',
                    data: datosCapital,
                    borderColor: '#28a745', 
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    fill: true,
                    tension: 0.2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Capital ($)'
                        }
                    }
                }
            }
        });
    }

    // ==========================================================
    // 8. FUNCIÓN DE RESUMEN P&L MONETARIO (FASE 05) - NUEVO
    // ==========================================================

    function renderizarResumenPNL() {
        const movimientos = getMovimientos();
        let gananciaTotal = 0;
        let perdidaTotal = 0;
        
        // Recorrer los movimientos para sumar Ganancias y Pérdidas de OPERACIONES
        movimientos.forEach(mov => {
            if (mov.tipo === 'Ganancia') {
                // Suma de todas las operaciones Ganadoras
                gananciaTotal += mov.valor;
            } else if (mov.tipo === 'Pérdida') {
                // Suma de todas las operaciones Perdedoras 
                perdidaTotal += mov.valor; 
            }
        });
        
        // Actualizar los campos en la FASE 05
        $('#ganancia-total-op').text(gananciaTotal.toFixed(2) + '$');
        $('#perdida-total-op').text(perdidaTotal.toFixed(2) + '$');
    }


    // ==========================================================
    // 9. EVENT LISTENERS & INICIALIZACIÓN
    // ==========================================================
    
    // Eventos para registrar Inversión/Retirada
    $('#btn-registrar-inversion').on('click', function() {
        registrarMovimiento('Inversion');
    });

    $('#btn-registrar-retirada').on('click', function() {
        registrarMovimiento('Retirada');
    });

    // Eventos para FASE 03 (Contador)
    $('#btn-ganada').on('click', function() {
        actualizarContadores('ganada'); 
    });

    $('#btn-perdida').on('click', function() {
        actualizarContadores('perdida');
    });
    
    // Evento: Al cambiar cualquier campo AZUL (FASE 01 y 02), recalcular todo.
    $('.editable-azul').on('input', actualizarCalculadora);
    
    // Evento: Conectar el botón de descarga
    $('#btn-descargar-excel').on('click', descargarHistorialCSV);
    
    // Inicialización al cargar la página:
    calcularYRenderizarCapital(); // Carga todo: capital, historial, AJAX, gráfica y P&L
    initContadores(); // Carga los contadores de FASE 03
});
