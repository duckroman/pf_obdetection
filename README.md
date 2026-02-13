# 🚀 NeuralVision V.1.0

Este repositorio contiene el código fuente de **NeuralVision**, un sistema de visión por computadora avanzado desarrollado para demostrar capacidades de **Data Science aplicada en entornos de producción Web**.

El objetivo del proyecto es evidenciar cómo los modelos complejos de Deep Learning pueden integrarse en interfaces modernas, accesibles y rentables, eliminando la dependencia de infraestructura de nube costosa mediante **Edge AI**.

## 🏗 Arquitectura y Tecnologías Seleccionadas

La arquitectura fue diseñada para priorizar el rendimiento en tiempo real y la privacidad del usuario, ejecutando toda la inferencia directamente en el navegador del cliente.

### Core Stack
*   **React 18 + Vite**: Para una gestión de estado reactiva y eficiente.
*   **TensorFlow.js (WebGL backend)**: Permitir aceleración por hardware (GPU) directamente en el cliente.
*   **Tailwind CSS**: Implementación rápida de estilos modernos y adaptables.
*   **Framer Motion**: Micro-interacciones fluidas para mejorar la experiencia de usuario.

### Modelos Implementados
1.  **COCO-SSD (Single Shot MultiBox Detector)**:
    *   Utilizado para la detección general de objectos en tiempo real.
    *   Optimizado para balancear precisión y FPS en dispositivos de consumo.
    
2.  **MobileNet + K-Nearest Neighbors (Transfer Learning)**:
    *   Implementado en el módulo "Custom Training".
    *   Permite al usuario *entrenar* sus propias clases en segundos re-utilizando una red pre-entrenada para extracción de one-shot features.

## 📦 Instalación y Despliegue Local

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/tu-usuario/neural-vision.git
    cd neural-vision
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    # o si usas yarn
    yarn install
    ```

3.  **Iniciar servidor de desarrollo:**
    ```bash
    npm run dev
    ```

4.  **Compilar para producción:**
    ```bash
    npm run build
    ```

## 🛠 Características Clave

*   **Detección en Tiempo Real:** Visualización instantánea de bounding boxes y confidence scores.
*   **Dashboard de Métricas:** Gráficos de confianza en vivo para monitorear la certeza del modelo.
*   **Agnóstico a la Fuente:** Soporte transparente para Webcam en vivo o subida de video/imágenes.
*   **Entrenamiento Personalizado (Edge Training):** Capacidad de definir y entrenar nuevas clases de objetos sin tocar código ni reiniciar servidores.
*   **Privacy-First:** Ninguna imagen sale del dispositivo del usuario.

---
*Este proyecto es parte del portafolio profesional de Data Science & AI Engineering.*
