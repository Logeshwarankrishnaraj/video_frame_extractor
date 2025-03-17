document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const videoUpload = document.getElementById('video-upload');
  const videoContainer = document.getElementById('video-container');
  const videoPlayer = document.getElementById('video-player');
  const captureBtn = document.getElementById('capture-btn');
  const captureMultipleBtn = document.getElementById('capture-multiple-btn');
  const multipleFramesControls = document.getElementById('multiple-frames-controls');
  const frameCount = document.getElementById('frame-count');
  const startMultipleCapture = document.getElementById('start-multiple-capture');
  const canvas = document.getElementById('canvas');
  const framesContainer = document.getElementById('frames-container');
  const framesGrid = document.getElementById('frames-grid');
  
  // Upload area drag and drop functionality
  const uploadArea = document.querySelector('.upload-area');
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    uploadArea.addEventListener(eventName, highlight, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, unhighlight, false);
  });
  
  function highlight() {
    uploadArea.classList.add('highlight');
  }
  
  function unhighlight() {
    uploadArea.classList.remove('highlight');
  }
  
  uploadArea.addEventListener('drop', handleDrop, false);
  
  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0 && files[0].type.startsWith('video/')) {
      videoUpload.files = files;
      handleVideoUpload();
    }
  }
  
  // Handle video upload
  videoUpload.addEventListener('change', handleVideoUpload);
  
  function handleVideoUpload() {
    const file = videoUpload.files[0];
    
    if (file && file.type.startsWith('video/')) {
      const videoURL = URL.createObjectURL(file);
      videoPlayer.src = videoURL;
      
      // Show video container and reset frames
      videoContainer.classList.remove('hidden');
      framesGrid.innerHTML = '';
      framesContainer.classList.add('hidden');
      
      // Enable capture buttons when video is loaded
      videoPlayer.onloadedmetadata = () => {
        captureBtn.disabled = false;
        captureMultipleBtn.disabled = false;
      };
    }
  }
  
  // Capture single frame
  captureBtn.addEventListener('click', () => {
    if (videoPlayer.paused || videoPlayer.ended) {
      alert('Please play the video first');
      return;
    }
    
    captureCurrentFrame();
  });
  
  // Multiple frames capture controls
  captureMultipleBtn.addEventListener('click', () => {
    multipleFramesControls.classList.toggle('hidden');
  });
  
  startMultipleCapture.addEventListener('click', () => {
    const count = parseInt(frameCount.value);
    
    if (isNaN(count) || count < 2 || count > 50) {
      alert('Please enter a valid number of frames (2-50)');
      return;
    }
    
    captureMultipleFrames(count);
  });
  
  function captureCurrentFrame() {
    // Set canvas dimensions to match video's actual dimensions
    canvas.width = videoPlayer.videoWidth;
    canvas.height = videoPlayer.videoHeight;
    
    // Draw current frame on canvas with high quality
    const ctx = canvas.getContext('2d');
    // Clear the canvas first to ensure clean drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Use high quality image rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(videoPlayer, 0, 0, canvas.width, canvas.height);
    
    // Convert to image with high quality
    // Use image/jpeg with high quality for videos with natural scenes
    // Use image/png for videos with text, graphics, or transparency
    const imageType = detectOptimalImageFormat(videoPlayer);
    const imageQuality = imageType === 'image/jpeg' ? 1.0 : undefined; // 1.0 is highest quality for JPEG
    const imageDataURL = canvas.toDataURL(imageType, imageQuality);
    
    // Create frame element
    const frameElement = createFrameElement(imageDataURL, videoPlayer.currentTime, imageType);
    
    // Add to frames grid
    framesGrid.appendChild(frameElement);
    framesContainer.classList.remove('hidden');
  }
  
  function captureMultipleFrames(count) {
    // Disable buttons during capture
    captureBtn.disabled = true;
    captureMultipleBtn.disabled = true;
    startMultipleCapture.disabled = true;
    
    // Clear existing frames if any
    framesGrid.innerHTML = '';
    framesContainer.classList.remove('hidden');
    
    // Calculate intervals
    const duration = videoPlayer.duration;
    const interval = duration / (count + 1);
    
    // Detect optimal image format once for all frames
    const imageType = detectOptimalImageFormat(videoPlayer);
    const imageQuality = imageType === 'image/jpeg' ? 1.0 : undefined;
    
    // Start capturing
    let currentFrame = 1;
    
    function captureNextFrame() {
      // Set video to the next timestamp
      videoPlayer.currentTime = interval * currentFrame;
      
      videoPlayer.onseeked = () => {
        // Set canvas dimensions to match video's actual dimensions
        canvas.width = videoPlayer.videoWidth;
        canvas.height = videoPlayer.videoHeight;
        
        // Draw frame on canvas with high quality
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(videoPlayer, 0, 0, canvas.width, canvas.height);
        
        // Convert to image with high quality
        const imageDataURL = canvas.toDataURL(imageType, imageQuality);
        
        // Create frame element
        const frameElement = createFrameElement(imageDataURL, videoPlayer.currentTime, imageType);
        
        // Add to frames grid
        framesGrid.appendChild(frameElement);
        
        // Move to next frame or finish
        currentFrame++;
        
        if (currentFrame <= count) {
          captureNextFrame();
        } else {
          // Re-enable buttons
          captureBtn.disabled = false;
          captureMultipleBtn.disabled = false;
          startMultipleCapture.disabled = false;
          videoPlayer.onseeked = null;
        }
      };
    }
    
    captureNextFrame();
  }
  
  function detectOptimalImageFormat(videoElement) {
    // This is a simple heuristic - we could make this more sophisticated
    // For now, use JPEG for most videos (better for photos, natural scenes)
    // and PNG for videos that might have transparency or sharp text/graphics
    
    // If the video is small or has a high aspect ratio, it might be animation or graphics
    const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
    const isSmallVideo = videoElement.videoWidth < 500 || videoElement.videoHeight < 500;
    const isExtremeAspectRatio = aspectRatio > 3 || aspectRatio < 0.33;
    
    // Check video type if available
    const videoType = videoElement.src.split('.').pop().toLowerCase();
    const possibleAnimationFormats = ['webm', 'gif', 'mp4']; // mp4 can be animation too
    
    if (isSmallVideo || isExtremeAspectRatio || 
        (videoType && possibleAnimationFormats.includes(videoType))) {
      return 'image/png'; // Better for graphics, text, and transparency
    }
    
    return 'image/jpeg'; // Better for natural scenes, photos
  }
  
  function createFrameElement(imageDataURL, timestamp, imageType) {
    // Format timestamp
    const formattedTime = formatTime(timestamp);
    
    // Determine file extension based on image type
    const fileExtension = imageType === 'image/png' ? 'png' : 'jpg';
    
    // Create elements
    const frameItem = document.createElement('div');
    frameItem.className = 'frame-item';
    
    const img = document.createElement('img');
    img.src = imageDataURL;
    img.className = 'frame-img';
    img.alt = `Frame at ${formattedTime}`;
    
    const info = document.createElement('div');
    info.className = 'frame-info';
    info.textContent = `Time: ${formattedTime}`;
    
    const actions = document.createElement('div');
    actions.className = 'frame-actions';
    
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-btn';
    downloadBtn.textContent = 'Download';
    downloadBtn.addEventListener('click', () => {
      // Create download link
      const link = document.createElement('a');
      link.href = imageDataURL;
      link.download = `frame_${formattedTime.replace(/:/g, '-')}.${fileExtension}`;
      link.click();
    });
    
    // Add resolution info
    const resolutionInfo = document.createElement('div');
    resolutionInfo.className = 'resolution-info';
    
    // Extract dimensions from the image
    const tempImg = new Image();
    tempImg.src = imageDataURL;
    tempImg.onload = () => {
      resolutionInfo.textContent = `${tempImg.width} × ${tempImg.height}`;
    };
    
    // Assemble frame item
    actions.appendChild(downloadBtn);
    frameItem.appendChild(img);
    frameItem.appendChild(info);
    frameItem.appendChild(resolutionInfo);
    frameItem.appendChild(actions);
    
    return frameItem;
  }
  
  function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
});