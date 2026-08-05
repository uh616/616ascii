export const SYMBOL_SETS: Record<string, string> = {
  "Default": "@%#*+=-:. ,;:o*%@#&$M0W8B8W#@ ",
  "Extended": "@%#*+=-:. ,;:o*%@#&$M0W8B8W#@▒▓▄▌▀▐▌▐▄",
  "Alphabetic": "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  "Alphanumeric": "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  "Gray Scale": "@#S%?*+;:,. ",
  "Arrow": "↑↓→←↔↕⇄⇅⇆⇇⇈⇉⇊⇋⇌⇍⇎⇏",
  "Code Page 437": "░▒▓█▄▀─│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪■",
  "Extended High": " .:-=+*#%@█",
  "Minimalist": ".#+- ",
  "Math Symbols": "+-*/=<>(){}[]∑∫∆π∞≈≠≤≥÷×√±∂∇∝",
  "Normal": "@%#*+=-:. ",
  "Normal 2": "█▓▒░ .:-=+*#%",
  "Numerical": "0123456789",
  "Max": "█▓▒░@%#*+=-:.ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ",
  "JAPAN": "ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをんゔゕゖゝゞァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミリルレロヮワヰヱヲンヴヵヶヷヸヹヺｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝﾞﾟ㋿㍻㍼㍽㍾゛゜・ーヽヾヿ㍐㍿※",
  "CYRILLIC": "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя",
  // Emoji string needs to be handled via array because of unicode surrogate pairs
};

// Properly split string including surrogate pairs (emojis)
export const splitSymbols = (symbolStr: string): string[] => {
  return Array.from(symbolStr);
};

export const EMOJI_SET = ["😃","😄","😁","😆","😅","😂","🤣","😎","😜","🤩","✨","⭐","🔥","💀","👀","🕶","🎵","🎶","🎤","🎸","🎮","🕹"];

export interface AsciiOptions {
  width: number;
  scaleFactor: number;
  invert: boolean;
  symbolSetName: string;
  randomizationPercentage: number;
  fontSize: number;
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  grayscale: number;
  sepia: number;
  thresholding: boolean;
  thresholdValue: number;
  edgeDetection: boolean;
  edgeIntensity: number;
  sharpness: boolean;
  sharpnessValue: number;
  spaceDensity: number;
}

// Helper: Apply 3x3 convolution kernel
function applyConvolution(data: Uint8ClampedArray, width: number, height: number, kernel: number[]) {
  const side = Math.round(Math.sqrt(kernel.length));
  const halfSide = Math.floor(side / 2);
  const src = new Uint8ClampedArray(data);
  const w = width;
  const h = height;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dstOff = (y * w + x) * 4;
      let r = 0, g = 0, b = 0;
      
      for (let cy = 0; cy < side; cy++) {
        for (let cx = 0; cx < side; cx++) {
          const scy = y + cy - halfSide;
          const scx = x + cx - halfSide;
          if (scy >= 0 && scy < h && scx >= 0 && scx < w) {
            const srcOff = (scy * w + scx) * 4;
            const wt = kernel[cy * side + cx];
            r += src[srcOff] * wt;
            g += src[srcOff + 1] * wt;
            b += src[srcOff + 2] * wt;
          }
        }
      }
      data[dstOff] = r;
      data[dstOff + 1] = g;
      data[dstOff + 2] = b;
    }
  }
}

export function imageToAsciiCanvas(
  ctx: CanvasRenderingContext2D,
  imageObj: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  options: AsciiOptions
): void {
  const { 
    width, scaleFactor, invert, symbolSetName, randomizationPercentage, fontSize,
    brightness, contrast, saturation, hue, grayscale, sepia,
    thresholding, thresholdValue, edgeDetection, edgeIntensity, sharpness, sharpnessValue, spaceDensity 
  } = options;

  let symbols: string[];
  if (symbolSetName === "EMOJI") {
    symbols = EMOJI_SET;
  } else {
    symbols = splitSymbols(SYMBOL_SETS[symbolSetName] || SYMBOL_SETS["Extended"]);
  }

  // Calculate new dimensions
  const newWidth = Math.floor(width * scaleFactor);
  
  let originalWidth = 1;
  let originalHeight = 1;
  
  if (imageObj instanceof HTMLVideoElement) {
    originalWidth = imageObj.videoWidth;
    originalHeight = imageObj.videoHeight;
  } else if (imageObj instanceof HTMLImageElement) {
    originalWidth = imageObj.naturalWidth;
    originalHeight = imageObj.naturalHeight;
  } else if (imageObj instanceof HTMLCanvasElement) {
    originalWidth = imageObj.width;
    originalHeight = imageObj.height;
  }

  // Prevent crash if image/video is not yet loaded
  if (!originalWidth || !originalHeight || isNaN(originalWidth) || isNaN(originalHeight)) {
    return;
  }

  const aspect = originalHeight / originalWidth;
  
  // Terminal characters are usually taller than they are wide.
  // We use 0.5 to 0.7 aspect correction depending on font.
  const aspectCorrection = 0.6;
  const newHeight = Math.floor(newWidth * aspect * aspectCorrection);

  if (newWidth <= 0 || newHeight <= 0) return;

  // Offscreen canvas for getting image data
  const offCanvas = document.createElement("canvas");
  offCanvas.width = newWidth;
  offCanvas.height = newHeight;
  const offCtx = offCanvas.getContext("2d", { willReadFrequently: true });
  if (!offCtx) return;

  // Apply CSS filters first (hardware accelerated)
  offCtx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hue}deg) grayscale(${grayscale}%) sepia(${sepia}%)`;
  
  offCtx.drawImage(imageObj, 0, 0, newWidth, newHeight);
  const imgData = offCtx.getImageData(0, 0, newWidth, newHeight);
  let data = imgData.data;

  // Apply Convolution Filters if enabled
  if (sharpness) {
    const s = sharpnessValue / 2;
    const sharpenKernel = [
      0, -s, 0,
      -s, 1 + 4*s, -s,
      0, -s, 0
    ];
    applyConvolution(data, newWidth, newHeight, sharpenKernel);
  }

  if (edgeDetection) {
    const e = edgeIntensity;
    const edgeKernel = [
      -e, -e, -e,
      -e, 8*e, -e,
      -e, -e, -e
    ];
    applyConvolution(data, newWidth, newHeight, edgeKernel);
  }

  // Render to target canvas
  const charHeight = fontSize;
  const charWidth = fontSize * aspectCorrection;
  
  const targetWidth = newWidth * charWidth;
  const targetHeight = newHeight * charHeight;
  
  const targetCanvas = ctx.canvas;
  if (targetCanvas.width !== targetWidth || targetCanvas.height !== targetHeight) {
    targetCanvas.width = targetWidth;
    targetCanvas.height = targetHeight;
  }

  ctx.fillStyle = "#030303"; // Match app background
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  
  ctx.fillStyle = "#ffffff";
  // Bold font helps visibility
  ctx.font = `600 ${fontSize}px "Courier New", monospace`;
  ctx.textBaseline = "top";

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const idx = (y * newWidth + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      // Calculate grayscale
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;
      
      if (thresholding) {
        gray = gray > thresholdValue ? 255 : 0;
      }

      if (invert) {
        gray = 255 - gray;
      }

      // Space Density (inject empty spaces to sparse the art)
      if (spaceDensity > 0 && Math.random() * 100 < spaceDensity) {
        continue;
      }

      // Determine character
      let charIdx = Math.floor((gray / 255) * (symbols.length - 1));
      let char = symbols[charIdx];

      // Randomization
      if (char !== ' ' && Math.random() * 100 < randomizationPercentage) {
        char = symbols[Math.floor(Math.random() * symbols.length)];
      }

      ctx.fillText(char, x * charWidth, y * charHeight);
    }
  }
}
