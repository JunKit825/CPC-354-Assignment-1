/* This code is to do control the rendering, shader conenction and the transition operation. It is the main Animation controller .js file */

/*-----------------------------------------------------------------------------------*/
// Variable Declaration
/*-----------------------------------------------------------------------------------*/

// Common variables
var canvas, gl, program;
var posBuffer, colBuffer, vPosition, vColor;
var modelViewMatrixLoc, projectionMatrixLoc;
var modelViewMatrix, projectionMatrix;

// Variables referencing HTML elements
// theta = [x, y, z]
var startBtn,
  restartBtn,
  operationButton,
  selectedOperation = [],
  operationQueue = [],
  currentOpIndex = 0;
var theta = [0, 0, 0],
  move = [0, 0, 0];
var iterNum = 1,
  scaleNum = 1;
var iterTemp = 1,
  animSeq = 0,
  animFrame = 0,
  animFlag = false;
  delay = 100;
var speedMultiplier = 1; // multiplier applied to per-frame increments (controlled by speed slider)
var logo = "Logo3D.obj";

var iterationSlider, iterationValue, depthSlider, depthValue, speedSlider, speedValue;

var textSize = 2, depth = 0.1, layerNum = 30, timerID = null;

// Variables for the 3D Sierpinski gasket
var points = [],
  colors = [];

// Vertices for the 3D Sierpinski gasket (X-axis, Y-axis, Z-axis, W)
// For 3D, you need to set the z-axis to create the perception of depth

// Different colors for a tetrahedron (RGBA)
var baseColors = [
  vec4(1.0, 0.2, 0.4, 1.0),
  vec4(0.0, 0.9, 1.0, 1.0),
  vec4(0.2, 0.2, 0.5, 1.0),
];

/*-----------------------------------------------------------------------------------*/
// WebGL Utilities
/*-----------------------------------------------------------------------------------*/

// Execute the init() function when the web page has fully loaded
window.onload = function init() {
  
  canvas = document.getElementById("gl-canvas");

  // set initial canvas to 80% of window size
  canvas.width = window.innerWidth * 0.8;
  canvas.height = window.innerHeight * 0.8;
  
  // Primitive (geometric shape/logo) initialization
  loadLogo(logo);

  // WebGL setups
  getUIElement();

  // window resize listener
  window.addEventListener("resize", onWindowResize);


  initFont("Font/static/ScienceGothic_Condensed-ExtraBold.ttf");
};

// function will be called whenever there is a window resize
function onWindowResize() {
  // scale the canvas to 80% of window size
  canvas.width = window.innerWidth * 0.8;
  canvas.height = window.innerHeight * 0.8;

  // update the WebGL viewport so that it matches the new canvas size
  gl.viewport(0, 0, canvas.width, canvas.height);

  // recalculate the projection matrix with the new canvas ratio
  projectionMatrix = ortho(-4, 4, -2.25, 2.25, 2, -2);
  gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

  // render current frame again to adjust it so that it fits the new canvas size
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  modelViewMatrix = mat4();
  modelViewMatrix = mult(modelViewMatrix, translate(0, -0.2357, 0));
  modelViewMatrix = mult(modelViewMatrix, rotateY(theta[2]));
  modelViewMatrix = mult(modelViewMatrix, scale(scaleNum, scaleNum, 1));
  modelViewMatrix = mult(modelViewMatrix, translate(move[0], move[1], move[2]));
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
  gl.drawArrays(gl.TRIANGLES, 0, points.length);
}


// function to reset all the animation whenever there is any changes in the control panel
function resetAndRecompute() {
  if (animFlag) window.cancelAnimationFrame(animFrame);

  animReset = true;
  resetValue();  // reset all the values

  // get the latest selected operations
  const selectedDiv = document.getElementById("selected-op");
  selectedOperation = Array.from(selectedDiv.querySelectorAll("div")).map(c => c.textContent);
  queueOperation();

  // recompute points, colors and render
  recompute();

  animReset = false;

  if (animFlag) animUpdate();  // restart animation if it is running
}

// Retrieve all elements from HTML and store in the corresponding variables, onclick thing will put here, although not sure why
function getUIElement() {
  canvas = document.getElementById("gl-canvas");

  startBtn = document.getElementById("start-btn");
  restartBtn = document.getElementById("restart-btn");

  operationButton = document.getElementById("selected-op");

  // set default transitions
  const defaultTransitions = ["RotationR", "RotationL", "ZoomIn"];

  // initialize dropdown checkboxes with default transitions
  document.querySelectorAll('.dropdown-content input[type="checkbox"]').forEach(box => {
    // If the checkbox value is in defaults, check it visually
    if (defaultTransitions.includes(box.value)) {
      box.checked = true;
    }

    // a listener for each checkbox to update selected operation
    box.addEventListener('change', () => {
      const selectedDiv = document.getElementById("selected-op");

      // remove the item if it exists in the selected operation but the checkbox is unchecked
      const existingItem = selectedDiv.querySelector(`[data-value="${box.value}"]`);
      if (!box.checked && existingItem) {
        existingItem.remove();
      }

      // if new operation is checked but not yet added in the existing operation, add it
      if (box.checked && !existingItem) {
        const div = document.createElement("div");
        div.setAttribute("data-value", box.value);
        div.innerText = box.value;
        selectedDiv.appendChild(div);
      }

      // reset animation whenever checkbox changes
      resetAndRecompute();
    });
  });

  // On page load, populate selectedOperation with default checked items
  const selectedDiv = document.getElementById("selected-op");
  selectedDiv.innerHTML = ""; // clear any previous content
  document.querySelectorAll('.dropdown-content input[type="checkbox"]:checked').forEach(box => {
    const div = document.createElement("div");
    div.setAttribute("data-value", box.value);
    div.innerText = box.value;
    selectedDiv.appendChild(div);
  });


  // Activate when click on the start button
  startBtn.onclick = function () {
    animFlag = !animFlag;

    if (animFlag) {
      // Get the selected operations from the div
      if (!selectedOperation || selectedOperation.length === 0) {
        const selectedDiv = document.getElementById("selected-op");
        selectedOperation = Array.from(selectedDiv.querySelectorAll("div")).map(
          (child) => child.textContent
        );

        let checkbox = document.getElementById("option");

        console.log("Selected operations:", selectedOperation); // shows the actual values
        queueOperation();
        console.log(operationQueue);
      }
      disableUI()
      animUpdate();
    } else {
      window.cancelAnimationFrame(animFrame);
      enableUI();
    }
  };

  // keydown for spacebar to start or pause the animation
  window.addEventListener("keydown", function(event) {
    // avoid trigger it when typing in input fields
    if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") return;

    if (event.code === "Space") {
      event.preventDefault();
      startBtn.onclick();
    }
  });

  // Activate when click on restart button
  restartBtn.onclick = function () {
    animReset = true;

    if (animReset) {
      render();
      // window.cancelAnimationFrame(animiFrame)

      // animUpdate();
      resetValue();
      animReset = false;
    }
  };

  // Activate when iteration slider change value. and get value
  iterationSlider = document.getElementById("iteration-slider");
  iterationValue = document.getElementById("iteration-value");
  iterationValue.innerHTML = iterationSlider.value;

  iterationSlider.onchange = function(event) {
    iterationValue.innerHTML = event.target.value;
    iterNum = iterationValue.innerHTML;
    resetAndRecompute();
  }

  // Activate when depth slider change value and get value
  depthSlider = document.getElementById("depth-slider");
  depthValue = document.getElementById("depth-value");
  depthValue.innerHTML = depthSlider.value;

  depthSlider.onchange = function(event) {
    depthValue.innerHTML = event.target.value;
    depth = depthValue.innerHTML/10;
    resetAndRecompute();
  }

  // Activate when depth slider change value. and get value
  speedSlider = document.getElementById("speed-slider");
  speedValue = document.getElementById("speed-value");
  speedValue.innerHTML = speedSlider.value;

  speedSlider.oninput = function(event) {
    speedValue.innerHTML = event.target.value;
    // Use the slider value as a multiplier for per-frame steps.
    speedMultiplier = Number(event.target.value);
    resetAndRecompute();
  }

  // if there is any changes in the checkbox in the dropdown, reset the animation
  document.querySelectorAll('.dropdown-content input[type="checkbox"]').forEach(box => {
    box.addEventListener('change', resetAndRecompute);
  });

  const colorList = document.getElementById('color-list');

  //create a mutation observer to see the changes of the color list
  const observer = new MutationObserver(() => { 
    resetAndRecompute();
  });

  // start to observe the changes in the color list
  observer.observe(colorList, { 
    childList: true // observe addition or removal of the color
  });

}

// Configure WebGL Settings, do not touch this!!!!! Touch at your own risk
function configWebGL() {
  // Initialize the WebGL context
  gl = WebGLUtils.setupWebGL(canvas);

  if (!gl) {
    alert("WebGL isn't available");
  }

  // Set the viewport and clear the color
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  // Enable hidden-surface removal
  gl.enable(gl.DEPTH_TEST);

  // Compile the vertex and fragment shaders and link to WebGL
  program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  // Create buffers and link them to the corresponding attribute variables in vertex and fragment shaders
  // Buffer for positions
  posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

  vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  // Buffer for colors
  colBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

  vColor = gl.getAttribLocation(program, "vColor");
  gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vColor);

  // Get the location of the uniform variables within a compiled shader program
  modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
  projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
}

// Render the graphics for viewing
function render() {

  // Cancel the animation frame before performing any graphic rendering
  if (animFlag) {
    animFlag = false;
    window.cancelAnimationFrame(animFrame);
  }

  setTimeout(function() {
    // Clear the color buffer and the depth buffer before rendering a new frame
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Pass a 4x4 projection matrix from JavaScript to the GPU for use in shader
    // ortho(left, right, bottom, top, near, far)
    projectionMatrix = ortho(-4, 4, -2.25, 2.25, 2, -2);
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    // Pass a 4x4 model view matrix from JavaScript to the GPU for use in shader
    // Use translation to readjust the position of the primitive (if needed)
    modelViewMatrix = mat4();
    modelViewMatrix = mult(modelViewMatrix, translate(0, -0.2357, 0));

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    // Draw the primitive / geometric shape
    gl.drawArrays(gl.TRIANGLES, 0, points.length);
  },delay);
}

// Recompute points and colors, followed by reconfiguring WebGL for rendering
function recompute() {
  // Reset points and colors for render update
  points = [];
  colors = [];

  loadLogo(logo);
  configWebGL();
  render();
}

// Up here is the original animation
// Update the animation frame, operation all done here
function animUpdate() {
  // If no operations selected, do nothing
  if (!operationQueue || operationQueue.length === 0) {
      window.cancelAnimationFrame(animFrame);
      enableUI();
      animFlag = false;
      return; // nothing to animate
  }

  // Clear the color buffer and the depth buffer before rendering a new frame
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Set the model view matrix for vertex transformation
  // Use translation to readjust the position of the primitive (if needed)
  modelViewMatrix = mat4();
  modelViewMatrix = mult(modelViewMatrix, translate(0, -0.2357, 0));

  // Switch case to handle the ongoing animation sequence
  // The animation is executed sequentially from case 0 to case n

  if ((currentOpIndex < operationQueue.length) || (iterTemp < iterNum)) {
    animSeq = operationQueue[currentOpIndex];

    switch (animSeq) {
      case 0: // Animation 1
        theta[2] -= 1 * speedMultiplier;

        if (theta[2] <= -180) {
          theta[2] = -180;
          currentOpIndex++;
        }

        break;

      case 1: // Animation 2
        theta[2] += 1 * speedMultiplier;

        if (theta[2] >= 0) {
          theta[2] = 0;
          currentOpIndex++;
        }

        break;

      case 2: // Animation 3
        theta[2] += 1 * speedMultiplier;

        if (theta[2] >= 180) {
          theta[2] = 180;
          currentOpIndex++;
        }

        break;

      case 3: // Animation 4
        theta[2] -= 1 * speedMultiplier;

        if (theta[2] <= 0) {
          theta[2] = 0;
          currentOpIndex++;
        }

        break;

      case 4: // Animation 5
        scaleNum += 0.02 * speedMultiplier;

        if (scaleNum >= 2.3) {
          scaleNum = 2.3;
          currentOpIndex++;
        }

        break;

      case 5: // Animation 6
        scaleNum -= 0.02 * speedMultiplier;

        if (scaleNum <= 1.8) {
          scaleNum = 1.8;
          currentOpIndex++;
        }

        delay /= 10.0;

        break;

      case 6: // Animation 7
        scaleNum += 0.02 * speedMultiplier;

        if (scaleNum >= 2.2) {
          scaleNum = 2.2;
          currentOpIndex++;
        }

        delay /= 15.0;

        break;

      case 7: // Animation 8
        scaleNum -= 0.02 * speedMultiplier;

        if (scaleNum <= 1.9) {
          scaleNum = 1.9;
          currentOpIndex++;
        }

        delay /= 20.0;

        break;

      case 8: // Animation 9
        scaleNum += 0.02 * speedMultiplier;

        if (scaleNum >= 2) {
          scaleNum = 2;
          currentOpIndex++;
        }

        delay /= 25.0;

        break;

      case 9: // Animation 10
        scaleNum -= 0.02 * speedMultiplier;

        if (scaleNum <= 0.5) {
          scaleNum = 0.5;
          currentOpIndex++;
        }

        break;

      case 10: // Animation 11
        scaleNum += 0.02 * speedMultiplier;

        if (scaleNum >= 1.2) {
          scaleNum = 1.2;
          currentOpIndex++;
        }

        delay /= 10.0;

        break;

      case 11: // Animation 12
        scaleNum -= 0.02 * speedMultiplier

        if (scaleNum<=0.8) {
          scaleNum = 0.8;
          currentOpIndex++;
        }

        delay /= 15.0;

        break;

      case 12: // Animation 13
        scaleNum += 0.02 * speedMultiplier;

        if (scaleNum >= 1.1) {
          scaleNum = 1.1;
          currentOpIndex++;
        }

        delay /= 20.0;

        break;

      case 13: // Animation 14
        scaleNum -= 0.02 * speedMultiplier

        if (scaleNum<=1) {
          scaleNum = 1;
          currentOpIndex++;
        }

        delay /= 25.0;

        break;

      case 14: // Animation 15
        move[0] += 0.0125 * speedMultiplier;
        move[1] += 0.005 * speedMultiplier;

        if (move[0] >= 2.5 / scaleNum && move[1] >= 1.0 / scaleNum) {
          move[0] = 2.5 / scaleNum;
          move[1] = 1.0 / scaleNum;
          currentOpIndex++;
        }
        break;

      case 15: // Animation 16
        move[0] -= 0.0125 * speedMultiplier;
        move[1] -= 0.005 * speedMultiplier;

        if (move[0] <= 0 && move[1] <= 0) {
          move[0] = 0;
          move[1] = 0;
          currentOpIndex++;
        }
        break;

      case 16: // Animation 17
        move[0] -= 0.0125 * speedMultiplier;
        move[1] -= 0.005 * speedMultiplier;

        if (move[0] <= -2.5 / scaleNum && move[1] <= -1.0 / scaleNum) {
          move[0] = -2.5 / scaleNum;
          move[1] = -1.0 / scaleNum;
          currentOpIndex++;
        }
        break;

      case 17: // Animation 18
        move[0] += 0.0125 * speedMultiplier;
        move[1] += 0.005 * speedMultiplier;

        if (move[0] >= 0 && move[1] >= 0) {
          move[0] = 0;
          move[1] = 0;
          currentOpIndex++;
        }
        break;

      case 18: // Animation 19
        move[0] -= 0.0125 * speedMultiplier;
        move[1] += 0.005 * speedMultiplier;

        if (move[0] <= -2.5 / scaleNum && move[1] >= 1.0 / scaleNum) {
          move[0] = -2.5 / scaleNum;
          move[1] = 1.0 / scaleNum;
          currentOpIndex++;
        }
        break;

      case 19: // Animation 20
        move[0] += 0.0125 * speedMultiplier;
        move[1] -= 0.005 * speedMultiplier;

        if (move[0] >= 0 && move[1] <= 0) {
          move[0] = 0;
          move[1] = 0;
          currentOpIndex++;
        }
        break;

      case 20: // Animation 21
        move[0] += 0.0125 * speedMultiplier;
        move[1] -= 0.005 * speedMultiplier;

        if (move[0] >= 2.5 / scaleNum && move[1] <= -1.0 / scaleNum) {
          move[0] = 2.5 / scaleNum;
          move[1] = -1.0 / scaleNum;
          currentOpIndex++;
        }
        break;

      case 21: // Animation 22
        move[0] -= 0.0125 * speedMultiplier;
        move[1] += 0.005 * speedMultiplier;

        if (move[0] <= 0 && move[1] >= 0) {
          move[0] = 0;
          move[1] = 0;
          currentOpIndex++;
        }
        break;


      default: 

        iterTemp++;
        resetAnimation();
        break;
    } 
  } 
  else { // if animation sequence set by user is completed, let the object "move about"
    enableUI();
    const floatSpeed = 0.003;
    move[0] += floatSpeed * Math.sin(Date.now() * 0.002);
    move[1] += floatSpeed * Math.cos(Date.now() * 0.002);
  }

  // Perform vertex transformation
  modelViewMatrix = mult(modelViewMatrix, translate(move[0], move[1], move[2])); // translation will perform first because if we perform scale first, it will affect the transition distance and end up will let the object out of the canvas
  modelViewMatrix = mult(modelViewMatrix, scale(scaleNum, scaleNum, 1));
  modelViewMatrix = mult(modelViewMatrix, rotateY(theta[2]));

  // Pass the matrix to the GPU for use in shader
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

  // Draw the primitive / geometric shape
  gl.drawArrays(gl.TRIANGLES, 0, points.length);

  console.log ("Here lei how much iterTemp", iterTemp);
  // Schedule the next frame for a looped animation (60fps)
  animFrame = window.requestAnimationFrame(animUpdate);
}

// disable all UI elements when the animation is on going
function disableUI() {

  document.getElementById("restart-btn").disabled = true;
  document.querySelector(".add-transition-button").disabled = true;
  document.getElementById("selected-transition").disabled = true;

  document.getElementById("iteration-slider").disabled = true;
  document.getElementById("depth-slider").disabled = true;
  document.getElementById("speed-slider").disabled = true;

  document.getElementById("color-picker").disabled = true;

  document.querySelector(".dropdown > button").disabled = true;

  document.querySelectorAll('#options input[type="checkbox"]').forEach(cb => cb.disabled = true);

  document.querySelectorAll('.addTask-button input[type="checkbox"]').forEach(cb => cb.disabled = true);

  document.querySelectorAll('.delete-btn').forEach(btn => btn.disabled = true);
}

// enable all UI elements when the animation is pause or stop
function enableUI() {

  document.getElementById("restart-btn").disabled = false;
  document.querySelector(".add-transition-button").disabled = false;
  document.getElementById("selected-transition").disabled = false;

  document.getElementById("iteration-slider").disabled = false;
  document.getElementById("depth-slider").disabled = false;
  document.getElementById("speed-slider").disabled = false;

  document.getElementById("color-picker").disabled = false;

  document.querySelector(".dropdown > button").disabled = false;

  document.querySelectorAll('#options input[type="checkbox"]').forEach(cb => cb.disabled = false);

  document.querySelectorAll('.addTask-button input[type="checkbox"]').forEach(cb => cb.disabled = false);

  document.querySelectorAll('.delete-btn').forEach(btn => btn.disabled = false);
}

// Reset all necessary variables to their default values
function resetValue() {
  theta = [0, 0, 0];
  move = [0, 0, 0];
  scaleNum = 1;
  animSeq = 0;
  iterTemp = 1;
  selectedOperation = [];
  operationQueue = [];
  currentOpIndex = 0;
  delay = 100;
}

// Reset for animation variables after one iteration
function resetAnimation() {
  theta = [0, 0, 0];
  move = [0, 0, 0];
  scaleNum = 1;
  currentOpIndex = 0;
  delay = 0;
}

// Queue operation, basically just read the operation and assign operation code (can see in function animUpdate())
function queueOperation() {
  for (const i of selectedOperation) {
    if (i == "RotationR") {
      operationQueue.push(0);
      operationQueue.push(1);
    } else if (i == "RotationL") {
      operationQueue.push(2);
      operationQueue.push(3);
    } else if (i == "ZoomIn") {
      operationQueue.push(4);
      operationQueue.push(5);
      operationQueue.push(6);
      operationQueue.push(7);
      operationQueue.push(8);
    } else if (i == "ZoomOut") {
      operationQueue.push(9);
      operationQueue.push(10);
      operationQueue.push(11);
      operationQueue.push(12);
      operationQueue.push(13);
    } else if (i == "BouncingTR") {
      operationQueue.push(14);
      operationQueue.push(15);
    } else if (i == "BouncingBL") {
      operationQueue.push(16);
      operationQueue.push(17);
    }
    else if (i == "BouncingTL") {
      operationQueue.push(18);
      operationQueue.push(19);
    } else if (i == "BouncingBR") {
      operationQueue.push(20);
      operationQueue.push(21);
    }
  }
}

// To change color, maximum 3 color and if more than 3 will loop back. Delete button can control the color as well
function getColor(event) {

    let color = hex2rgb(event.target.value);

    // CLEAR previous data
    if (baseColors.length >= 3) {
      baseColors = [];
      points = [];
      colors = [];
    }

    baseColors.push(color);
    let showColor = document.querySelector('#color-list');
    showColor.innerHTML = ""; // clear existing items

    for (let i = 0; i < baseColors.length; i++) {
      let colorValue = rgbToHex(baseColors[i]); // capture the color for this iteration

      let vec = baseColors[i];
      let list = document.createElement("li");
      list.textContent = colorValue; // show the color value

      let button = document.createElement("button");
      button.className = 'delete-btn';
      button.textContent = "Delete";

      button.addEventListener("click", () => {
        // Remove from DOM
        list.remove();

        // Remove from baseColors using value, safer than using i
        const index = baseColors.indexOf(vec);
        if (index > -1) baseColors.splice(index, 1);

        // Clear old points/colors before reloading
        points = [];
        colors = [];

        if (baseColors.length === 0) {
          baseColors = [
            vec4(1.0, 0.2, 0.4, 1.0),
            vec4(0.0, 0.9, 1.0, 1.0),
            vec4(0.2, 0.2, 0.5, 1.0),
          ];
        }

        // Reload the logo with updated colors
        loadLogo(logo);

        console.log("baseColors after delete:", baseColors);
      });

      list.appendChild(button);
      showColor.appendChild(list);
  }

  // Only call loadLogo once after creating all list items
  points = [];
  colors = [];
  loadLogo(logo);
}

// Convert hex color value to rgb
function hex2rgb(hex) {

  const opacity = 1.0;

  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  
  // return {r, g, b} 
  return vec4(r, g, b, opacity);
}

// Convert hex rgb value to hex here
function componentToHex(c) {
  const hex = Math.round(c * 255).toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

// Pass one element by one element to the convertion function
function rgbToHex(vec) {
  return "#" + componentToHex(vec[0]) + componentToHex(vec[1]) + componentToHex(vec[2]);
}

// This replace loadLogo
let currentFont = null;

// 1. Call this once in your init() to load the font file
function initFont(fontUrl) {
    opentype.load(fontUrl, function(err, font) {
        if (err) {
            console.error('Font could not be loaded: ' + err);
        } else {
            currentFont = font;
            // Load default text once font is ready
            updateTextGeometry("YSQD"); 
        }
    });
}

// 2. Call this whenever the user inputs new text
// 1. UPDATED: Helper to parse font commands into "Solid" and "Hole" data
function convertPathToContours(path) {
    const contours = [];
    let currentContour = [];

    path.commands.forEach(cmd => {
        if (cmd.type === 'M') { // Move to = start new contour
            if (currentContour.length > 0) {
                contours.push(currentContour);
            }
            currentContour = [{ x: cmd.x, y: -cmd.y }];
        }
        else if (cmd.type === 'L') { // Line
            currentContour.push({ x: cmd.x, y: -cmd.y });
        }
        else if (cmd.type === 'Q') { // Quadratic - simplified as line
            currentContour.push({ x: cmd.x, y: -cmd.y });
        }
        else if (cmd.type === 'C') { // Cubic - simplified as line
            currentContour.push({ x: cmd.x, y: -cmd.y });
        }
        else if (cmd.type === 'Z') { // Close path
            // do nothing, contour ends
        }
    });

    if (currentContour.length > 0)
        contours.push(currentContour);

    return contours;
}

// an event listener for the textbox if user press enter key after finish key in the logo text
const userInput = document.getElementById("userText");
userInput.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    loadLogo(); // load new logo text based on user input
    resetAndRecompute();// reset animation once new input is given
  }
});
// 3. NEW HELPER: Calculates if a shape is CW or CCW (Solid or Hole)
function getSignedArea(contour) {
    let area = 0;
    for (let i = 0; i < contour.length; i++) {
        let j = (i + 1) % contour.length;
        area += (contour[j].x - contour[i].x) * (contour[j].y + contour[i].y);
    }
    return area;
}

// 2. UPDATED: Main generation function with ROBUST Hole detection
function updateTextGeometry(textString) {
    if (!currentFont) return;

    points = []; 
    colors = [];

    // --- Z-Depth Setup ---
    let zLayers = [];
    let startZ = depth / 2;
    // Safety check for layerNum
    let step = layerNum > 1 ? depth / (layerNum - 1) : 0; 
    for (let i = 0; i < layerNum; i++) zLayers.push(startZ - (i * step));

    const charPaths = currentFont.getPaths(textString, 0, 0, textSize/2);

    charPaths.forEach(path => {
        const contours = convertPathToContours(path);
        if (contours.length === 0) return;

        // --- NEW HOLE LOGIC ---
        // We separate contours into "Shapes" and "Holes" based on their Area.
        // Usually: Solid = Negative Area (because of y-flip), Hole = Positive Area.
        
        // 1. Group contours by solid/hole
        // We assume the largest contour is a Solid to establish the baseline sign.
        let solids = [];
        let holes = [];
        
        // Sort by size so we find the main body first
        contours.sort((a, b) => Math.abs(getSignedArea(b)) - Math.abs(getSignedArea(a)));

        // The biggest one is definitely a solid
        let solidSign = Math.sign(getSignedArea(contours[0]));
        
        contours.forEach(contour => {
            let area = getSignedArea(contour);
            if (Math.sign(area) === solidSign) {
                solids.push(contour);
            } else {
                holes.push(contour);
            }
        });

        // 2. Process each Solid (and apply relevant holes)
        // Note: For simple text, we can usually dump all holes into the current solid.
        // A robust engine would check which hole is inside which solid, 
        // but for standard fonts, assigning all holes to the main solid works 99% of the time.
        
        solids.forEach(solid => {
            let flatPoints = [];
            let holeIndices = [];
            let currentIndex = 0;

            // Add the Solid
            solid.forEach(p => {
                flatPoints.push(p.x, p.y);
                currentIndex += 2;
            });

            // Add ALL holes (simple approach)
            holes.forEach(hole => {
                holeIndices.push(currentIndex / 2);
                hole.forEach(p => {
                    flatPoints.push(p.x, p.y);
                    currentIndex += 2;
                });
            });

            // Triangulate
            const indices = earcut(flatPoints, holeIndices);

            // Build 3D Mesh
            for (let i = 0; i < indices.length; i += 3) {
                const idxA = indices[i];
                const idxB = indices[i + 1];
                const idxC = indices[i + 2];

                const ax = flatPoints[idxA * 2]; const ay = flatPoints[idxA * 2 + 1];
                const bx = flatPoints[idxB * 2]; const by = flatPoints[idxB * 2 + 1];
                const cx = flatPoints[idxC * 2]; const cy = flatPoints[idxC * 2 + 1];

                for (let k = 0; k < layerNum; k++) {
                    let z = zLayers[k];
                    points.push(vec4(ax, ay, z, 1.0));
                    points.push(vec4(bx, by, z, 1.0));
                    points.push(vec4(cx, cy, z, 1.0));

                    for (let c = 0; c < 3; c++) {
                        let colorIndex = (points.length + c) % baseColors.length;
                        colors.push(baseColors[colorIndex]);
                    }
                }
            }
        });
    });

    centerVertices(points);
    configWebGL();
    render(false); 
}

function loadLogo() {
  const text = document.getElementById('userText').value;
  updateTextGeometry(text);
}

function centerVertices(points) {
  if (points.length === 0) return;

  // 1. Initialize min/max with the first point's coordinates
  let minX = points[0][0];
  let maxX = points[0][0];
  let minY = points[0][1];
  let maxY = points[0][1];

  // 2. Find the bounding box (min and max X/Y)
  for (let i = 1; i < points.length; i++) {
    let x = points[i][0];
    let y = points[i][1];

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  // 3. Calculate the center of the text
  let centerX = (minX + maxX) / 2;
  let centerY = (minY + maxY) / 2;

  // 4. Shift all points so the center becomes (0,0)
  for (let i = 0; i < points.length; i++) {
    points[i][0] -= centerX;
    points[i][1] -= centerY;
  }
}

/*-----------------------------------------------------------------------------------*/