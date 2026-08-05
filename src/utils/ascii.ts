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
}

export function imageToAsciiCanvas(
  ctx: CanvasRenderingContext2D,
  imageObj: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  options: AsciiOptions
): void {
  const { width, scaleFactor, invert, symbolSetName, randomizationPercentage, fontSize } = options;

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

  offCtx.drawImage(imageObj, 0, 0, newWidth, newHeight);
  const imgData = offCtx.getImageData(0, 0, newWidth, newHeight);
  const data = imgData.data;

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
      
      if (invert) {
        gray = 255 - gray;
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
