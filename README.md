# SnapXR - Spatial Remote Desktop

Turn your phone into a spatial display for your PC.

## 🚀 Getting Started

### 1. Requirements
- Python 3.9+
- Node.js (for building the frontend, already done)

### 2. Install Python Dependencies
```bash
pip install -r desktop_app/requirements.txt
```

### 3. Run the Desktop App
```bash
python desktop_app/main.py
```

### 4. Connect your Phone
1. Ensure your phone and PC are on the **same WiFi network**.
2. Scan the **QR Code** shown on the Desktop App or open the URL in your phone's browser.
3. Enter the **PIN** shown on the Desktop App.
4. Enjoy your spatial workspace!

## 🛠 Project Structure
- `desktop_app/`: Native Python host application (CustomTkinter, aiortc).
- `snapxr-app/`: React + Three.js viewer (compiled into `dist/`).
- `snapxr-app/dist/`: Static assets served by the Python app.

## 📱 Features
- **Spatial Mode:** Look around your desktop in 3D using your phone's gyroscope.
- **VR Mode:** Split-screen mode for Google Cardboard / Mobile VR headsets.
- **Low Latency:** Powered by WebRTC P2P streaming.
- **Widgets:** Floating clocks, timers, and focus trackers in your virtual space.
