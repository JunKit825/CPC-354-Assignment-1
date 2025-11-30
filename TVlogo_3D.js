/* This code is to do control the rendering, shader conenction and the transition operation. It is the main Animation controller .js file */

//-----------------------------------------------------------------------------------/
// Variable Declaration
//-----------------------------------------------------------------------------------/

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
  currentOpIndex = 0,
  theta = [0, 0, 0],
  move = [0, 0, 0],
  iterNum = 1,
  scaleNum = 1,
  iterTemp = 1,
  animSeq = 0,
  animFrame = 0,
  animFlag = false,

  // Flag to distinguish a fresh start from a pause/resume
  isNewRun = true,
  delay = 100,
  speedMultiplier = 1, // multiplier applied to per-frame increments (controlled by speed slider)
  logo = "Logo3D.obj",
  iterationSlider,
  iterationValue,
  depthSlider,
  depthValue,
  speedSlider,
  speedValue,
  textSize = 2,
  depth = 0.1,
  layerNum = 30,
  timerID = null,
  points = [],
  colors = [];

// Vertices for the 3D Sierpinski gasket (X-axis, Y-axis, Z-axis, W)
// For 3D, you need to set the z-axis to create the perception of depth

// Different colors for a tetrahedron (RGBA)
var baseColors = [
  vec4(1.0, 0.2, 0.4, 1.0),
  vec4(0.0, 0.9, 1.0, 1.0),
  vec4(0.2, 0.2, 0.5, 1.0),
];

//-----------------------------------------------------------------------------------
// WebGL Utilities
//-----------------------------------------------------------------------------------

// Execute the init() function when the web page has fully loaded
window.onload = function init() {
  
  // Get canvas from the html
  canvas = document.getElementById("gl-canvas");

  // scale canvas width to 60% of window width and maintain 16:9 canvas ratio
  canvas.width = window.innerWidth * 0.6;
  canvas.height = canvas.width * 9 / 16; 
  
  // Primitive (geometric shape/logo) initialization
  // loadLogo(logo);

  // WebGL setups
  getUIElement();

  // Window resize listener
  window.addEventListener("resize", windowResize);

  // Load the font for the logo
  initFont("Font/static/ScienceGothic_Condensed-ExtraBold.ttf");
};

// Function will be called whenever there is a window resize
function windowResize() {

  // scale canvas width to 60% of window width and maintain 16:9 canvas ratio
  canvas.width = window.innerWidth * 0.6;

  canvas.height = canvas.width * 9 / 16; 

  // update the WebGL viewport so that it matches the new canvas size
  gl.viewport(0, 0, canvas.width, canvas.height);

  // render current frame again to adjust it so that it fits the new canvas size
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  modelViewMatrix = mat4();
  modelViewMatrix = mult(modelViewMatrix, translate(0, -0.2357, 0));
  modelViewMatrix = mult(modelViewMatrix, translate(move[0], move[1], move[2])); // we will apply translation before scaling because if scaling is applied first, it will also scale the translation values and cause the object to move too far and go out of the canvas
  modelViewMatrix = mult(modelViewMatrix, scale(scaleNum, scaleNum, 1));
  modelViewMatrix = mult(modelViewMatrix, rotateY(theta[2]));

  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
  gl.drawArrays(gl.TRIANGLES, 0, points.length);
}

// Retrieve all elements from HTML and store in the corresponding variables, onclick thing will put here
function getUIElement() {

  // Get element from the HTML
  canvas = document.getElementById("gl-canvas");
  startBtn = document.getElementById("start-btn");
  restartBtn = document.getElementById("restart-btn");
  operationButton = document.getElementById("selected-op");

  // Set default transitions
  const defaultTransitions = ["RotationR", "RotationL", "ZoomIn"];

  // Initialize dropdown checkboxes with default transitions
  document.querySelectorAll('.dropdown-content input[type="checkbox"]').forEach(box => {

    // If the checkbox value is in defaults, check it visually
    if (defaultTransitions.includes(box.value)) {
      box.checked = true;
    }

    // Add to selected-op if checked initially
    if (box.checked) {
      const selectedDiv = document.getElementById("selected-op");

      const newdiv = document.createElement("div"); // Create a new <div> for each checked operation
      newdiv.setAttribute("data-value", box.value); // Add attribute "data-value" for easier tracking
      newdiv.innerText = box.value;  // Set the text
      selectedDiv.appendChild(newdiv); // Add the new div to selected operation
    }

    // A listener for each checkbox to update selected operation
    box.addEventListener('change', () => {

      const selectedDiv = document.getElementById("selected-op");

      // Remove the item if it exists in the selected operation but the checkbox is unchecked
      const existingItem = selectedDiv.querySelector(`[data-value="${box.value}"]`);
      if (!box.checked && existingItem) { // If the box is unchecked and the item exists in the selected operation, remove it
        existingItem.remove();
      }

      // If new operation is checked but not yet added in the existing operation, add it
      if (box.checked && !existingItem) { // If the box is checked and the item does not exist in the selected operation, add it
        const newdiv = document.createElement("div");
        newdiv.setAttribute("data-value", box.value);
        newdiv.innerText = box.value;
        selectedDiv.appendChild(newdiv);
      }
    });
  });

  // Activate when click on the start button
  startBtn.onclick = function () {

    // Flip the logic for rendering or stop rendering the graphics
    animFlag = !animFlag;

    // Run if animFlag is set to true, the scene will be drawn
    if (animFlag) {

      // If this is a fresh start (not a resume), reset and build the queue.
      if (isNewRun) {
        resetValue(); // Reset variable to their default values

      // Get the selected operations from the div, choose the clicked one
      const selectedDiv = document.getElementById("selected-op");
      selectedOperation = Array.from(selectedDiv.querySelectorAll("div")).map(
        (child) => child.textContent
      );

        // Build the operation queue for this run
        queueOperation();
      }

      // Disable the other UI when the animation is showing
      disableUI();

      // Start or resume the animation
      animUpdate();

      // Mark that subsequent starts will be a resume until a restart/reset happens
      isNewRun = false;

    // Run if the animFlag is set to false
    } else {

      // Cancel the animation frame
      window.cancelAnimationFrame(animFrame);

      // Allow the UI to be clicked
      enableUI();
    }
  };

  // Keydown for spacebar to start or pause the animation
  window.addEventListener("keydown", function(event) {

    // Avoid trigger it when typing in the new text logo
    if (event.target.id === "userText") return;

    if (event.code === "Space") { // Spacebar as the key to start/pause
      event.preventDefault(); // Prevent page scrolling as it is the default behavior for spacebar
      startBtn.onclick(); // Trigger the same function as clicking the start button
    }
  });

  // Activate when click on restart button
  restartBtn.onclick = function () {
    render();
    resetValue();
    enableUI();
    // Mark next start as a fresh run
    isNewRun = true;
    animReset = false;
  };

  // Activate when iteration slider change value. and get value
  iterationSlider = document.getElementById("iteration-slider");
  iterationValue = document.getElementById("iteration-value");
  iterationValue.innerHTML = iterationSlider.value;

  iterationSlider.oninput = function(event) { // a listener for the iteration slider
    iterationValue.innerHTML = event.target.value; // update the value shown in HTML
    iterNum = iterationValue.innerHTML;
    // Reset and recompute whenever slider changes
    resetValue(); 
    recompute();
  }

  // Activate when depth slider change value and get value
  depthSlider = document.getElementById("depth-slider");
  depthValue = document.getElementById("depth-value");
  depthValue.innerHTML = depthSlider.value;

  depthSlider.oninput = function(event) { // a listener for the depth slider
    depthValue.innerHTML = event.target.value;
    depth = depthValue.innerHTML/10;
    // Reset and recompute whenever slider changes
    resetValue(); 
    recompute();
  }

  // Activate when depth slider change value. and get value
  speedSlider = document.getElementById("speed-slider");
  speedValue = document.getElementById("speed-value");
  speedValue.innerHTML = speedSlider.value;

  speedSlider.oninput = function(event) { // a listener for the speed slider
    speedValue.innerHTML = event.target.value;
    // Use the slider value as a multiplier for per-frame steps.
    speedMultiplier = Number(event.target.value);
    // Reset and recompute whenever slider changes
    resetValue(); 
    recompute();
  }

  const colorList = document.getElementById('color-list');

  //create a mutation observer to see the changes of the color list
  const observer = new MutationObserver(() => { 
    // Reset and recompute whenever color changes
    resetValue(); 
    recompute();
  });

  // start to observe the changes in the color list
  observer.observe(colorList, { 
    childList: true // observe addition or removal of the color
  });

}

// Configure WebGL Settings
function configWebGL() {
  // Initialize the WebGL context
  gl = WebGLUtils.setupWebGL(canvas);

  if (!gl) {
    alert("WebGL isn't available");
  }

  // Set the viewport and clear the color
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.05, 0.05, 0.05, 1.0);

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

// Update the animation frame, operation all done here
function animUpdate() {
  // If no operations selected, do nothing

  window.cancelAnimationFrame(animFrame);

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
      case 0: // Animation 1, to rotate right
        delay = 100;
        theta[2] -= 1 * speedMultiplier;

        if (theta[2] <= -180) {
          theta[2] = -180;
          currentOpIndex++;
        }

        break;

      case 1: // Animation 2, back to original position
        delay = 100;
        theta[2] += 1 * speedMultiplier;

        if (theta[2] >= 0) {
          theta[2] = 0;
          currentOpIndex++;
        }

        break;

      case 2: // Animation 3, to rotate left
        delay = 100;
        theta[2] += 1 * speedMultiplier;

        if (theta[2] >= 180) {
          theta[2] = 180;
          currentOpIndex++;
        }

        break;

      case 3: // Animation 4, back to original position
        delay = 100;
        theta[2] -= 1 * speedMultiplier;

        if (theta[2] <= 0) {
          theta[2] = 0;
          currentOpIndex++;
        }

        break;

      case 4: // Animation 5, for bouncing zoom in effect
        delay = 100;
        scaleNum += 0.02 * speedMultiplier;

        if (scaleNum >= 2.4) {
          scaleNum = 2.4;
          currentOpIndex++;
        }

        break;

      case 5: // Animation 6, for bouncing zoom in effect
        delay = 100;
        scaleNum -= 0.02 * speedMultiplier;

        if (scaleNum <= 1.7) {
          scaleNum = 1.7;
          currentOpIndex++;
        }

        delay /= 10.0;

        break;

      case 6: // Animation 7, for bouncing zoom in effect
        delay = 100;
        scaleNum += 0.02 * speedMultiplier;

        if (scaleNum >= 2.1) {
          scaleNum = 2.1;
          currentOpIndex++;
        }

        delay /= 15.0;

        break;

      case 7: // Animation 8, for bouncing zoom in effect
        delay = 100;
        scaleNum -= 0.02 * speedMultiplier;

        if (scaleNum <= 1.8) {
          scaleNum = 1.8;
          currentOpIndex++;
        }

        delay /= 20.0;

        break;

      case 8: // Animation 9, for bouncing zoom in effect
        delay = 100;
        scaleNum += 0.02 * speedMultiplier;

        if (scaleNum >= 1.9) {
          scaleNum = 1.9;
          currentOpIndex++;
        }

        delay /= 25.0;

        break;

      case 9: // Animation 10, for bouncing zoom out effect
        delay = 100;
        scaleNum -= 0.02 * speedMultiplier;

        if (scaleNum <= 0.5) {
          scaleNum = 0.5;
          currentOpIndex++;
        }

        break;

      case 10: // Animation 11, for bouncing zoom out effect
        delay = 100;
        scaleNum += 0.02 * speedMultiplier;

        if (scaleNum >= 1.2) {
          scaleNum = 1.2;
          currentOpIndex++;
        }

        delay /= 10.0;

        break;

      case 11: // Animation 12, for bouncing zoom out effect
        delay = 100;
        scaleNum -= 0.02 * speedMultiplier

        if (scaleNum<=0.8) {
          scaleNum = 0.8;
          currentOpIndex++;
        }

        delay /= 15.0;

        break;

      case 12: // Animation 13, for bouncing zoom out effect
        delay = 100;
        scaleNum += 0.02 * speedMultiplier;

        if (scaleNum >= 1.1) {
          scaleNum = 1.1;
          currentOpIndex++;
        }

        delay /= 20.0;

        break;

      case 13: // Animation 14, for bouncing zoom out effect
        delay = 100;
        scaleNum -= 0.02 * speedMultiplier

        if (scaleNum<=1) {
          scaleNum = 1;
          currentOpIndex++;
        }

        delay /= 25.0;

        break;

      case 14: // Animation 15, move top-right
        delay = 100;
        move[0] += 0.0125 * speedMultiplier;
        move[1] += 0.005 * speedMultiplier;

        if (move[0] >= 2.25 / scaleNum && move[1] >= 0.9 / scaleNum) {
          move[0] = 2.25 / scaleNum;
          move[1] = 0.9 / scaleNum;
          currentOpIndex++;
        }
        break;

      case 15: // Animation 16, back to center
        delay = 100;
        move[0] -= 0.0125 * speedMultiplier;
        move[1] -= 0.005 * speedMultiplier;

        if (move[0] <= 0 && move[1] <= 0) {
          move[0] = 0;
          move[1] = 0;
          currentOpIndex++;
        }
        break;

      case 16: // Animation 17, move bottom-left
        delay = 100;
        move[0] -= 0.0125 * speedMultiplier;
        move[1] -= 0.005 * speedMultiplier;

        if (move[0] <= -2.25 / scaleNum && move[1] <= -0.9 / scaleNum) {
          move[0] = -2.25 / scaleNum;
          move[1] = -0.9 / scaleNum;
          currentOpIndex++;
        }
        break;

      case 17: // Animation 18, back to center
        delay = 100;
        move[0] += 0.0125 * speedMultiplier;
        move[1] += 0.005 * speedMultiplier;

        if (move[0] >= 0 && move[1] >= 0) {
          move[0] = 0;
          move[1] = 0;
          currentOpIndex++;
        }
        break;

      case 18: // Animation 19, move top-left
        delay = 100;
        move[0] -= 0.0125 * speedMultiplier;
        move[1] += 0.005 * speedMultiplier;

        if (move[0] <= -2.25 / scaleNum && move[1] >= 0.9 / scaleNum) {
          move[0] = -2.25 / scaleNum;
          move[1] = 0.9 / scaleNum;
          currentOpIndex++;
        }
        break;

      case 19: // Animation 20, back to center
        delay = 100;
        move[0] += 0.0125 * speedMultiplier;
        move[1] -= 0.005 * speedMultiplier;

        if (move[0] >= 0 && move[1] <= 0) {
          move[0] = 0;
          move[1] = 0;
          currentOpIndex++;
        }
        break;

      case 20: // Animation 21, move bottom-right
        delay = 100;
        move[0] += 0.0125 * speedMultiplier;
        move[1] -= 0.005 * speedMultiplier;

        if (move[0] >= 2.25 / scaleNum && move[1] <= -0.9 / scaleNum) {
          move[0] = 2.25 / scaleNum;
          move[1] = -0.9 / scaleNum;
          currentOpIndex++;
        }
        break;

      case 21: // Animation 22, back to center
        delay = 100;
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

  else { // If animation sequence set by user is completed, let the object "move about"
    enableUI();
    window.cancelAnimationFrame(animFrame);
    const floatDistance = 0.003;
    const floatSpeed = 0.002;

    // Floating motion
    move[0] += floatDistance * Math.sin(Date.now() * floatSpeed);
    move[1] += floatDistance * Math.cos(Date.now() * floatSpeed);

    // Recentering calculation
    const recenterStrength = 0.02; 
    move[0] -= move[0] * recenterStrength;
    move[1] -= move[1] * recenterStrength;

    animFlag = false;
    delay = 100;
    // Mark next start as a fresh run (animation fully finished)
    isNewRun = true;
}
  
  if (iterTemp >= iterNum) {
    window.cancelAnimationFrame(animFrame);
  }

  // Perform vertex transformation
  modelViewMatrix = mult(modelViewMatrix, translate(move[0], move[1], move[2])); // we will apply translation before scaling because if scaling is applied first, it will also scale the translation values and cause the object to move too far and go out of the canvas
  modelViewMatrix = mult(modelViewMatrix, scale(scaleNum, scaleNum, 1));
  modelViewMatrix = mult(modelViewMatrix, rotateY(theta[2]));

  // Pass the matrix to the GPU for use in shader
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

  // Draw the primitive / geometric shape
  gl.drawArrays(gl.TRIANGLES, 0, points.length);

  // Schedule the next frame for a looped animation (60fps)
  animFrame = window.requestAnimationFrame(animUpdate);
}

// Disable all UI elements when the animation is on going
function disableUI() {
  document.querySelector(".add-transition-button").classList.add("disabled"); // Add a new class to style the button when disabled
  document.getElementById("selected-transition").classList.add("disabled");
  document.getElementById("generate-btn").classList.add("disabled");
  document.querySelector(".dropdown-btn").classList.add("disabled");

  document.querySelector(".add-transition-button").disabled = true; // Disable the button
  document.getElementById("selected-transition").disabled = true;

  document.querySelector(".iteration-slider-class").classList.add("disabled"); // Add a new class to style the slider when disabled
  document.querySelector(".depth-slider-class").classList.add("disabled");
  document.querySelector(".speed-slider-class").classList.add("disabled");
  
  document.getElementById("iteration-slider").disabled = true; // Disable the slider
  document.getElementById("depth-slider").disabled = true;
  document.getElementById("speed-slider").disabled = true;

  document.getElementById("color-picker").disabled = true;

  document.getElementById("userText").disabled = true;
  document.getElementById("generate-btn").disabled = true;

  document.querySelector(".dropdown-btn").disabled = true;

  document.querySelectorAll('#options input[type="checkbox"]').forEach(box => box.disabled = true); // Disable the checkbox in the dropdown

  document.querySelectorAll('.addTask-button input[type="checkbox"]').forEach(box => box.disabled = true); // Disable the checkbox in the preset transition

  document.querySelectorAll('.delete-btn').forEach(btn => { // Disable delete button for the color
    btn.disabled = true;
    btn.classList.add("disabled");
  });

  document.querySelectorAll('.delete-text, .hide-show-text').forEach(textBtn => { // Disable interaction delete and hide/show text button
    textBtn.style.pointerEvents = "none"; 
    textBtn.style.opacity = "0.7";
  });

  document.querySelectorAll('.preset-transition').forEach(box => { // Disable interaction preset transition boxes
    box.style.pointerEvents = "none";     
    box.style.opacity = "0.7";          
  });
}

// Enable all UI elements when the animation is pause or stop
function enableUI() {
  document.querySelector(".add-transition-button").classList.remove("disabled"); // Remove the disabled class
  document.getElementById("selected-transition").classList.remove("disabled");
  document.getElementById("generate-btn").classList.remove("disabled");
  document.querySelector(".dropdown-btn").classList.remove("disabled");

  document.querySelector(".add-transition-button").disabled = false; // Enable the button
  document.getElementById("selected-transition").disabled = false;
  
  document.querySelector(".iteration-slider-class").classList.remove("disabled"); // Remove the disabled class
  document.querySelector(".depth-slider-class").classList.remove("disabled");
  document.querySelector(".speed-slider-class").classList.remove("disabled");
  
  document.getElementById("iteration-slider").disabled = false; // Enable the slider
  document.getElementById("depth-slider").disabled = false;
  document.getElementById("speed-slider").disabled = false;

  document.getElementById("color-picker").disabled = false;

  document.getElementById("userText").disabled = false;
  document.getElementById("generate-btn").disabled = false;

  document.querySelector(".dropdown-btn").disabled = false;

  document.querySelectorAll('#options input[type="checkbox"]').forEach(box => box.disabled = false); // Enable the checkbox in the dropdown

  document.querySelectorAll('.addTask-button input[type="checkbox"]').forEach(box => box.disabled = false); // Enable the checkbox in the preset transition

  document.querySelectorAll('.delete-btn').forEach(btn => { // Enable delete button for the color
    btn.disabled = false;
    btn.classList.remove("disabled");
  });

  document.querySelectorAll('.delete-text, .hide-show-text').forEach(textBtn => {  // Enable interaction delete and hide/show text button
    textBtn.style.pointerEvents = "auto";
    textBtn.style.opacity = "1";
  });

  document.querySelectorAll('.preset-transition').forEach(box => { // Enable interaction preset transition boxes
    box.style.pointerEvents = "auto";
    box.style.opacity = "1";
  });
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
  // Mark next start as a fresh run when resetting values
  isNewRun = true;
}

// Reset for animation variables after one iteration
function resetAnimation() {
  theta = [0, 0, 0];
  move = [0, 0, 0];
  scaleNum = 1;
  currentOpIndex = 0;
  delay = 100;
}

// Queue operation, basically just read the operation and assign operation code (animation will be run in animUpdate())
function queueOperation() {
  for (const i of selectedOperation) {
    if (i == "RotationR") {
      operationQueue.push(0);
      operationQueue.push(1);
    } else if (i == "RotationL") {
      operationQueue.push(2);
      operationQueue.push(3);
    } else if (i == "ZoomIn") { // the reason for having multiple operation here is to create a bouncing zoom in effect
      operationQueue.push(4);
      operationQueue.push(5);
      operationQueue.push(6);
      operationQueue.push(7);
      operationQueue.push(8);
    } else if (i == "ZoomOut") { // the reason for having multiple operation here is to create a bouncing zoom out effect
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
    } else if (i == "BouncingTL") {
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

  // Convert the format of the color
  let color = hex2rgb(event.target.value);

  // CLEAR previous data if more than 3 color is chosen
  if (baseColors.length >= 3) {
    baseColors = [];
    points = [];
    colors = [];
  }

  baseColors.push(color);
  let showColor = document.querySelector('#color-list');
  showColor.innerHTML = ""; // Clear existing items

  for (let i = 0; i < baseColors.length; i++) {

    // Capture the color for this iteration
    let colorValue = rgbToHex(baseColors[i]); 
    let vec = baseColors[i];
    let list = document.createElement("li");

    // Create color preview box
    let colorBox = document.createElement("div");
    colorBox.style.width = "20px";
    colorBox.style.height = "20px";
    colorBox.style.display = "inline-block";
    colorBox.style.marginRight = "10px";
    colorBox.style.border = "1px solid #000";
    colorBox.style.backgroundColor = colorValue;

    // Text label
    let label = document.createElement("span");
    label.textContent = colorValue;

    // Append UI elements
    list.appendChild(colorBox);
    list.appendChild(label);

    // Create delete button once a new color is added
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

      // Reset back the color once the color is all being deleted and is empty
      if (baseColors.length === 0) {
        baseColors = [
          vec4(1.0, 0.2, 0.4, 1.0),
          vec4(0.0, 0.9, 1.0, 1.0),
          vec4(0.2, 0.2, 0.5, 1.0),
        ];
      }

      // Reload the logo with updated colors
      loadLogo(logo);
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

// Call this once in init() to load the font file
function initFont(fontUrl) {

  // Using opentype library to get get the outline of the text according the font style
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

// Function to convert a font path (from opentype.js) into "contours"
// A contour is basically a closed loop of points, representing a solid shape or a hole in the glyph
function convertPathToContours(path) {

  // Array to hold all the contours found in the path
  const contours = [];

  // Array to hold the points of the current contour we're building
  let currentContour = [];

  // Loop through each command in the font path
  path.commands.forEach(cmd => {

    // Starts a new contour at a specific point
    if (cmd.type === 'M') {

      // If we already have points collected in currentContour, save it as a finished contour
      if (currentContour.length > 0) {
        contours.push(currentContour);
      }

      // Start a new contour with the starting point of this 'M' command
      // We flip the y-coordinate (-cmd.y) because font coordinates often have y going up
      currentContour = [{ x: cmd.x, y: -cmd.y }];
    }

    // A straight line to a new point
    else if (cmd.type === 'L') {
      currentContour.push({ x: cmd.x, y: -cmd.y });
    }

    // Simplifying quadratic curves as straight lines to the endpoint
    else if (cmd.type === 'Q') {
      currentContour.push({ x: cmd.x, y: -cmd.y });
    }
    
    // Simplified cubic survcs as a straight line to the endpoint
    else if (cmd.type === 'C') {
      currentContour.push({ x: cmd.x, y: -cmd.y });
    }

    // Indicates the end of the contour, no need to add points because the first point already closes it
    else if (cmd.type === 'Z') {
      // Nothing needed here
    }
  });

  // After the loop, if there are points in currentContour, save it as a contour
  if (currentContour.length > 0) {
    contours.push(currentContour);
  }

  // Return all the contours collected from the path
  return contours;
}


// Keydown for the user if user finish typing new text logo
const userInput = document.getElementById("userText");
userInput.addEventListener("keydown", function(event) {
  if (event.key === "Enter") { // Enter as the key to generate new text logo
    loadLogo(); // load new logo text based on user input
    resetValue(); // Reset and recompute once new input is given
    recompute(); 
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

    // Generate a Z values for each layer
    for (let i = 0; i < layerNum; i++) zLayers.push(startZ - (i * step));

    // Get all the font paths for each character in the text string, positioned at (0, 0) with size textSize/2
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
          // Add all points from the solid shape to flatPoints
          flatPoints.push(p.x, p.y);
          currentIndex += 2;
        });

        // Add ALL holes (simple approach)
        holes.forEach(hole => {
          // Record where this hole starts in the point array
          holeIndices.push(currentIndex / 2);
          hole.forEach(p => {
            // Add the hole's points to flatPoints
            flatPoints.push(p.x, p.y);
            currentIndex += 2;
          });
        });

        // Triangulate
        const indices = earcut(flatPoints, holeIndices);

        // Build 3D Mesh
        for (let i = 0; i < indices.length; i += 3) {
          // Get the three vertex indices for this triangle
          const idxA = indices[i];
          const idxB = indices[i + 1];
          const idxC = indices[i + 2];
          
          // extract x y coordinates for each vertex (*2 because each vertex has 2 coordinate x and y)
          const ax = flatPoints[idxA * 2]; const ay = flatPoints[idxA * 2 + 1];
          const bx = flatPoints[idxB * 2]; const by = flatPoints[idxB * 2 + 1];
          const cx = flatPoints[idxC * 2]; const cy = flatPoints[idxC * 2 + 1];

          for (let k = 0; k < layerNum; k++) {
            // Get z depth for this layer and push the triangle into this depth
            let z = zLayers[k];
            points.push(vec4(ax, ay, z, 1.0));
            points.push(vec4(bx, by, z, 1.0));
            points.push(vec4(cx, cy, z, 1.0));
            
            // Assign colors to the three vertices by cycling through a base color palette
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
    render(false); //Just render once
}

// Function to take user input to generate logo
function loadLogo() {
  const text = document.getElementById('userText').value;
  updateTextGeometry(text);
}

// Function to center the vertices
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
