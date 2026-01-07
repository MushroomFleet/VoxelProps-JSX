# VoxelProps Integration Guide

This document provides step-by-step instructions for integrating the VoxelProps component into your existing React project or adapting it for other frameworks.

---

## Table of Contents

1. [React Project Integration](#react-project-integration)
2. [Vanilla JavaScript Integration](#vanilla-javascript-integration)
3. [Framework Adapters](#framework-adapters)
4. [Custom Model Creation](#custom-model-creation)
5. [API Reference](#api-reference)
6. [Performance Tuning](#performance-tuning)

---

## React Project Integration

### Prerequisites

- React 18+ (or 16.8+ with hooks support)
- Node.js 16+

### Installation

1. **Copy the component file** into your project:

```bash
cp VoxelProps.jsx src/components/
```

2. **Import and use** in your application:

```jsx
import VoxelProps from './components/VoxelProps';

function App() {
  return (
    <div className="app">
      <VoxelProps 
        initialModel="robot"
        initialResolution={16}
        initialPalette="cyberpunk"
        width={600}
        height={600}
        autoRotate={true}
      />
    </div>
  );
}
```

### Available Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialModel` | string | `'human'` | Preset model: `human`, `robot`, `car`, `tree`, `house`, `cube`, `sphere` |
| `initialResolution` | number | `16` | Grid resolution (4-32) |
| `initialPalette` | string | `'default'` | Color palette: `default`, `cyberpunk`, `retro` |
| `width` | number | `500` | Canvas width in pixels |
| `height` | number | `500` | Canvas height in pixels |
| `autoRotate` | boolean | `true` | Enable auto-rotation on load |
| `className` | string | `''` | Additional CSS class for container |

---

## Vanilla JavaScript Integration

If you're not using React, extract the core engine modules:

### 1. Extract Core Modules

Create `voxel-engine.js`:

```javascript
// Copy these exports from VoxelProps.jsx:
// - VoxelEngine
// - VoxelModels  
// - ColorPalettes
// - Matrix
// - Renderer

export { VoxelEngine, VoxelModels, ColorPalettes, Matrix, Renderer };
```

### 2. Basic Usage

```html
<canvas id="voxel-canvas" width="500" height="500"></canvas>
<script type="module">
  import { VoxelEngine, VoxelModels, Matrix, Renderer, ColorPalettes } from './voxel-engine.js';

  const canvas = document.getElementById('voxel-canvas');
  const ctx = canvas.getContext('2d');

  // Create and populate grid
  let grid = VoxelEngine.createGrid(16);
  VoxelModels.robot(grid);
  
  // Apply optimizations
  grid = VoxelEngine.hollowGrid(grid);
  
  // Generate mesh
  const mesh = VoxelEngine.generateMesh(grid, true);

  // Render loop
  let rotation = 0;
  function render() {
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, 500, 500);

    const center = mesh.size / 2;
    let transform = Matrix.identity();
    transform = Matrix.multiply(Matrix.translate(-center, -center, -center), transform);
    transform = Matrix.multiply(Matrix.scale(1.5 / mesh.size), transform);
    transform = Matrix.multiply(Matrix.rotateX(-0.4), transform);
    transform = Matrix.multiply(Matrix.rotateY(rotation), transform);

    Renderer.render(ctx, mesh, transform, {
      width: 500,
      height: 500,
      wireframe: true,
      showFaces: true,
      palette: 'default',
      lightDir: [0.5, 0.5, 0.5],
      ambient: 0.3,
      wireframeColor: 'rgba(0, 255, 200, 0.5)'
    });

    rotation += 0.01;
    requestAnimationFrame(render);
  }
  
  render();
</script>
```

---

## Framework Adapters

### Vue 3 Composition API

```vue
<template>
  <canvas ref="canvasRef" :width="width" :height="height" />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { VoxelEngine, VoxelModels, Matrix, Renderer } from './voxel-engine';

const props = defineProps({
  width: { type: Number, default: 500 },
  height: { type: Number, default: 500 },
  model: { type: String, default: 'human' }
});

const canvasRef = ref(null);
let animationId = null;

onMounted(() => {
  const ctx = canvasRef.value.getContext('2d');
  let grid = VoxelEngine.createGrid(16);
  VoxelModels[props.model](grid);
  grid = VoxelEngine.hollowGrid(grid);
  const mesh = VoxelEngine.generateMesh(grid, true);
  
  let rotation = 0;
  function render() {
    // ... render logic from vanilla example
    animationId = requestAnimationFrame(render);
  }
  render();
});

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId);
});
</script>
```

### Svelte

```svelte
<script>
  import { onMount, onDestroy } from 'svelte';
  import { VoxelEngine, VoxelModels, Matrix, Renderer } from './voxel-engine';

  export let width = 500;
  export let height = 500;
  export let model = 'human';

  let canvas;
  let animationId;

  onMount(() => {
    const ctx = canvas.getContext('2d');
    // ... initialization and render loop
  });

  onDestroy(() => {
    if (animationId) cancelAnimationFrame(animationId);
  });
</script>

<canvas bind:this={canvas} {width} {height} />
```

---

## Custom Model Creation

### Basic Structure

Models are functions that populate a voxel grid:

```javascript
const MyModel = (grid) => {
  const s = grid.size;
  const scale = s / 32; // Normalize to 32-unit base
  
  // Mark as symmetric if applicable
  grid.symmetric = true;
  
  // Helper function for drawing boxes
  const box = (x1, y1, z1, x2, y2, z2, colorIndex) => {
    for (let x = Math.floor(x1 * scale); x < Math.floor(x2 * scale); x++)
      for (let y = Math.floor(y1 * scale); y < Math.floor(y2 * scale); y++)
        for (let z = Math.floor(z1 * scale); z < Math.floor(z2 * scale); z++)
          VoxelEngine.setVoxel(grid, x, y, z, colorIndex);
  };
  
  // Define geometry (left half only for symmetric models)
  box(14, 0, 14, 16, 20, 18, 7);  // Body
  box(12, 20, 12, 16, 28, 20, 1); // Head
  
  // Mirror if symmetric
  if (grid.symmetric) {
    VoxelEngine.mirrorGrid(grid);
  }
  
  return grid;
};
```

### Adding to Model Registry

```javascript
// Extend VoxelModels object
VoxelModels.myModel = MyModel;

// Use in component
<VoxelProps initialModel="myModel" />
```

### Color Index Reference

| Index | Default Color | Usage |
|-------|--------------|-------|
| 1 | Skin tone | Characters |
| 2 | Blue | Clothing, accents |
| 3 | Dark blue | Pants, shadows |
| 4 | Brown | Hair, wood |
| 5 | White/Gray | Highlights |
| 6 | Red | Accents |
| 7 | Wood brown | Trunks, doors |
| 8 | Green | Foliage |
| 9-17 | Various | See ColorPalettes |

---

## API Reference

### VoxelEngine

```typescript
VoxelEngine.createGrid(size: number): Grid
VoxelEngine.setVoxel(grid: Grid, x: number, y: number, z: number, value: number): void
VoxelEngine.getVoxel(grid: Grid, x: number, y: number, z: number): number
VoxelEngine.isInterior(grid: Grid, x: number, y: number, z: number): boolean
VoxelEngine.hollowGrid(grid: Grid): Grid
VoxelEngine.mirrorGrid(grid: Grid): Grid
VoxelEngine.generateMesh(grid: Grid, useSymmetryOpt?: boolean): Mesh
```

### Matrix

```typescript
Matrix.identity(): number[]
Matrix.multiply(a: number[], b: number[]): number[]
Matrix.rotateX(angle: number): number[]
Matrix.rotateY(angle: number): number[]
Matrix.translate(x: number, y: number, z: number): number[]
Matrix.scale(s: number): number[]
Matrix.transformPoint(matrix: number[], point: number[]): number[]
```

### Renderer

```typescript
Renderer.render(ctx: CanvasRenderingContext2D, mesh: Mesh, transform: number[], options: RenderOptions): void
Renderer.lerpColor(color1: string, color2: string, t: number): string
```

---

## Performance Tuning

### Resolution Guidelines

| Resolution | Voxels | Use Case |
|------------|--------|----------|
| 4³ | 64 | Icons, thumbnails |
| 8³ | 512 | Small sprites |
| 16³ | 4,096 | Standard preview |
| 24³ | 13,824 | Detailed models |
| 32³ | 32,768 | Maximum detail |

### Optimization Toggles

```jsx
// Disable hollow optimization for thin/open models
const mesh = VoxelEngine.generateMesh(grid, false);

// Force full model generation (disable symmetry mirroring)
grid.symmetric = false;
```

### Memory Considerations

- Each voxel uses 1 byte (Uint8Array)
- 32³ grid = 32KB base memory
- Mesh vertices scale with visible surface area, not volume
- Hollow optimization reduces face count by 50-90%

---

## Troubleshooting

### Model appears inside-out
- Check face winding order in custom models
- Ensure `mirrorGrid()` is called for symmetric models

### Performance issues at high resolution
- Enable hollow optimization
- Reduce canvas size
- Consider using WebGL for 32³+

### Colors not appearing
- Verify color index exists in palette (1-17)
- Check that `showFaces` is enabled

---

## Support

For issues or feature requests, visit:
https://github.com/MushroomFleet/VoxelProps-JSX/issues
