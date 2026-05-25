// Tulip Map App Logic

// App State
let zoom = 0.05; // Starting zoomed out to show larger scale
let offsetX = 0; // Canvas view offsets
let offsetY = 0;
let isDragging = false;
let startDragX = 0;
let startDragY = 0;
let dragMoveCount = 0;

let playerPos = null; // {x, z}
let customMarker = null; // {x, z, label, noise, isTulip}
let activeFieldId = null;

// Load organic noise overlay image
const noiseOverlay = new Image();
noiseOverlay.src = 'tulip_noise_overlay.png';
noiseOverlay.onload = () => {
    drawMap();
};

// DOM Elements
const canvas = document.getElementById("map-canvas");
const ctx = canvas.getContext("2d");
const container = document.getElementById("canvas-container");
const hudCoords = document.getElementById("hud-coords");
const hudTrackingVal = document.getElementById("hud-tracking-val");
const hudTrackingLabel = document.getElementById("hud-tracking-label");
const hudTrackingContainer = document.getElementById("hud-tracking-container");

// Initialize Canvas Size
function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    drawMap();
}

window.addEventListener("resize", resizeCanvas);

// Setup view centering on Spawn (0,0)
function resetView() {
    zoom = 0.03;
    offsetX = canvas.width / 2;
    offsetY = canvas.height / 2;
    drawMap();
}

// Convert global block coords to Canvas pixel coords
function toPixel(x, z) {
    const px = offsetX + x * zoom;
    const py = offsetY + z * zoom;
    return { x: px, y: py };
}

// Convert Canvas pixel coords to global block coords
function toBlock(px, py) {
    const x = Math.round((px - offsetX) / zoom);
    const z = Math.round((py - offsetY) / zoom);
    return { x, z };
}

// Draw Grid Lines, Rings, Axes, and Markers (Minimalist Theme)
function drawMap() {
    // Clear screen to pure white
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    const gridSpacing = zoom > 0.05 ? 1000 : 5000;
    const startX = Math.floor(toBlock(0, 0).x / gridSpacing) * gridSpacing;
    const endX = Math.ceil(toBlock(canvas.width, 0).x / gridSpacing) * gridSpacing;
    const startZ = Math.floor(toBlock(0, 0).z / gridSpacing) * gridSpacing;
    const endZ = Math.ceil(toBlock(0, canvas.height).z / gridSpacing) * gridSpacing;

    ctx.strokeStyle = "#E5E5E5";
    ctx.lineWidth = 1;
    ctx.font = "11px monospace";
    ctx.fillStyle = "#666666";

    // Vertical grid lines
    for (let x = startX; x <= endX; x += gridSpacing) {
        const p1 = toPixel(x, startZ);
        ctx.beginPath();
        ctx.moveTo(p1.x, 0);
        ctx.lineTo(p1.x, canvas.height);
        ctx.stroke();
        
        if (x !== 0) {
            ctx.fillText(`${x}X`, p1.x + 5, 15);
        }
    }

    // Horizontal grid lines
    for (let z = startZ; z <= endZ; z += gridSpacing) {
        const p1 = toPixel(startX, z);
        ctx.beginPath();
        ctx.moveTo(0, p1.y);
        ctx.lineTo(canvas.width, p1.y);
        ctx.stroke();

        if (z !== 0) {
            ctx.fillText(`${z}Z`, 5, p1.y - 5);
        }
    }

    // Main Axes (Solid black)
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.5;
    const centerPix = toPixel(0, 0);
    
    // Z-axis
    ctx.beginPath();
    ctx.moveTo(0, centerPix.y);
    ctx.lineTo(canvas.width, centerPix.y);
    ctx.stroke();
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(centerPix.x, 0);
    ctx.lineTo(centerPix.x, canvas.height);
    ctx.stroke();

    // Concentric rings (thicker solid ones for 2000m and 5000m)
    for (let radius of [2000, 5000, 10000, 15000, 20000]) {
        const pRad = radius * zoom;
        ctx.beginPath();
        
        if (radius === 2000 || radius === 5000) {
            ctx.lineWidth = 2.0;
            ctx.strokeStyle = "#888888";
            ctx.setLineDash([]);
        } else {
            ctx.lineWidth = 0.8;
            ctx.strokeStyle = "#CCCCCC";
            ctx.setLineDash([2, 4]);
        }
        
        ctx.arc(centerPix.x, centerPix.y, pRad, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw precise organic noise overlay map (Drawn UNDER the field bounding boxes!)
    if (noiseOverlay.complete) {
        const topLeft = toPixel(-2000, -2000);
        const w = 4000 * zoom;
        const h = 4000 * zoom;
        ctx.drawImage(noiseOverlay, topLeft.x, topLeft.y, w, h);
    }

    // Draw Spawn Point (Simple green dot)
    ctx.fillStyle = "#008000";
    ctx.beginPath();
    ctx.arc(centerPix.x, centerPix.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerPix.x, centerPix.y, 7, 0, Math.PI * 2);
    ctx.stroke();

    // Draw all 698 Tulip Fields markers
    fieldsData.forEach(field => {
        const p = toPixel(field.x, field.z);
        
        if (p.x < -200 || p.x > canvas.width + 200 || p.y < -200 || p.y > canvas.height + 200) {
            return;
        }

        // Draw dynamic organic shape of the patch up to 20,000 blocks in real-time!
        if (field.pts && field.pts.length > 0) {
            // Glowing transparent pink color
            ctx.fillStyle = "rgba(255, 64, 129, 0.4)";
            
            // Grid cell size is 8x8 blocks, so diameter is 8 blocks (radius is 4 blocks)
            // Scale the drawing radius, ensuring at least 1.2px size so they remain visible when zoomed out
            const ptRadius = Math.max(1.2, 4.5 * zoom);
            
            for (let k = 0; k < field.pts.length; k += 2) {
                const ox = field.pts[k] * 8;
                const oz = field.pts[k+1] * 8;
                const ptPix = toPixel(field.x + ox, field.z + oz);
                
                ctx.beginPath();
                ctx.arc(ptPix.x, ptPix.y, ptRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const isHovered = field.id === activeFieldId;

        // Bounding box dimensions on screen (generous 10px minimum for easy clicks)
        const w = Math.max(10, field.wx * zoom);
        const h = Math.max(10, field.wz * zoom);
        
        // Fill box: completely transparent by default, very light transparent red ONLY when hovered!
        ctx.fillStyle = isHovered ? "rgba(255, 0, 0, 0.15)" : "rgba(0, 0, 0, 0.0)";
        ctx.fillRect(p.x - w / 2, p.y - h / 2, w, h);

        // Bounding box outline: light-gray dashed border when not hovered, bold solid red when hovered
        ctx.strokeStyle = isHovered ? "#FF0000" : "rgba(0, 0, 0, 0.15)";
        ctx.lineWidth = isHovered ? 2.0 : 1.0;
        ctx.setLineDash(isHovered ? [] : [2, 2]);
        ctx.strokeRect(p.x - w / 2, p.y - h / 2, w, h);
        ctx.setLineDash([]);

        // Small black center dot marker
        ctx.fillStyle = isHovered ? "#FF0000" : "rgba(0, 0, 0, 0.3)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, isHovered ? 3 : 1.5, 0, Math.PI * 2);
        ctx.fill();

        // On hover, display coords, spawn probability, and expected tulip purity
        if (isHovered) {
            ctx.fillStyle = "#000000";
            ctx.font = "bold 11px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";

            // Calculate approximate chunks covered by the field's bounding box
            // Bugfix: Enforce at least 1 chunk in both directions if the width is 0 due to grid sample lines
            const chunksX = Math.max(1, Math.ceil(field.wx / 16));
            const chunksZ = Math.max(1, Math.ceil(field.wz / 16));
            const N = chunksX * chunksZ;
            
            // Spawn probability in any random world seed: P = 1 - (31/32)^N
            const spawnProb = (1 - Math.pow(31/32, N)) * 100;
            
            // Expected tulip purity (based on noise intensity relative to the -0.8 threshold)
            const purity = field.noise < -0.9 ? 100.0 : Math.max(75.0, 100.0 + (field.noise - (-0.8)) * 250);

            // Valid Y range display
            const yRangeText = (field.minY !== -1 && field.maxY !== -1) ? ` | Y: ${field.minY}-${field.maxY}` : " | Y: None";

            ctx.fillText(`Coords: ${field.x}, ${field.z}${yRangeText}`, p.x, p.y - h / 2 - 28);
            ctx.fillText(`Spawn Prob: ${spawnProb.toFixed(1)}% (${N} chunks)`, p.x, p.y - h / 2 - 16);
            ctx.fillText(`Expected Purity: ${purity.toFixed(1)}%`, p.x, p.y - h / 2 - 4);
        }
    });

    // Draw Player Track marker
    if (playerPos) {
        const p = toPixel(playerPos.x, playerPos.z);
        
        ctx.fillStyle = "#008000";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
        ctx.stroke();

        // Connect player to the 3 closest patches with prominent dashed lines pointing to the exact closest blocks!
        const sorted = [...fieldsData].map(field => {
            const closestX = Math.round(Math.max(field.x - field.wx/2, Math.min(field.x + field.wx/2, playerPos.x)));
            const closestZ = Math.round(Math.max(field.z - field.wz/2, Math.min(field.z + field.wz/2, playerPos.z)));
            const dist = Math.round(Math.hypot(closestX - playerPos.x, closestZ - playerPos.z));
            return { ...field, closestX, closestZ, dist };
        }).sort((a, b) => a.dist - b.dist);

        for (let i = 0; i < Math.min(3, sorted.length); i++) {
            const field = sorted[i];
            const pField = toPixel(field.closestX, field.closestZ); // Point to exact closest block!
            
            // Visual weight hierarchy: closer = thicker, darker, and more prominent dashed line!
            let opacity, lineWidth;
            if (i === 0) {
                lineWidth = 2.8;
                opacity = 0.85;
            } else if (i === 1) {
                lineWidth = 1.8;
                opacity = 0.55;
            } else {
                lineWidth = 1.0;
                opacity = 0.30;
            }
            
            ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
            ctx.lineWidth = lineWidth;
            ctx.setLineDash([4, 4]); // Clean 4px dashed lines
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(pField.x, pField.y);
            ctx.stroke();
        }
        ctx.setLineDash([]); // Reset
    }
}

// Find field under mouse position with a generous padding for easy hovering
function getFieldAtPosition(mouseX, mouseY) {
    const blockCoords = toBlock(mouseX, mouseY);
    
    // Generous padding (at least 15 blocks in game space, or 15 pixels on screen)
    const paddingVal = Math.max(15, 15 / zoom);
    
    let matchedField = null;
    fieldsData.forEach(field => {
        const hWidth = (field.wx / 2) + paddingVal;
        const hHeight = (field.wz / 2) + paddingVal;
        if (blockCoords.x >= field.x - hWidth && blockCoords.x <= field.x + hWidth &&
            blockCoords.z >= field.z - hHeight && blockCoords.z <= field.z + hHeight) {
            matchedField = field;
        }
    });
    return matchedField;
}

// Event Listeners for Panning & Zooming
container.addEventListener("mousedown", (e) => {
    isDragging = true;
    dragMoveCount = 0;
    startDragX = e.clientX - offsetX;
    startDragY = e.clientY - offsetY;
});

window.addEventListener("mouseup", (e) => {
    isDragging = false;
    
    if (dragMoveCount < 5) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const clickedField = getFieldAtPosition(mouseX, mouseY);
        if (clickedField) {
            const coordText = `${clickedField.x} ${clickedField.z}`;
            navigator.clipboard.writeText(coordText).then(() => {
                hudTrackingLabel.textContent = "COPIED TO CLIPBOARD";
                hudTrackingVal.textContent = coordText;
                hudTrackingContainer.classList.add("active");
                
                activeFieldId = clickedField.id;
                drawMap();
            }).catch(err => {
                console.error("Could not copy text: ", err);
            });
        }
    }
});

container.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDragging) {
        dragMoveCount++;
        offsetX = e.clientX - startDragX;
        offsetY = e.clientY - startDragY;
        drawMap();
    }

    const blockCoords = toBlock(mouseX, mouseY);
    hudCoords.textContent = `X: ${blockCoords.x}, Z: ${blockCoords.z}`;

    const hoveredField = getFieldAtPosition(mouseX, mouseY);

    if (hoveredField) {
        if (activeFieldId !== hoveredField.id) {
            activeFieldId = hoveredField.id;
            canvas.style.cursor = "pointer";
            drawMap();
        }
    } else if (activeFieldId !== null && !isDragging) {
        activeFieldId = null;
        canvas.style.cursor = "default";
        drawMap();
    }
});

// Zoom via scroll wheel
container.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const beforeZoomBlock = toBlock(mouseX, mouseY);

    if (e.deltaY < 0) {
        zoom = Math.min(2.0, zoom * 1.15);
    } else {
        zoom = Math.max(0.001, zoom / 1.15);
    }

    offsetX = mouseX - beforeZoomBlock.x * zoom;
    offsetY = mouseY - beforeZoomBlock.z * zoom;

    drawMap();
});

// Controls
document.getElementById("zoom-in").addEventListener("click", () => {
    zoom = Math.min(2.0, zoom * 1.25);
    drawMap();
});

document.getElementById("zoom-out").addEventListener("click", () => {
    zoom = Math.max(0.001, zoom / 1.25);
    drawMap();
});

document.getElementById("reset-view").addEventListener("click", resetView);

// Player Track
document.getElementById("track-btn").addEventListener("click", () => {
    const xInput = document.getElementById("player-x").value;
    const zInput = document.getElementById("player-z").value;

    if (xInput === "" || zInput === "") return;

    playerPos = {
        x: parseInt(xInput),
        z: parseInt(zInput)
    };

    updateClosestPatchesUI();
    drawMap();
});

// Auto-adjust zoom level and view offset to fit player and the closest 3 patches inside the viewport
function fitViewToPlayerAndPatches(closestPatches) {
    if (!playerPos || closestPatches.length === 0) return;

    let minX = playerPos.x;
    let maxX = playerPos.x;
    let minZ = playerPos.z;
    let maxZ = playerPos.z;

    closestPatches.forEach(p => {
        minX = Math.min(minX, p.closestX);
        maxX = Math.max(maxX, p.closestX);
        minZ = Math.min(minZ, p.closestZ);
        maxZ = Math.max(maxZ, p.closestZ);
    });

    const width = maxX - minX;
    const height = maxZ - minZ;

    // Generous padding (120px) to ensure coordinate labels and HUD overlays fit comfortably without overlap
    const padding = 120;
    const maxFitWidth = canvas.width - padding * 2;
    const maxFitHeight = canvas.height - padding * 2;

    const requiredZoomX = maxFitWidth / Math.max(20, width);
    const requiredZoomZ = maxFitHeight / Math.max(20, height);

    let targetZoom = Math.min(requiredZoomX, requiredZoomZ);
    
    // Clamp the auto-zoom to a comfortable reading range
    targetZoom = Math.max(0.003, Math.min(0.2, targetZoom));

    zoom = targetZoom;
    offsetX = canvas.width / 2 - ((minX + maxX) / 2) * zoom;
    offsetY = canvas.height / 2 - ((minZ + maxZ) / 2) * zoom;
}

// Dynamic closest patches visual output inside the sidebar
function updateClosestPatchesUI() {
    if (!playerPos) return;

    const container = document.getElementById("closest-patches-container");
    const section = document.getElementById("closest-patches-section");
    if (!container || !section) return;

    // Calculate distance to closest block inside the bounding box for all fields
    const sorted = [...fieldsData].map(field => {
        // Clamp player coordinates to the Snug Bounding Box edges of the field to find closest possible block
        const closestX = Math.round(Math.max(field.x - field.wx/2, Math.min(field.x + field.wx/2, playerPos.x)));
        const closestZ = Math.round(Math.max(field.z - field.wz/2, Math.min(field.z + field.wz/2, playerPos.z)));
        const dist = Math.round(Math.hypot(closestX - playerPos.x, closestZ - playerPos.z));
        return { ...field, closestX, closestZ, dist };
    }).sort((a, b) => a.dist - b.dist);

    // Auto-adjust viewport layout to fit the player and top 3 closest patches perfectly!
    fitViewToPlayerAndPatches(sorted.slice(0, 3));

    container.innerHTML = "";
    
    // Output top 3 closest fields in huge text
    sorted.slice(0, 3).forEach((field, index) => {
        const purity = field.noise < -0.9 ? 100.0 : Math.max(75.0, 100.0 + (field.noise - (-0.8)) * 250);
        const yRangeText = (field.minY !== -1 && field.maxY !== -1) ? `${field.minY}-${field.maxY}` : "None";

        // Calculate direction and angle to closest patch from current player position
        const dx = field.closestX - playerPos.x;
        const dz = field.closestZ - playerPos.z;
        let angle = Math.atan2(-dx, dz) * 180 / Math.PI;
        let normAngle = angle < 0 ? angle + 360 : angle;
        
        const dirs = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];
        const directionAbbr = dirs[Math.round(normAngle / 45) % 8];
        const angleText = normAngle.toFixed(2);

        const card = document.createElement("div");
        card.className = "patch-result-card";
        
        // Add single-click copy capability directly to the sidebar card (without moving playerPos!)
        card.addEventListener("click", () => {
            const coordText = `${field.closestX} ${field.closestZ}`;
            navigator.clipboard.writeText(coordText).then(() => {
                hudTrackingLabel.textContent = "COPIED TO CLIPBOARD";
                hudTrackingVal.textContent = coordText;
                hudTrackingContainer.classList.add("active");
                activeFieldId = field.id; // Highlight this field visually on the map
                drawMap();
            });
        });

        card.innerHTML = `
            <div class="patch-result-coords">${field.closestX}, ${field.closestZ}</div>
            <div class="patch-result-meta">
                <strong>${field.dist}</strong> blocks away<br>
                Valid Y: <code>${yRangeText}</code> | Purity: <code>${purity.toFixed(0)}%</code><br>
                ${field.dist > 0 ? `Direction: <strong>${directionAbbr}</strong> (<code>${angleText}°</code>)` : `<strong>You are here!</strong>`}
            </div>
        `;
        container.appendChild(card);
    });

    section.classList.remove("hidden");
}

// Global Paste Listener for F3+C Minecraft Coordinate Parsing
window.addEventListener("paste", (e) => {
    const pastedText = (e.clipboardData || window.clipboardData).getData("text");
    if (!pastedText) return;

    // Matches standard '/execute ... run tp @s X Y Z' or simple '/tp @s X Y Z' or standalone coords
    const regex = /(?:run tp @s|tp @s)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/i;
    const match = pastedText.match(regex);
    
    if (match) {
        const x = Math.round(parseFloat(match[1]));
        const z = Math.round(parseFloat(match[3])); // Z is the 3rd coordinate (Y is the 2nd)
        
        playerPos = { x, z };
        
        // Update input fields for visual feedback
        const xInput = document.getElementById("player-x");
        const zInput = document.getElementById("player-z");
        if (xInput) xInput.value = x;
        if (zInput) zInput.value = z;

        // Center map view on player
        offsetX = canvas.width / 2 - playerPos.x * zoom;
        offsetY = canvas.height / 2 - playerPos.z * zoom;

        // Show feedback toast in HUD
        hudTrackingLabel.textContent = "TRACKED VIA F3+C CLIPBOARD";
        hudTrackingVal.textContent = `${x} ${z}`;
        hudTrackingContainer.classList.add("active");
        
        updateClosestPatchesUI();
        drawMap();
    }
});

// App Startup
resizeCanvas();
resetView();
console.log("Minimalist Tulip Map loaded.");
