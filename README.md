# 🎮 VoxelProps-JSX

<div align="center">

![VoxelProps](https://img.shields.io/badge/VoxelProps-JSX-00ffc8?style=for-the-badge&logo=react)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-18+-61dafb?style=for-the-badge&logo=react)
![JavaScript](https://img.shields.io/badge/Vanilla_JS-Compatible-f7df1e?style=for-the-badge&logo=javascript)

**Optimized 3D Voxel Mesh Generation with SVGA-Style Vertex Shading**

*Hollow shell extraction • Bilateral symmetry mirroring • Real-time rendering*

[Quick Preview](#-quick-preview) • [Features](#-features) • [Installation](#-installation) • [Integration Guide](#-integration-guide) • [API](#-api-reference)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| ⚡ **Hollow Shell Extraction** | Automatically removes interior voxels, reducing geometry by 50-90% |
| ⟷ **Bilateral Symmetry** | Define half the model, mirror at render time for 2x efficiency |
| 🎨 **SVGA Vertex Shading** | Classic 3-tone lighting (shadow/base/highlight) per face |
| 🔲 **Wireframe Mode** | Toggle wireframe overlay with edge deduplication |
| 🎯 **7 Preset Models** | Human, Robot, Car, Tree, House, Cube, Sphere |
| 🌈 **3 Color Palettes** | Default, Cyberpunk, Retro themes |
| 🖱️ **Interactive Controls** | Drag to rotate, scroll to zoom, auto-rotate |
| 📊 **Real-time Stats** | Voxel count, vertex count, optimization savings |

---

## 🚀 Quick Preview

**Want to see it in action immediately?** 

Open **[`demo.html`](./demo.html)** in any modern browser — no build step required!

```bash
# Clone and open
git clone https://github.com/MushroomFleet/VoxelProps-JSX.git
cd VoxelProps-JSX
open demo.html  # or double-click the file
```

The demo includes:
- Full interactive 3D viewer
- All preset models and palettes
- Optimization toggle controls
- Performance statistics overlay

---

## 📦 Installation

### Option 1: Direct Copy

```bash
# Copy the component into your React project
cp VoxelProps.jsx your-project/src/components/
```

### Option 2: Clone Repository

```bash
git clone https://github.com/MushroomFleet/VoxelProps-JSX.git
```

---

## 🔧 Basic Usage

### React

```jsx
import VoxelProps from './components/VoxelProps';

function App() {
  return (
    <VoxelProps 
      initialModel="robot"
      initialResolution={16}
      initialPalette="cyberpunk"
      width={600}
      height={600}
      autoRotate={true}
    />
  );
}
```

### Vanilla JavaScript

```javascript
import { VoxelEngine, VoxelModels, Matrix, Renderer } from './voxel-engine.js';

// Create grid and model
let grid = VoxelEngine.createGrid(16);
VoxelModels.robot(grid);

// Apply optimizations
grid = VoxelEngine.hollowGrid(grid);

// Generate mesh with symmetry mirroring
const mesh = VoxelEngine.generateMesh(grid, true);

// Render to canvas
Renderer.render(ctx, mesh, transformMatrix, options);
```

---

## 📖 Integration Guide

For detailed instructions on adapting VoxelProps to your codebase, see:

### 📄 **[voxelprop-integration.md](./voxelprop-integration.md)**

The integration guide covers:

- ✅ React project setup
- ✅ Vanilla JavaScript usage
- ✅ Vue 3 & Svelte adapters
- ✅ Custom model creation
- ✅ Complete API reference
- ✅ Performance tuning tips
- ✅ Troubleshooting guide

---

## 🎨 Preset Models

| Model | Symmetric | Description |
|-------|:---------:|-------------|
| `human` | ⟷ | Humanoid figure with hair |
| `robot` | ⟷ | Mechanical robot with antenna |
| `car` | ⟷ | Vehicle with wheels and cabin |
| `tree` | ⟷ | Tree with trunk and foliage layers |
| `house` | ⟷ | House with roof, door, and windows |
| `cube` | ✗ | Simple centered cube |
| `sphere` | ✗ | Computed sphere shape |

---

## ⚡ Optimizations Explained

### Hollow Shell Extraction

Interior voxels (surrounded on all 6 sides) contribute nothing to the visible mesh. VoxelProps automatically detects and removes them:

```
BEFORE (Solid 4³)     AFTER (Shell Only)
████                  ████
████         →        █  █
████                  █  █
████                  ████

64 voxels             56 voxels (12% saved)
At 32³: ~87% savings!
```

### Bilateral Symmetry Mirroring

Most characters and objects are symmetrical. Define only the left half, VoxelProps mirrors vertices at render time:

```
Define Left Half      Mirror → Full Model
  █│                    ██
 ██│          →        ████
███│                  ██████
 █ │                   █  █
```

- 50% less model definition code
- Vertices duplicated on GPU (cheap operation)

---

## 📊 API Reference

### VoxelEngine

| Method | Description |
|--------|-------------|
| `createGrid(size)` | Create empty voxel grid |
| `setVoxel(grid, x, y, z, value)` | Set voxel at position |
| `getVoxel(grid, x, y, z)` | Get voxel value |
| `hollowGrid(grid)` | Remove interior voxels |
| `mirrorGrid(grid)` | Mirror left→right for symmetric models |
| `generateMesh(grid, useSymmetry)` | Generate renderable mesh |

### Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialModel` | string | `'human'` | Preset model name |
| `initialResolution` | number | `16` | Grid size (4-32) |
| `initialPalette` | string | `'default'` | Color palette |
| `width` | number | `500` | Canvas width |
| `height` | number | `500` | Canvas height |
| `autoRotate` | boolean | `true` | Auto-rotation |

---

## 🎯 Resolution Guide

| Resolution | Voxels | Recommended Use |
|------------|--------|-----------------|
| 4³ | 64 | Icons, thumbnails |
| 8³ | 512 | Small sprites |
| 16³ | 4,096 | Standard preview ⭐ |
| 24³ | 13,824 | Detailed models |
| 32³ | 32,768 | Maximum detail |

---

## 🗂️ File Structure

```
VoxelProps-JSX/
├── VoxelProps.jsx          # Main React component
├── demo.html               # Standalone interactive demo
├── voxelprop-integration.md # Integration guide
├── README.md               # This file
└── LICENSE                 # MIT License
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📚 Citation

### Academic Citation

If you use this codebase in your research or project, please cite:

```bibtex
@software{voxelprops_jsx,
  title = {VoxelProps-JSX: Optimized 3D Voxel Mesh Generation with SVGA-Style Vertex Shading},
  author = {Drift Johnson},
  year = {2025},
  url = {https://github.com/MushroomFleet/VoxelProps-JSX},
  version = {1.0.0}
}
```

### Donate

[![Ko-Fi](https://cdn.ko-fi.com/cdn/kofi3.png?v=3)](https://ko-fi.com/driftjohnson)

---

<div align="center">

**Made with 🎮 by [Drift Johnson](https://ko-fi.com/driftjohnson)**

</div>
