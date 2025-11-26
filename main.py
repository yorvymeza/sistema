import tkinter as tk
import random

# Configuración inicial
nombres_entradas = {
    0: "Seccionador (NO)",
    1: "Termométrica (NC)",
    2: "Fusible (NO)",
    3: "ATPA (NO)",
    4: "Prot Termométrica (NO)"
}

salidas = {i: False for i in range(1, 6)}
estado_entradas_prev = [False] * 5

# Simula la lectura de entradas
def leer_entrada(numero):
    return random.choice([0, 1]) if numero != 1 else random.choice([0, 1])

def estado_entrada(numero, valor):
    return valor == 0 if numero == 1 else valor == 1

class ControlApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Control de Entradas y Salidas con GUI")
        self.modo_manual = False

        # Frame principal
        self.frame = tk.Frame(root, padx=10, pady=10)
        self.frame.pack()

        # Etiquetas de entradas
        self.labels_entradas = []
        tk.Label(self.frame, text="ENTRADAS", font=("Arial", 14, "bold")).pack()
        for i in range(5):
            label = tk.Label(self.frame, text=f"Entrada {i}: ---", font=("Arial", 12), width=40)
            label.pack(pady=2)
            self.labels_entradas.append(label)

        # Etiquetas y botones de salidas
        tk.Label(self.frame, text="SALIDAS", font=("Arial", 14, "bold")).pack(pady=(10, 0))
        self.labels_salidas = []
        self.botones_salidas = []
        for i in range(1, 6):
            frame_salida = tk.Frame(self.frame)
            frame_salida.pack(pady=2)
            label = tk.Label(frame_salida, text=f"Salida {i}: ---", font=("Arial", 12), width=25)
            label.pack(side=tk.LEFT)
            btn = tk.Button(frame_salida, text="ON/OFF", command=lambda i=i: self.toggle_salida(i), state=tk.DISABLED)
            btn.pack(side=tk.LEFT, padx=5)
            self.labels_salidas.append(label)
            self.botones_salidas.append(btn)

        # Modo de operación
        self.btn_modo = tk.Button(self.frame, text="Modo: Automático", command=self.toggle_modo, bg="lightblue")
        self.btn_modo.pack(pady=10)

        # Alerta
        self.alerta = tk.Label(self.frame, text="", font=("Arial", 12, "bold"), fg="red")
        self.alerta.pack()

        self.actualizar_estado()

    def toggle_modo(self):
        self.modo_manual = not self.modo_manual
        if self.modo_manual:
            self.btn_modo.config(text="Modo: Manual", bg="orange")
            for btn in self.botones_salidas:
                btn.config(state=tk.NORMAL)
        else:
            self.btn_modo.config(text="Modo: Automático", bg="lightblue")
            for btn in self.botones_salidas:
                btn.config(state=tk.DISABLED)

    def toggle_salida(self, numero):
        salidas[numero] = not salidas[numero]
        self.actualizar_salidas_labels()

    def actualizar_salidas_auto(self, entradas_act):
        global estado_entradas_prev
        for i in range(5):
            salida_num = i + 1
            if entradas_act[i] != estado_entradas_prev[i]:
                salidas[salida_num] = entradas_act[i]
        estado_entradas_prev = entradas_act.copy()

    def actualizar_salidas_labels(self):
        for i in range(1, 6):
            estado = "ON" if salidas[i] else "OFF"
            color = "green" if salidas[i] else "red"
            self.labels_salidas[i-1].config(text=f"Salida {i}: {estado}", fg=color)

    def actualizar_estado(self):
        entradas_activas = []
        alerta_activa = False

        for i in range(5):
            val = leer_entrada(i)
            activo = estado_entrada(i, val)
            entradas_activas.append(activo)
            texto = f"Entrada {i} ({nombres_entradas[i]}): {'ACTIVA' if activo else 'INACTIVA'}"
            color = "green" if activo else "red"
            self.labels_entradas[i].config(text=texto, fg=color)
            if activo:
                alerta_activa = True

        if alerta_activa:
            self.alerta.config(text="⚠ ¡Una o más entradas activadas!", fg="red")
        else:
            self.alerta.config(text="")

        if not self.modo_manual:
            self.actualizar_salidas_auto(entradas_activas)

        self.actualizar_salidas_labels()
        self.root.after(6000, self.actualizar_estado)

if __name__ == "_main_":
    root = tk.Tk()
    app = ControlApp(root)
    root.mainloop()