/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 360), [0, 100], and [0, 100] respectively
 * and returns rgb in the set [0, 255].
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The lightness
 * @return  {string}          The RGB representation in "rgb(R, G, B)" format
 */
function hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

/**
 * Generates a random HSL color within the green, cyan, and blue spectrum
 * and provides a base color along with a few shades for forecast variations.
 * The hue is constrained to a range (120-300) to ensure colors are within
 * the desired green, cyan, and blue families.
 *
 * @returns {object} An object containing the base color and an array of forecast shades.
 * { base: string, forecastShades: string[] }
 */
export function generateRandomSeriesColor() {
    const h = Math.floor(Math.random() * (300 - 120 + 1)) + 120;
    const s = Math.floor(Math.random() * 30) + 70; 
    const l = Math.floor(Math.random() * 20) + 50; 

    const baseColor = hslToRgb(h, s, l);

    const forecastShades = [];
    forecastShades.push(hslToRgb(h, s, Math.max(0, l - 15))); 
    forecastShades.push(hslToRgb(h, s, Math.min(100, l + 15))); 
    forecastShades.push(hslToRgb(h, Math.max(0, s - 20), l)); 

    return { base: baseColor, forecastShades: forecastShades };
}