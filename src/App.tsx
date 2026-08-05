import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Save, Settings, Video, Image as ImageIcon } from 'lucide-react';
import './App.css';
import { SYMBOL_SETS, imageToAsciiCanvas } from './utils/ascii';

type MediaType = 'none' | 'image' | 'video' | 'webcam';

function App() {
  const [mediaType, setMediaType] = useState<MediaType>('none');
  const [width, setWidth] = useState<number>(120);
  const [scaleFactor, setScaleFactor] = useState<number>(1.0);
  const [invert, setInvert] = useState<boolean>(false);
  const [symbolSet, setSymbolSet] = useState<string>('Extended');
  const [randomPercent, setRandomPercent] = useState<number>(5);
  const [fontSize, setFontSize] = useState<number>(10);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(new Image());
  const animationRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);

  // Core drawing function
  const drawFrame = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    if (mediaType === 'image' && imageRef.current.src) {
      imageToAsciiCanvas(ctx, imageRef.current, {
        width, scaleFactor, invert, symbolSetName: symbolSet, randomizationPercentage: randomPercent, fontSize
      });
    } else if ((mediaType === 'video' || mediaType === 'webcam') && videoRef.current) {
      if (videoRef.current.readyState >= 2) {
        imageToAsciiCanvas(ctx, videoRef.current, {
          width, scaleFactor, invert, symbolSetName: symbolSet, randomizationPercentage: randomPercent, fontSize
        });
      }
      animationRef.current = requestAnimationFrame(drawFrame);
    }
  };

  // Re-draw when settings change (for images mostly)
  useEffect(() => {
    if (mediaType === 'image') {
      drawFrame();
    }
  }, [width, scaleFactor, invert, symbolSet, randomPercent, fontSize, mediaType]);

  // Handle Video / Webcam loop
  useEffect(() => {
    if (mediaType === 'video' || mediaType === 'webcam') {
      animationRef.current = requestAnimationFrame(drawFrame);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [mediaType, width, scaleFactor, invert, symbolSet, randomPercent, fontSize]);

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    
    if (file.type.startsWith('video/')) {
      stopWebcam();
      setMediaType('video');
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.loop = true;
        videoRef.current.play();
      }
    } else if (file.type.startsWith('image/')) {
      stopWebcam();
      setMediaType('image');
      imageRef.current.src = url;
      imageRef.current.onload = () => {
        drawFrame();
      };
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const [isDragging, setIsDragging] = useState(false);

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

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

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

  const toggleRecording = () => {
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
        };
        reader.readAsDataURL(blob);
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
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
            <h1>616 ASCII</h1>
          </div>
          
          <div className="settings-group">
            <div className="setting-item">
              <label>Symbol Set</label>
              <select className="select-field" value={symbolSet} onChange={e => setSymbolSet(e.target.value)}>
                {Object.keys(SYMBOL_SETS).map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>

            <div className="setting-item">
              <label>Width (chars: {width})</label>
              <input type="range" min="20" max="300" value={width} onChange={e => setWidth(Number(e.target.value))} />
            </div>

            <div className="setting-item">
              <label>Scale Factor: {scaleFactor}</label>
              <input type="range" min="0.1" max="3.0" step="0.1" value={scaleFactor} onChange={e => setScaleFactor(Number(e.target.value))} />
            </div>
            
            <div className="setting-item">
              <label>Font Size: {fontSize}px</label>
              <input type="range" min="4" max="24" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} />
            </div>

            <div className="setting-item">
              <label>Random Noise: {randomPercent}%</label>
              <input type="range" min="0" max="100" value={randomPercent} onChange={e => setRandomPercent(Number(e.target.value))} />
            </div>

            <label className="checkbox-item">
              <input type="checkbox" checked={invert} onChange={e => setInvert(e.target.checked)} />
              Invert Colors
            </label>
          </div>

          <div className="actions">
            <label className="btn btn-primary">
              <Upload size={18} />
              Open Media
              <input type="file" accept="image/*,video/*" hidden onChange={handleFileUpload} />
            </label>
            
            <button className="btn" onClick={mediaType === 'webcam' ? stopWebcam : startWebcam}>
              <Camera size={18} />
              {mediaType === 'webcam' ? 'Stop Webcam' : 'Use Webcam'}
            </button>

            <button className="btn" onClick={handleSaveImage} disabled={mediaType === 'none'}>
              <Save size={18} />
              Save Image (PNG)
            </button>
            
            <button className="btn" onClick={toggleRecording} disabled={mediaType === 'none'} style={{ backgroundColor: isRecording ? '#ff3366' : '' }}>
              <Video size={18} />
              {isRecording ? 'Stop & Save Video' : 'Record Video'}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content glass-panel">
          <div className="preview-container">
            {mediaType === 'none' ? (
              <div className="empty-state">
                <ImageIcon size={64} />
                <h2>No Media Loaded</h2>
                <p>Open an image, video, or start the webcam.</p>
              </div>
            ) : (
              <canvas ref={canvasRef} className="preview-canvas" />
            )}
            <video ref={videoRef} className="hidden-video" muted playsInline />
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
