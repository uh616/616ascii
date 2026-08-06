import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Save, Video, Image as ImageIcon, Clipboard, RotateCcw } from 'lucide-react';
import './App.css';
import { SYMBOL_SETS, imageToAsciiCanvas } from './utils/ascii';

type MediaType = 'none' | 'image' | 'video' | 'webcam';

function App() {
  const [mediaType, setMediaType] = useState<MediaType>('none');
  
  // Basic Settings
  const [width, setWidth] = useState<number>(100);
  const [scaleFactor, setScaleFactor] = useState<number>(1.0);
  const [fontSize, setFontSize] = useState<number>(10);
  const [symbolSet, setSymbolSet] = useState<string>('Extended');
  
  // Image Adjustments
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [hue, setHue] = useState<number>(0);
  const [grayscale, setGrayscale] = useState<number>(0);
  const [sepia, setSepia] = useState<number>(0);
  const [invert, setInvert] = useState<boolean>(false);
  
  // Advanced Processing
  const [thresholding, setThresholding] = useState<boolean>(false);
  const [thresholdValue, setThresholdValue] = useState<number>(128);
  const [edgeDetection, setEdgeDetection] = useState<boolean>(false);
  const [edgeIntensity, setEdgeIntensity] = useState<number>(1);
  const [sharpness, setSharpness] = useState<boolean>(false);
  const [sharpnessValue, setSharpnessValue] = useState<number>(5);
  const [spaceDensity, setSpaceDensity] = useState<number>(0);
  
  // Engine
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(new Image());
  const animationRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Core drawing function
  const drawFrame = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const options = {
      width, scaleFactor, invert, symbolSetName: symbolSet, randomizationPercentage: 0, fontSize,
      brightness, contrast, saturation, hue, grayscale, sepia,
      thresholding, thresholdValue, edgeDetection, edgeIntensity, sharpness, sharpnessValue, spaceDensity
    };

    if (mediaType === 'image' && imageRef.current.src) {
      imageToAsciiCanvas(ctx, imageRef.current, options);
    } else if ((mediaType === 'video' || mediaType === 'webcam') && videoRef.current) {
      if (videoRef.current.readyState >= 2) {
        imageToAsciiCanvas(ctx, videoRef.current, options);
      }
      animationRef.current = requestAnimationFrame(drawFrame);
    }
  };

  // Re-draw when settings change (for images mostly)
  useEffect(() => {
    if (mediaType === 'image' && imageLoaded) {
      drawFrame();
    }
  }, [
    width, scaleFactor, fontSize, symbolSet,
    brightness, contrast, saturation, hue, grayscale, sepia, invert,
    thresholding, thresholdValue, edgeDetection, edgeIntensity, sharpness, sharpnessValue, spaceDensity,
    mediaType, imageLoaded
  ]);

  // Handle Video / Webcam loop
  useEffect(() => {
    if (mediaType === 'video' || mediaType === 'webcam') {
      animationRef.current = requestAnimationFrame(drawFrame);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [
    mediaType, width, scaleFactor, fontSize, symbolSet,
    brightness, contrast, saturation, hue, grayscale, sepia, invert,
    thresholding, thresholdValue, edgeDetection, edgeIntensity, sharpness, sharpnessValue, spaceDensity
  ]);

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    if (file.type.startsWith('video/')) {
      stopWebcam();
      setMediaType('video');
      setImageLoaded(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.loop = true;
        videoRef.current.play();
      }
    } else if (file.type.startsWith('image/')) {
      stopWebcam();
      setMediaType('image');
      setImageLoaded(false);
      imageRef.current.src = url;
      imageRef.current.onload = () => {
        setImageLoaded(true);
      };
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setMediaType('webcam');
      if (videoRef.current) {
        videoRef.current.src = '';
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
      alert("Could not access webcam.");
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleSaveImage = async () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    // @ts-ignore
    if (window.electronAPI) {
      // @ts-ignore
      const result = await window.electronAPI.saveFile({
        title: 'Save ASCII Image',
        defaultPath: '616ascii-art.png',
        filters: [{ name: 'Images', extensions: ['png'] }]
      }, dataUrl);
      if (result.success) console.log('Saved image to', result.filePath);
    } else {
      const link = document.createElement('a');
      link.download = '616ascii-art.png';
      link.href = dataUrl;
      link.click();
    }
  };

  const handleCopyClipboard = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        alert("Image copied to clipboard!");
      });
    } catch (err) {
      console.error(err);
      alert("Failed to copy to clipboard.");
    }
  };

  const resetFilters = () => {
    setWidth(100);
    setScaleFactor(1.0);
    setFontSize(10);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setHue(0);
    setGrayscale(0);
    setSepia(0);
    setInvert(false);
    setThresholding(false);
    setThresholdValue(128);
    setEdgeDetection(false);
    setEdgeIntensity(1);
    setSharpness(false);
    setSharpnessValue(5);
    setSpaceDensity(0);
  };

  const handleSaveVideo = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsProcessingVideo(true);
    setVideoProgress(0);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    const wasPlaying = !video.paused;
    const wasLooping = video.loop;
    
    video.pause();
    video.loop = false;
    video.currentTime = 0;

    await new Promise<void>(resolve => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      video.addEventListener('seeked', onSeeked);
    });

    const stream = canvas.captureStream(60);
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        // @ts-ignore
        if (window.electronAPI) {
          // @ts-ignore
          const result = await window.electronAPI.saveFile({
            title: 'Save ASCII Video',
            defaultPath: '616ascii-video.webm',
            filters: [{ name: 'Videos', extensions: ['webm'] }]
          }, dataUrl);
          if (result.success) console.log('Saved video to', result.filePath);
        } else {
          const link = document.createElement('a');
          link.download = '616ascii-video.webm';
          link.href = dataUrl;
          link.click();
        }
        setIsProcessingVideo(false);
        setVideoProgress(0);
        
        video.loop = wasLooping;
        if (wasPlaying) video.play();
      };
      reader.readAsDataURL(blob);
    };

    video.onended = () => {
      mediaRecorder.stop();
      video.onended = null;
      video.ontimeupdate = null;
    };

    video.ontimeupdate = () => {
      if (video.duration) {
        setVideoProgress(Math.round((video.currentTime / video.duration) * 100));
      }
    };

    mediaRecorder.start();
    video.play();
  };

  const toggleRecording = () => {
    if (mediaType === 'video') {
      handleSaveVideo();
      return;
    }
    
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      if (!canvasRef.current) return;
      const stream = canvasRef.current.captureStream(30);
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
      recordedChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUrl = reader.result as string;
          // @ts-ignore
          if (window.electronAPI) {
            // @ts-ignore
            const result = await window.electronAPI.saveFile({
              title: 'Save ASCII Webcam',
              defaultPath: '616ascii-webcam.webm',
              filters: [{ name: 'Videos', extensions: ['webm'] }]
            }, dataUrl);
            if (result.success) console.log('Saved webcam to', result.filePath);
          } else {
            const link = document.createElement('a');
            link.download = '616ascii-webcam.webm';
            link.href = dataUrl;
            link.click();
          }
        };
        reader.readAsDataURL(blob);
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
    }
  };

  const toggleVideoPlayPause = () => {
    if (mediaType === 'video' && videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  return (
    <>
      <div className="bg-animation" />
      <div 
        className="app-container" 
        onDragOver={handleDragOver} 
        onDragLeave={handleDragLeave} 
        onDrop={handleDrop}
        style={{ border: isDragging ? '2px dashed var(--accent-color)' : 'none' }}
      >
        
        {/* Sidebar */}
        <div className="sidebar glass-panel">
          <div className="title-area">
            <img src="./favicon.ico" alt="Logo" className="logo" />
            <h1>616 ASCII STUDIO</h1>
          </div>
          
          <div className="settings-group">
            {/* 2-Column Grid */}
            <div className="settings-grid">
              
              <div className="setting-item">
                <div className="setting-header">
                  <label>Characters</label>
                  <span className="setting-value">{width}</span>
                </div>
                <input type="range" min="20" max="300" value={width} onChange={e => setWidth(Number(e.target.value))} />
              </div>

              <div className="setting-item">
                <div className="setting-header">
                  <label>Font Size</label>
                  <span className="setting-value">{fontSize}px</span>
                </div>
                <input type="range" min="4" max="24" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} />
              </div>

              <div className="setting-item">
                <div className="setting-header">
                  <label>Brightness</label>
                  <span className="setting-value">{brightness}%</span>
                </div>
                <input type="range" min="0" max="200" value={brightness} onChange={e => setBrightness(Number(e.target.value))} />
              </div>

              <div className="setting-item">
                <div className="setting-header">
                  <label>Contrast</label>
                  <span className="setting-value">{contrast}%</span>
                </div>
                <input type="range" min="0" max="200" value={contrast} onChange={e => setContrast(Number(e.target.value))} />
              </div>

              <div className="setting-item">
                <div className="setting-header">
                  <label>Saturation</label>
                  <span className="setting-value">{saturation}%</span>
                </div>
                <input type="range" min="0" max="200" value={saturation} onChange={e => setSaturation(Number(e.target.value))} />
              </div>

              <div className="setting-item">
                <div className="setting-header">
                  <label>Hue</label>
                  <span className="setting-value">{hue}°</span>
                </div>
                <input type="range" min="0" max="360" value={hue} onChange={e => setHue(Number(e.target.value))} />
              </div>

              <div className="setting-item">
                <div className="setting-header">
                  <label>Grayscale</label>
                  <span className="setting-value">{grayscale}%</span>
                </div>
                <input type="range" min="0" max="100" value={grayscale} onChange={e => setGrayscale(Number(e.target.value))} />
              </div>

              <div className="setting-item">
                <div className="setting-header">
                  <label>Sepia</label>
                  <span className="setting-value">{sepia}%</span>
                </div>
                <input type="range" min="0" max="100" value={sepia} onChange={e => setSepia(Number(e.target.value))} />
              </div>

              <div className="setting-item">
                <div className="setting-header">
                  <label>Space Density</label>
                  <span className="setting-value">{spaceDensity}%</span>
                </div>
                <input type="range" min="0" max="100" value={spaceDensity} onChange={e => setSpaceDensity(Number(e.target.value))} />
              </div>

              <label className="checkbox-item" style={{ marginTop: 'auto', marginBottom: '8px' }}>
                <input type="checkbox" checked={invert} onChange={e => setInvert(e.target.checked)} />
                Invert Colors
              </label>

              <div className="setting-item">
                <label className="checkbox-item" style={{ padding: '0', background: 'transparent' }}>
                  <input type="checkbox" checked={sharpness} onChange={e => setSharpness(e.target.checked)} />
                  Sharpness
                </label>
                <input type="range" min="1" max="10" value={sharpnessValue} onChange={e => setSharpnessValue(Number(e.target.value))} disabled={!sharpness} />
              </div>

              <div className="setting-item">
                <label className="checkbox-item" style={{ padding: '0', background: 'transparent' }}>
                  <input type="checkbox" checked={thresholding} onChange={e => setThresholding(e.target.checked)} />
                  Thresholding
                </label>
                <input type="range" min="0" max="255" value={thresholdValue} onChange={e => setThresholdValue(Number(e.target.value))} disabled={!thresholding} />
              </div>

              <div className="setting-item" style={{ gridColumn: '1 / -1' }}>
                <label className="checkbox-item" style={{ padding: '0', background: 'transparent' }}>
                  <input type="checkbox" checked={edgeDetection} onChange={e => setEdgeDetection(e.target.checked)} />
                  Edge Detection
                </label>
                <input type="range" min="1" max="5" value={edgeIntensity} onChange={e => setEdgeIntensity(Number(e.target.value))} disabled={!edgeDetection} />
              </div>

              <div className="setting-item" style={{ gridColumn: '1 / -1' }}>
                <label>Symbol Set</label>
                <select className="select-field" value={symbolSet} onChange={e => setSymbolSet(e.target.value)}>
                  {Object.keys(SYMBOL_SETS).map(key => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          <div className="actions">
            
            {/* Quick Actions Row */}
            <div className="actions-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
              <button className="btn btn-primary" onClick={handleCopyClipboard} disabled={mediaType === 'none'} title="Copy to Clipboard">
                <Clipboard size={16} />
              </button>
              <button className="btn btn-primary" onClick={handleSaveImage} disabled={mediaType === 'none'} title="Save as PNG">
                <Save size={16} />
              </button>
              <label className="btn btn-primary" title="Open Media">
                <Upload size={16} />
                <input type="file" accept="image/*,video/*" hidden onChange={handleFileUpload} />
              </label>
              <button className="btn" onClick={resetFilters} title="Reset Filters">
                <RotateCcw size={16} />
              </button>
            </div>

            {/* Media Row */}
            <div className="actions-row">
              <button className="btn" onClick={mediaType === 'webcam' ? stopWebcam : startWebcam}>
                <Camera size={16} />
                {mediaType === 'webcam' ? 'Stop' : 'Webcam'}
              </button>
              
              <button className="btn" onClick={toggleRecording} disabled={mediaType === 'none' || isProcessingVideo} style={{ backgroundColor: isRecording || isProcessingVideo ? 'var(--accent-color)' : '', color: isRecording || isProcessingVideo ? '#000' : '' }}>
                <Video size={16} />
                {mediaType === 'video' ? (isProcessingVideo ? `Saving ${videoProgress}%` : 'Save Video') : (isRecording ? 'Stop' : 'Record')}
              </button>
            </div>

          </div>
        </div>

        {/* Main Content */}
        <div className="main-content glass-panel">
          <div className="preview-container">
            {mediaType === 'none' ? (
              <div className="empty-state">
                <ImageIcon size={64} />
                <h2>No Media Loaded</h2>
                <p>Drag & drop an image/video here or open from menu.</p>
              </div>
            ) : (
              <canvas 
                ref={canvasRef} 
                className="preview-canvas" 
                onClick={toggleVideoPlayPause} 
                style={{ cursor: mediaType === 'video' ? 'pointer' : 'default' }}
              />
            )}
            <video ref={videoRef} className="hidden-video" muted playsInline />
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
