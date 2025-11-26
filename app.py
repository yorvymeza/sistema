from flask import Flask, render_template, request, jsonify
from datetime import datetime # ¡Ya importada correctamente!

app = Flask(__name__)

# Función para realizar los cálculos
def calcular_gestion(capital, porcentaje_diario, num_operaciones, porcentaje_lucro):
    try:
        capital = float(capital)
        porcentaje_diario = float(porcentaje_diario) / 100.0
        num_operaciones = int(num_operaciones)
        porcentaje_lucro = float(porcentaje_lucro) / 100.0
    except ValueError:
        # En caso de error de conversión, devolvemos un valor seguro o error
        return {"capital_total": "Error", "meta_diaria": "Error", "valor_de_cada_operacion": "Error"}

    meta_diaria = capital * porcentaje_diario
    
    if num_operaciones > 0 and porcentaje_lucro > 0:
        valor_de_cada_operacion = meta_diaria / (num_operaciones * porcentaje_lucro)
    else:
        valor_de_cada_operacion = 0
        
    return {
        "capital_total": f"{capital:.2f}$",
        "meta_diaria": f"{meta_diaria:.2f}$",
        "valor_de_cada_operacion": f"{valor_de_cada_operacion:.2f}$"
    }

@app.route('/')
def index():
    # Los datos iniciales son solo para la primera carga, JS se encargará del resto
    datos_iniciales = calcular_gestion(
        capital=118.93,
        porcentaje_diario=5,
        num_operaciones=2,
        porcentaje_lucro=87
    )
    
    # 🚨 CORRECCIÓN CLAVE: Generar la fecha actual y pasarla a la plantilla
    fecha_hoy = datetime.now().strftime('%Y-%m-%d')
    
    return render_template('index.html', 
                           datos=datos_iniciales,
                           fecha_actual=fecha_hoy # <-- ¡Nuevo! Se pasa al HTML
                          )

# Ruta AJAX para calcular los valores dinámicamente
@app.route('/calcular', methods=['POST'])
def calcular():
    data = request.json
    resultado = calcular_gestion(
        capital=data.get('capital', 0), # Usamos .get() para seguridad
        porcentaje_diario=data.get('porcentaje_diario', 0),
        num_operaciones=data.get('num_operaciones', 0),
        porcentaje_lucro=data.get('porcentaje_lucro', 0)
    )
    return jsonify(resultado)

if __name__ == '__main__':
    app.run(debug=True)