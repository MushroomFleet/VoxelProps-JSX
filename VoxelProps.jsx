import React, { useState, useEffect, useRef, useMemo } from 'react';

// ============================================================================
// VOXEL ENGINE CORE - OPTIMIZED
// ============================================================================

const VoxelEngine = {
  // Create empty voxel grid
  createGrid: (size) => {
    const grid = new Uint8Array(size * size * size);
    return { data: grid, size, symmetric: false };
  },

  // Set voxel at position
  setVoxel: (grid, x, y, z, value) => {
    if (x >= 0 && x < grid.size && y >= 0 && y < grid.size && z >= 0 && z < grid.size) {
      grid.data[x + y * grid.size + z * grid.size * grid.size] = value;
    }
  },

  // Get voxel at position
  getVoxel: (grid, x, y, z) => {
    if (x >= 0 && x < grid.size && y >= 0 && y < grid.size && z >= 0 && z < grid.size) {
      return grid.data[x + y * grid.size + z * grid.size * grid.size];
    }
    return 0;
  },

  // Check if voxel is interior (surrounded on all 6 sides)
  isInterior: (grid, x, y, z) => {
    return (
      VoxelEngine.getVoxel(grid, x + 1, y, z) !== 0 &&
      VoxelEngine.getVoxel(grid, x - 1, y, z) !== 0 &&
      VoxelEngine.getVoxel(grid, x, y + 1, z) !== 0 &&
      VoxelEngine.getVoxel(grid, x, y - 1, z) !== 0 &&
      VoxelEngine.getVoxel(grid, x, y, z + 1) !== 0 &&
      VoxelEngine.getVoxel(grid, x, y, z - 1) !== 0
    );
  },

  // OPTIMIZATION 1: Hollow out the grid - remove interior voxels
  hollowGrid: (grid) => {
    const { size, data } = grid;
    const hollow = new Uint8Array(size * size * size);
    let removed = 0;
    let kept = 0;

    for (let z = 0; z < size; z++) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const voxel = VoxelEngine.getVoxel(grid, x, y, z);
          if (voxel !== 0) {
            if (!VoxelEngine.isInterior(grid, x, y, z)) {
              hollow[x + y * size + z * size * size] = voxel;
              kept++;
            } else {
              removed++;
            }
          }
        }
      }
    }

    return { 
      data: hollow, 
      size, 
      symmetric: grid.symmetric,
      stats: { removed, kept, ratio: kept / (kept + removed) }
    };
  },

  // OPTIMIZATION 2: Mirror grid along X axis (for symmetric models)
  // Only the LEFT half (x < center) is defined, we mirror to the right
  mirrorGrid: (grid) => {
    if (!grid.symmetric) return grid;
    
    const { size, data } = grid;
    const center = Math.floor(size / 2);
    
    for (let z = 0; z < size; z++) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < center; x++) {
          const voxel = VoxelEngine.getVoxel(grid, x, y, z);
          if (voxel !== 0) {
            // Mirror to the right side
            const mirrorX = size - 1 - x;
            VoxelEngine.setVoxel(grid, mirrorX, y, z, voxel);
          }
        }
      }
    }
    
    return grid;
  },

  // Check if face is visible (not occluded by neighbor)
  isFaceVisible: (grid, x, y, z, dx, dy, dz) => {
    return VoxelEngine.getVoxel(grid, x + dx, y + dy, z + dz) === 0;
  },

  // Generate mesh from voxel grid (exterior surfaces only)
  // Now with optional symmetry optimization for rendering
  generateMesh: (grid, useSymmetryOptimization = true) => {
    const vertices = [];
    const faces = [];
    const colors = [];
    
    const { size, data, symmetric } = grid;
    
    // Face definitions: [normal, vertex offsets]
    const faceTemplates = {
      top:    { normal: [0, 1, 0], verts: [[0,1,0], [1,1,0], [1,1,1], [0,1,1]] },
      bottom: { normal: [0, -1, 0], verts: [[0,0,1], [1,0,1], [1,0,0], [0,0,0]] },
      front:  { normal: [0, 0, 1], verts: [[0,0,1], [0,1,1], [1,1,1], [1,0,1]] },
      back:   { normal: [0, 0, -1], verts: [[1,0,0], [1,1,0], [0,1,0], [0,0,0]] },
      right:  { normal: [1, 0, 0], verts: [[1,0,1], [1,1,1], [1,1,0], [1,0,0]] },
      left:   { normal: [-1, 0, 0], verts: [[0,0,0], [0,1,0], [0,1,1], [0,0,1]] }
    };

    const center = size / 2;
    
    // If symmetric and using optimization, only process left half
    const xEnd = (symmetric && useSymmetryOptimization) ? Math.ceil(size / 2) : size;

    for (let z = 0; z < size; z++) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < xEnd; x++) {
          const voxel = VoxelEngine.getVoxel(grid, x, y, z);
          if (voxel === 0) continue;

          const faceChecks = [
            { face: 'top', dx: 0, dy: 1, dz: 0 },
            { face: 'bottom', dx: 0, dy: -1, dz: 0 },
            { face: 'front', dx: 0, dy: 0, dz: 1 },
            { face: 'back', dx: 0, dy: 0, dz: -1 },
            { face: 'right', dx: 1, dy: 0, dz: 0 },
            { face: 'left', dx: -1, dy: 0, dz: 0 }
          ];

          faceChecks.forEach(({ face, dx, dy, dz }) => {
            if (VoxelEngine.isFaceVisible(grid, x, y, z, dx, dy, dz)) {
              const template = faceTemplates[face];
              const baseIndex = vertices.length / 3;
              
              // Add vertices for left side
              template.verts.forEach(([vx, vy, vz]) => {
                vertices.push(x + vx, y + vy, z + vz);
              });

              faces.push(baseIndex, baseIndex + 1, baseIndex + 2);
              faces.push(baseIndex, baseIndex + 2, baseIndex + 3);

              for (let i = 0; i < 4; i++) {
                colors.push(voxel);
              }
            }
          });
        }
      }
    }

    // OPTIMIZATION 2: Mirror geometry for symmetric models
    if (symmetric && useSymmetryOptimization) {
      const originalVertCount = vertices.length / 3;
      const originalFaceCount = faces.length;
      
      // Duplicate and mirror all vertices
      for (let i = 0; i < originalVertCount; i++) {
        const vx = vertices[i * 3];
        const vy = vertices[i * 3 + 1];
        const vz = vertices[i * 3 + 2];
        
        // Mirror X coordinate around center
        const mirroredX = size - vx;
        vertices.push(mirroredX, vy, vz);
        colors.push(colors[i]);
      }
      
      // Duplicate faces with reversed winding for correct normals
      for (let i = 0; i < originalFaceCount; i += 3) {
        const i0 = faces[i] + originalVertCount;
        const i1 = faces[i + 1] + originalVertCount;
        const i2 = faces[i + 2] + originalVertCount;
        // Reverse winding order for mirrored faces
        faces.push(i0, i2, i1);
      }
    }

    return { vertices, faces, colors, size, symmetric };
  }
};

// ============================================================================
// PRESET VOXEL MODELS - OPTIMIZED WITH SYMMETRY
// ============================================================================

const VoxelModels = {
  // Human figure - SYMMETRIC (only define left half)
  human: (grid) => {
    const s = grid.size;
    const scale = s / 32;
    const center = s / 2;
    
    // Mark as symmetric - we only define the LEFT half
    grid.symmetric = true;
    
    const drawBox = (x1, y1, z1, x2, y2, z2, color) => {
      for (let x = Math.floor(x1 * scale); x < Math.floor(x2 * scale); x++) {
        for (let y = Math.floor(y1 * scale); y < Math.floor(y2 * scale); y++) {
          for (let z = Math.floor(z1 * scale); z < Math.floor(z2 * scale); z++) {
            VoxelEngine.setVoxel(grid, x, y, z, color);
          }
        }
      }
    };
    
    // Only define LEFT half (will be mirrored)
    // Head (left half only - x from 13 to 16 for a 32-unit model)
    drawBox(13, 24, 13, 16, 32, 19, 1);
    // Torso (left half)
    drawBox(11, 12, 12, 16, 24, 20, 2);
    // Left arm (only left side)
    drawBox(6, 12, 13, 11, 24, 19, 2);
    drawBox(6, 8, 13, 11, 12, 19, 1);
    // Left leg
    drawBox(11, 0, 13, 16, 12, 19, 3);
    // Hair (left half)
    drawBox(13, 28, 12, 16, 32, 13, 4);
    drawBox(12, 28, 13, 13, 32, 19, 4);

    // Mirror to create right side
    VoxelEngine.mirrorGrid(grid);
    return grid;
  },

  // Robot - SYMMETRIC
  robot: (grid) => {
    const s = grid.size;
    const scale = s / 32;
    
    grid.symmetric = true;
    
    const drawBox = (x1, y1, z1, x2, y2, z2, color) => {
      for (let x = Math.floor(x1 * scale); x < Math.floor(x2 * scale); x++) {
        for (let y = Math.floor(y1 * scale); y < Math.floor(y2 * scale); y++) {
          for (let z = Math.floor(z1 * scale); z < Math.floor(z2 * scale); z++) {
            VoxelEngine.setVoxel(grid, x, y, z, color);
          }
        }
      }
    };

    // Only left half
    // Head (left half)
    drawBox(12, 24, 12, 16, 32, 20, 16);
    // Left eye
    drawBox(13, 27, 11, 15, 29, 12, 13);
    // Torso (left half)
    drawBox(10, 10, 10, 16, 24, 22, 16);
    // Core (left half)
    drawBox(14, 14, 9, 16, 20, 10, 17);
    // Left arm
    drawBox(4, 10, 12, 10, 24, 20, 16);
    drawBox(4, 6, 13, 10, 10, 19, 12);
    // Left leg
    drawBox(10, 0, 12, 15, 10, 20, 16);
    // Antenna (left half)
    drawBox(15, 32, 15, 16, 36, 17, 12);
    drawBox(14, 36, 14, 16, 38, 18, 17);

    VoxelEngine.mirrorGrid(grid);
    return grid;
  },

  // Car - SYMMETRIC (front-back axis, mirrored on X)
  car: (grid) => {
    const s = grid.size;
    const scale = s / 32;
    
    grid.symmetric = true;
    
    const drawBox = (x1, y1, z1, x2, y2, z2, color) => {
      for (let x = Math.floor(x1 * scale); x < Math.floor(x2 * scale); x++) {
        for (let y = Math.floor(y1 * scale); y < Math.floor(y2 * scale); y++) {
          for (let z = Math.floor(z1 * scale); z < Math.floor(z2 * scale); z++) {
            VoxelEngine.setVoxel(grid, x, y, z, color);
          }
        }
      }
    };

    // Left half only
    // Body
    drawBox(4, 4, 10, 16, 10, 22, 9);
    // Cabin
    drawBox(10, 10, 11, 16, 16, 21, 10);
    // Windows
    drawBox(11, 11, 11, 16, 15, 12, 11);
    drawBox(11, 11, 20, 16, 15, 21, 11);
    // Left wheels
    drawBox(6, 2, 8, 10, 6, 12, 12);
    drawBox(6, 2, 20, 10, 6, 24, 12);
    // Headlight
    drawBox(4, 6, 12, 5, 8, 14, 13);
    drawBox(4, 6, 18, 5, 8, 20, 13);

    VoxelEngine.mirrorGrid(grid);
    return grid;
  },

  // Tree - SYMMETRIC
  tree: (grid) => {
    const s = grid.size;
    const scale = s / 32;
    
    grid.symmetric = true;
    
    const drawBox = (x1, y1, z1, x2, y2, z2, color) => {
      for (let x = Math.floor(x1 * scale); x < Math.floor(x2 * scale); x++) {
        for (let y = Math.floor(y1 * scale); y < Math.floor(y2 * scale); y++) {
          for (let z = Math.floor(z1 * scale); z < Math.floor(z2 * scale); z++) {
            VoxelEngine.setVoxel(grid, x, y, z, color);
          }
        }
      }
    };

    // Trunk (left half)
    drawBox(14, 0, 14, 16, 16, 18, 7);
    // Foliage layers (left half)
    drawBox(8, 16, 8, 16, 22, 24, 8);
    drawBox(10, 22, 10, 16, 28, 22, 8);
    drawBox(12, 28, 12, 16, 32, 20, 8);

    VoxelEngine.mirrorGrid(grid);
    return grid;
  },

  // House - SYMMETRIC
  house: (grid) => {
    const s = grid.size;
    const scale = s / 32;
    
    grid.symmetric = true;
    
    const drawBox = (x1, y1, z1, x2, y2, z2, color) => {
      for (let x = Math.floor(x1 * scale); x < Math.floor(x2 * scale); x++) {
        for (let y = Math.floor(y1 * scale); y < Math.floor(y2 * scale); y++) {
          for (let z = Math.floor(z1 * scale); z < Math.floor(z2 * scale); z++) {
            VoxelEngine.setVoxel(grid, x, y, z, color);
          }
        }
      }
    };

    // Main structure (left half)
    drawBox(4, 0, 8, 16, 18, 24, 14);
    // Hollow interior (left half)
    drawBox(6, 0, 10, 16, 16, 22, 0);
    // Roof (left half)
    for (let i = 0; i < 8; i++) {
      drawBox(4 + i, 18 + i, 6, 16, 20 + i, 26, 15);
    }
    // Door (centered, left half)
    drawBox(14, 0, 7, 16, 10, 8, 7);
    // Window (left only)
    drawBox(7, 8, 7, 11, 14, 8, 11);

    VoxelEngine.mirrorGrid(grid);
    return grid;
  },

  // Cube - NOT symmetric (simple shape)
  cube: (grid) => {
    const s = grid.size;
    const margin = Math.floor(s * 0.25);
    grid.symmetric = false;
    
    for (let x = margin; x < s - margin; x++) {
      for (let y = margin; y < s - margin; y++) {
        for (let z = margin; z < s - margin; z++) {
          VoxelEngine.setVoxel(grid, x, y, z, 5);
        }
      }
    }
    return grid;
  },

  // Sphere - NOT symmetric (computed shape)
  sphere: (grid) => {
    const s = grid.size;
    const center = s / 2;
    const radius = s * 0.4;
    grid.symmetric = false;
    
    for (let x = 0; x < s; x++) {
      for (let y = 0; y < s; y++) {
        for (let z = 0; z < s; z++) {
          const dx = x - center + 0.5;
          const dy = y - center + 0.5;
          const dz = z - center + 0.5;
          if (dx * dx + dy * dy + dz * dz <= radius * radius) {
            VoxelEngine.setVoxel(grid, x, y, z, 6);
          }
        }
      }
    }
    return grid;
  }
};

// ============================================================================
// SVGA COLOR PALETTES
// ============================================================================

const ColorPalettes = {
  default: {
    1: { base: '#FFD5B8', highlight: '#FFF0E0', shadow: '#C9A088' },
    2: { base: '#4A90D9', highlight: '#7AB8FF', shadow: '#2A5080' },
    3: { base: '#3D5C8C', highlight: '#5A80B0', shadow: '#253850' },
    4: { base: '#4A3728', highlight: '#6B5040', shadow: '#2A1F18' },
    5: { base: '#E8E8E8', highlight: '#FFFFFF', shadow: '#B0B0B0' },
    6: { base: '#FF6B6B', highlight: '#FF9999', shadow: '#CC4444' },
    7: { base: '#8B5A2B', highlight: '#A67B4B', shadow: '#5C3A1B' },
    8: { base: '#228B22', highlight: '#44AA44', shadow: '#145014' },
    9: { base: '#DC143C', highlight: '#FF3355', shadow: '#AA0022' },
    10: { base: '#C0C0C0', highlight: '#E0E0E0', shadow: '#909090' },
    11: { base: '#4169E1', highlight: '#6688FF', shadow: '#2244AA' },
    12: { base: '#2F2F2F', highlight: '#4F4F4F', shadow: '#1F1F1F' },
    13: { base: '#FFD700', highlight: '#FFEE55', shadow: '#CCA800' },
    14: { base: '#DEB887', highlight: '#F0D8A8', shadow: '#B09060' },
    15: { base: '#8B4513', highlight: '#A86030', shadow: '#5C2E0A' },
    16: { base: '#708090', highlight: '#90A0B0', shadow: '#505868' },
    17: { base: '#00FF88', highlight: '#55FFAA', shadow: '#00AA55' },
  },
  
  cyberpunk: {
    1: { base: '#E0C0FF', highlight: '#FFE0FF', shadow: '#A080C0' },
    2: { base: '#00FFFF', highlight: '#88FFFF', shadow: '#008888' },
    3: { base: '#FF00FF', highlight: '#FF88FF', shadow: '#880088' },
    4: { base: '#000000', highlight: '#333333', shadow: '#000000' },
    5: { base: '#FFFFFF', highlight: '#FFFFFF', shadow: '#AAAAAA' },
    6: { base: '#FF0080', highlight: '#FF55AA', shadow: '#AA0055' },
    7: { base: '#333333', highlight: '#555555', shadow: '#111111' },
    8: { base: '#00FF00', highlight: '#88FF88', shadow: '#008800' },
    9: { base: '#FF0000', highlight: '#FF5555', shadow: '#AA0000' },
    10: { base: '#808080', highlight: '#AAAAAA', shadow: '#555555' },
    11: { base: '#0088FF', highlight: '#55AAFF', shadow: '#005599' },
    12: { base: '#1A1A1A', highlight: '#333333', shadow: '#000000' },
    13: { base: '#FFFF00', highlight: '#FFFF88', shadow: '#888800' },
    14: { base: '#404040', highlight: '#606060', shadow: '#202020' },
    15: { base: '#660066', highlight: '#880088', shadow: '#440044' },
    16: { base: '#404050', highlight: '#606080', shadow: '#303040' },
    17: { base: '#00FFAA', highlight: '#55FFCC', shadow: '#00AA77' },
  },

  retro: {
    1: { base: '#F5CEB8', highlight: '#FFE8D8', shadow: '#C0A090' },
    2: { base: '#5B8930', highlight: '#7BA950', shadow: '#3B6920' },
    3: { base: '#8B4513', highlight: '#AB6533', shadow: '#5B2503' },
    4: { base: '#2F1810', highlight: '#4F3830', shadow: '#1F0800' },
    5: { base: '#FFFEF0', highlight: '#FFFFF8', shadow: '#D0D0C0' },
    6: { base: '#D2691E', highlight: '#E8893E', shadow: '#A24900' },
    7: { base: '#654321', highlight: '#856341', shadow: '#452311' },
    8: { base: '#228B22', highlight: '#44AB42', shadow: '#106B10' },
    9: { base: '#B22222', highlight: '#D24242', shadow: '#921212' },
    10: { base: '#C0B0A0', highlight: '#E0D0C0', shadow: '#A09080' },
    11: { base: '#87CEEB', highlight: '#A7EEFF', shadow: '#67AECB' },
    12: { base: '#3C3C3C', highlight: '#5C5C5C', shadow: '#1C1C1C' },
    13: { base: '#FFD700', highlight: '#FFF720', shadow: '#DFB700' },
    14: { base: '#D2B48C', highlight: '#F2D4AC', shadow: '#B2946C' },
    15: { base: '#A0522D', highlight: '#C0724D', shadow: '#80321D' },
    16: { base: '#696969', highlight: '#898989', shadow: '#494949' },
    17: { base: '#ADFF2F', highlight: '#CDFF5F', shadow: '#8DDF1F' },
  }
};

// ============================================================================
// 3D MATH UTILITIES
// ============================================================================

const Matrix = {
  identity: () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],

  multiply: (a, b) => {
    const result = new Array(16).fill(0);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        for (let k = 0; k < 4; k++) {
          result[row * 4 + col] += a[row * 4 + k] * b[k * 4 + col];
        }
      }
    }
    return result;
  },

  rotateX: (angle) => {
    const c = Math.cos(angle), s = Math.sin(angle);
    return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1];
  },

  rotateY: (angle) => {
    const c = Math.cos(angle), s = Math.sin(angle);
    return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1];
  },

  translate: (x, y, z) => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1],

  scale: (s) => [s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1],

  transformPoint: (m, p) => {
    const w = m[12] * p[0] + m[13] * p[1] + m[14] * p[2] + m[15];
    return [
      (m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3]) / w,
      (m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7]) / w,
      (m[8] * p[0] + m[9] * p[1] + m[10] * p[2] + m[11]) / w
    ];
  }
};

// ============================================================================
// RENDERER
// ============================================================================

const Renderer = {
  render: (ctx, mesh, transform, options) => {
    const { width, height, wireframe, showFaces, palette, lightDir, ambient } = options;
    
    if (!mesh || mesh.vertices.length === 0) return;

    const colorPalette = ColorPalettes[palette] || ColorPalettes.default;
    
    // Transform all vertices
    const transformedVerts = [];
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      const p = Matrix.transformPoint(transform, [
        mesh.vertices[i],
        mesh.vertices[i + 1],
        mesh.vertices[i + 2]
      ]);
      transformedVerts.push({
        x: (p[0] + 1) * width / 2,
        y: (1 - p[1]) * height / 2,
        z: p[2]
      });
    }

    // Build face list with depth sorting
    const faceList = [];
    for (let i = 0; i < mesh.faces.length; i += 3) {
      const i0 = mesh.faces[i];
      const i1 = mesh.faces[i + 1];
      const i2 = mesh.faces[i + 2];
      
      const v0 = transformedVerts[i0];
      const v1 = transformedVerts[i1];
      const v2 = transformedVerts[i2];

      // Calculate face normal for backface culling
      const ax = v1.x - v0.x, ay = v1.y - v0.y;
      const bx = v2.x - v0.x, by = v2.y - v0.y;
      const cross = ax * by - ay * bx;
      
      // Backface culling
      if (cross < 0) continue;

      // Calculate 3D normal for lighting
      const p0 = [mesh.vertices[i0 * 3], mesh.vertices[i0 * 3 + 1], mesh.vertices[i0 * 3 + 2]];
      const p1 = [mesh.vertices[i1 * 3], mesh.vertices[i1 * 3 + 1], mesh.vertices[i1 * 3 + 2]];
      const p2 = [mesh.vertices[i2 * 3], mesh.vertices[i2 * 3 + 1], mesh.vertices[i2 * 3 + 2]];
      
      const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
      const e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
      const normal = [
        e1[1] * e2[2] - e1[2] * e2[1],
        e1[2] * e2[0] - e1[0] * e2[2],
        e1[0] * e2[1] - e1[1] * e2[0]
      ];
      const len = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2);
      if (len > 0) {
        normal[0] /= len;
        normal[1] /= len;
        normal[2] /= len;
      }

      const dot = Math.max(0, normal[0] * lightDir[0] + normal[1] * lightDir[1] + normal[2] * lightDir[2]);
      const intensity = ambient + (1 - ambient) * dot;

      const avgZ = (v0.z + v1.z + v2.z) / 3;
      const colorIndex = mesh.colors[i0] || 1;

      faceList.push({
        verts: [v0, v1, v2],
        z: avgZ,
        intensity,
        colorIndex,
        indices: [i0, i1, i2]
      });
    }

    // Depth sort
    faceList.sort((a, b) => b.z - a.z);

    // Render faces
    if (showFaces) {
      faceList.forEach(face => {
        const colors = colorPalette[face.colorIndex] || colorPalette[1];
        
        let color;
        if (face.intensity < 0.5) {
          const t = face.intensity * 2;
          color = Renderer.lerpColor(colors.shadow, colors.base, t);
        } else {
          const t = (face.intensity - 0.5) * 2;
          color = Renderer.lerpColor(colors.base, colors.highlight, t);
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(face.verts[0].x, face.verts[0].y);
        ctx.lineTo(face.verts[1].x, face.verts[1].y);
        ctx.lineTo(face.verts[2].x, face.verts[2].y);
        ctx.closePath();
        ctx.fill();
      });
    }

    // Render wireframe
    if (wireframe) {
      ctx.strokeStyle = options.wireframeColor || 'rgba(0, 255, 200, 0.6)';
      ctx.lineWidth = options.wireframeWidth || 1;

      const drawnEdges = new Set();
      
      faceList.forEach(face => {
        const [i0, i1, i2] = face.indices;
        const edges = [[i0, i1], [i1, i2], [i2, i0]];
        
        edges.forEach(([a, b]) => {
          const key = a < b ? `${a}-${b}` : `${b}-${a}`;
          if (drawnEdges.has(key)) return;
          drawnEdges.add(key);

          const v0 = transformedVerts[a];
          const v1 = transformedVerts[b];
          
          ctx.beginPath();
          ctx.moveTo(v0.x, v0.y);
          ctx.lineTo(v1.x, v1.y);
          ctx.stroke();
        });
      });
    }
  },

  lerpColor: (c1, c2, t) => {
    const r1 = parseInt(c1.slice(1, 3), 16);
    const g1 = parseInt(c1.slice(3, 5), 16);
    const b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16);
    const g2 = parseInt(c2.slice(3, 5), 16);
    const b2 = parseInt(c2.slice(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
};

// ============================================================================
// VOXEL PROPS COMPONENT
// ============================================================================

const VoxelProps = ({ 
  initialModel = 'human',
  initialResolution = 16,
  initialPalette = 'default',
  width = 500,
  height = 500,
  autoRotate = true,
  className = ''
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  
  const [model, setModel] = useState(initialModel);
  const [resolution, setResolution] = useState(initialResolution);
  const [palette, setPalette] = useState(initialPalette);
  const [wireframe, setWireframe] = useState(true);
  const [showFaces, setShowFaces] = useState(true);
  const [rotation, setRotation] = useState({ x: -0.4, y: 0.5 });
  const [zoom, setZoom] = useState(1.5);
  const [isRotating, setIsRotating] = useState(autoRotate);
  const [lightAngle, setLightAngle] = useState(45);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [stats, setStats] = useState({ 
    vertices: 0, faces: 0, voxels: 0, 
    shellVoxels: 0, symmetric: false,
    savedVoxels: 0, savedPercent: 0
  });
  const [useHollow, setUseHollow] = useState(true);
  const [useSymmetry, setUseSymmetry] = useState(true);

  // Generate mesh with optimizations
  const mesh = useMemo(() => {
    let grid = VoxelEngine.createGrid(resolution);
    
    switch (model) {
      case 'human': VoxelModels.human(grid); break;
      case 'cube': VoxelModels.cube(grid); break;
      case 'sphere': VoxelModels.sphere(grid); break;
      case 'tree': VoxelModels.tree(grid); break;
      case 'car': VoxelModels.car(grid); break;
      case 'house': VoxelModels.house(grid); break;
      case 'robot': VoxelModels.robot(grid); break;
      default: VoxelModels.cube(grid);
    }
    
    // Count original voxels
    let originalVoxels = 0;
    for (let i = 0; i < grid.data.length; i++) {
      if (grid.data[i] !== 0) originalVoxels++;
    }
    
    // OPTIMIZATION 1: Hollow the grid
    let hollowStats = { removed: 0, kept: originalVoxels };
    if (useHollow) {
      const hollowResult = VoxelEngine.hollowGrid(grid);
      grid = hollowResult;
      hollowStats = hollowResult.stats;
    }
    
    // Generate mesh with symmetry optimization
    const generatedMesh = VoxelEngine.generateMesh(grid, useSymmetry);
    
    // Calculate savings
    const shellVoxels = hollowStats.kept;
    const savedVoxels = originalVoxels - shellVoxels;
    const savedPercent = originalVoxels > 0 ? Math.round((savedVoxels / originalVoxels) * 100) : 0;
    
    setStats({
      vertices: generatedMesh.vertices.length / 3,
      faces: generatedMesh.faces.length / 3,
      voxels: originalVoxels,
      shellVoxels,
      symmetric: grid.symmetric,
      savedVoxels,
      savedPercent,
      hollowRatio: hollowStats.ratio
    });
    
    return generatedMesh;
  }, [model, resolution, useHollow, useSymmetry]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let currentRotation = rotation.y;

    const render = () => {
      ctx.fillStyle = '#0a0a12';
      ctx.fillRect(0, 0, width, height);

      // Draw grid floor
      ctx.strokeStyle = 'rgba(0, 255, 200, 0.1)';
      ctx.lineWidth = 1;
      const gridSize = 20;
      const gridSpacing = width / gridSize;
      for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSpacing, height * 0.7);
        ctx.lineTo(i * gridSpacing, height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, height * 0.7 + i * gridSpacing * 0.3);
        ctx.lineTo(width, height * 0.7 + i * gridSpacing * 0.3);
        ctx.stroke();
      }

      if (isRotating) {
        currentRotation += 0.01;
      }

      const center = mesh.size / 2;
      let transform = Matrix.identity();
      transform = Matrix.multiply(Matrix.translate(-center, -center, -center), transform);
      transform = Matrix.multiply(Matrix.scale(zoom / mesh.size), transform);
      transform = Matrix.multiply(Matrix.rotateX(rotation.x), transform);
      transform = Matrix.multiply(Matrix.rotateY(isRotating ? currentRotation : rotation.y), transform);
      transform = Matrix.multiply(Matrix.translate(0, -0.1, 0), transform);

      const lightRad = lightAngle * Math.PI / 180;
      const lightDir = [
        Math.cos(lightRad) * 0.7,
        0.5,
        Math.sin(lightRad) * 0.7
      ];
      const lightLen = Math.sqrt(lightDir[0] ** 2 + lightDir[1] ** 2 + lightDir[2] ** 2);
      lightDir[0] /= lightLen;
      lightDir[1] /= lightLen;
      lightDir[2] /= lightLen;

      Renderer.render(ctx, mesh, transform, {
        width,
        height,
        wireframe,
        showFaces,
        palette,
        lightDir,
        ambient: 0.3,
        wireframeColor: 'rgba(0, 255, 200, 0.5)',
        wireframeWidth: 1
      });

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mesh, rotation, zoom, wireframe, showFaces, palette, isRotating, lightAngle, width, height]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
    setIsRotating(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    
    setRotation(prev => ({
      x: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, prev.x + dy * 0.01)),
      y: prev.y + dx * 0.01
    }));
    
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    setZoom(prev => Math.max(0.5, Math.min(4, prev - e.deltaY * 0.001)));
  };

  return (
    <div className={`voxel-props-container ${className}`} style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>VOXEL PROPS</h2>
        <div style={styles.subtitle}>OPTIMIZED • HOLLOW SHELL • BILATERAL SYMMETRY</div>
      </div>
      
      <div style={styles.main}>
        <div style={styles.canvasWrapper}>
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={styles.canvas}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />
          <div style={styles.stats}>
            <div>ORIGINAL: {stats.voxels} voxels</div>
            <div>SHELL: {stats.shellVoxels} voxels</div>
            <div style={{ color: '#00ff88' }}>SAVED: {stats.savedPercent}%</div>
            <div>VERTICES: {stats.vertices}</div>
            <div>FACES: {stats.faces}</div>
            {stats.symmetric && <div style={{ color: '#ff88ff' }}>⟷ SYMMETRIC</div>}
          </div>
          <div style={styles.hint}>DRAG TO ROTATE • SCROLL TO ZOOM</div>
        </div>

        <div style={styles.controls}>
          <div style={styles.controlGroup}>
            <label style={styles.label}>MODEL</label>
            <select 
              value={model} 
              onChange={(e) => setModel(e.target.value)}
              style={styles.select}
            >
              <option value="human">Human ⟷</option>
              <option value="robot">Robot ⟷</option>
              <option value="car">Car ⟷</option>
              <option value="tree">Tree ⟷</option>
              <option value="house">House ⟷</option>
              <option value="cube">Cube</option>
              <option value="sphere">Sphere</option>
            </select>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.label}>RESOLUTION: {resolution}³</label>
            <input
              type="range"
              min="4"
              max="32"
              step="2"
              value={resolution}
              onChange={(e) => setResolution(parseInt(e.target.value))}
              style={styles.slider}
            />
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.label}>PALETTE</label>
            <select 
              value={palette} 
              onChange={(e) => setPalette(e.target.value)}
              style={styles.select}
            >
              <option value="default">Default</option>
              <option value="cyberpunk">Cyberpunk</option>
              <option value="retro">Retro</option>
            </select>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.label}>LIGHT ANGLE: {lightAngle}°</label>
            <input
              type="range"
              min="0"
              max="360"
              value={lightAngle}
              onChange={(e) => setLightAngle(parseInt(e.target.value))}
              style={styles.slider}
            />
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.label}>ZOOM: {zoom.toFixed(1)}×</label>
            <input
              type="range"
              min="0.5"
              max="4"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              style={styles.slider}
            />
          </div>

          <div style={{...styles.controlGroup, borderTop: '1px solid rgba(0,255,200,0.2)', paddingTop: '16px', marginTop: '8px'}}>
            <label style={{...styles.label, color: '#00ff88'}}>⚡ OPTIMIZATIONS</label>
          </div>

          <div style={styles.toggleGroup}>
            <button
              onClick={() => setUseHollow(!useHollow)}
              style={{
                ...styles.toggleButton,
                ...(useHollow ? styles.toggleActive : {})
              }}
            >
              HOLLOW {useHollow ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => setUseSymmetry(!useSymmetry)}
              style={{
                ...styles.toggleButton,
                ...(useSymmetry ? styles.toggleActive : {}),
                ...(!stats.symmetric ? { opacity: 0.5 } : {})
              }}
              disabled={!stats.symmetric}
            >
              MIRROR {useSymmetry ? 'ON' : 'OFF'}
            </button>
          </div>

          <div style={styles.toggleGroup}>
            <button
              onClick={() => setShowFaces(!showFaces)}
              style={{
                ...styles.toggleButton,
                ...(showFaces ? styles.toggleActive : {})
              }}
            >
              FACES {showFaces ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => setWireframe(!wireframe)}
              style={{
                ...styles.toggleButton,
                ...(wireframe ? styles.toggleActive : {})
              }}
            >
              WIREFRAME {wireframe ? 'ON' : 'OFF'}
            </button>
          </div>

          <div style={styles.toggleGroup}>
            <button
              onClick={() => setIsRotating(!isRotating)}
              style={{
                ...styles.toggleButton,
                ...(isRotating ? styles.toggleActive : {})
              }}
            >
              AUTO-ROTATE {isRotating ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => {
                setRotation({ x: -0.4, y: 0.5 });
                setZoom(1.5);
              }}
              style={styles.toggleButton}
            >
              RESET VIEW
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  container: {
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    backgroundColor: '#0a0a12',
    color: '#00ffc8',
    padding: '24px',
    minHeight: '100vh',
    boxSizing: 'border-box',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
    borderBottom: '1px solid rgba(0, 255, 200, 0.2)',
    paddingBottom: '16px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    letterSpacing: '8px',
    margin: '0 0 8px 0',
    textShadow: '0 0 20px rgba(0, 255, 200, 0.5)',
  },
  subtitle: {
    fontSize: '12px',
    letterSpacing: '4px',
    color: 'rgba(0, 255, 200, 0.6)',
  },
  main: {
    display: 'flex',
    gap: '24px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  canvasWrapper: {
    position: 'relative',
    border: '1px solid rgba(0, 255, 200, 0.3)',
    boxShadow: '0 0 40px rgba(0, 255, 200, 0.1), inset 0 0 60px rgba(0, 0, 0, 0.5)',
  },
  canvas: {
    display: 'block',
    cursor: 'grab',
  },
  stats: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    fontSize: '10px',
    letterSpacing: '2px',
    lineHeight: '1.8',
    color: 'rgba(0, 255, 200, 0.7)',
  },
  hint: {
    position: 'absolute',
    bottom: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '10px',
    letterSpacing: '2px',
    color: 'rgba(0, 255, 200, 0.4)',
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minWidth: '240px',
    padding: '20px',
    backgroundColor: 'rgba(0, 20, 15, 0.5)',
    border: '1px solid rgba(0, 255, 200, 0.2)',
  },
  controlGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '11px',
    letterSpacing: '2px',
    color: 'rgba(0, 255, 200, 0.6)',
  },
  select: {
    backgroundColor: '#0a0a12',
    color: '#00ffc8',
    border: '1px solid rgba(0, 255, 200, 0.3)',
    padding: '10px 12px',
    fontSize: '13px',
    fontFamily: 'inherit',
    cursor: 'pointer',
    outline: 'none',
  },
  slider: {
    appearance: 'none',
    backgroundColor: 'rgba(0, 255, 200, 0.1)',
    height: '4px',
    borderRadius: '2px',
    cursor: 'pointer',
    outline: 'none',
  },
  toggleGroup: {
    display: 'flex',
    gap: '8px',
  },
  toggleButton: {
    flex: 1,
    backgroundColor: 'transparent',
    color: 'rgba(0, 255, 200, 0.5)',
    border: '1px solid rgba(0, 255, 200, 0.3)',
    padding: '10px 8px',
    fontSize: '10px',
    letterSpacing: '1px',
    fontFamily: 'inherit',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  toggleActive: {
    backgroundColor: 'rgba(0, 255, 200, 0.1)',
    color: '#00ffc8',
    borderColor: '#00ffc8',
    boxShadow: '0 0 10px rgba(0, 255, 200, 0.3)',
  },
};

export default VoxelProps;
export { VoxelEngine, VoxelModels, ColorPalettes, Renderer, Matrix };
