import ColorPicker from "./lib/color-picker.js";
import Frag from "./lib/frag.js";
import { parseDegree } from "./lib/parse-degree.js";
import { calcAzimuth, haversine } from "./lib/sphere-math.js";
import { D180, D360, D90, DEG } from "./lib/trig.js";

const canvas = document.querySelector('canvas');
const lopArr = [];
let minErrDif = 0;
let minErrColor = '#fff';

const parseDegToRadian = (string) => {
	return parseDegree(string)/180*Math.PI;
};

const loadImage = (src) => new Promise((done, fail) => {
	const img = document.createElement('img');
	img.onerror = fail;
	img.onload = () => {
		done(img);
	};
	img.src = src;
});

const img = await loadImage('img/map.jpg');
const colorPicker = new ColorPicker(img);

const defInput = `
	lat=45 23 15.5 N, lon=12 30 42.0 W, rad=71 42 11,  dif=0.5, color=#07f
	lat=30 57 16.7 S, lon=63 15 22.3 E, azm=183 23 10, dif=0.5, color=#f70
	min-err dif=1, color=#fff
`.trim().split('\n').map(line => line.trim()).join('\n');

const textarea = document.querySelector('textarea');
textarea.value = defInput;

const loadInput = () => {
	lopArr.length = 0;
	const lines = textarea.value.split('\n');
	minErrDif = 0;
	minErrColor = '#fff';
	for (let line of lines) {
		line = line.trim();
		if (line === '') continue;
		if (line.startsWith('min-err')) {
			line = line.replace('min-err', '').trim();
			line.split(/\s*,\s*/).forEach(pair => {
				const [ key, val ] = pair.split(/\s*=\s*/);
				if (key === 'dif') {
					minErrDif = parseDegToRadian(val);
				}
				if (key === 'color') {
					minErrColor = val;
				}
			});
			continue;
		}
		const input = {
			latLon: [ NaN, NaN ],
			rad: null,
			azm: null,
			color: '#fff',
		};
		line.split(/\s*,\s*/).forEach((item) => {
			const [ key, val ] = item.split(/\s*=\s*/);
			if (key === 'lat') input.latLon[0] = parseDegToRadian(val);
			if (key === 'lon') input.latLon[1] = parseDegToRadian(val);
			if (key === 'rad') input.rad = parseDegToRadian(val);
			if (key === 'azm') input.azm = parseDegToRadian(val);
			if (key === 'dif') input.dif = parseDegToRadian(val);
			if (key === 'color') input.color = val;
		});
		lopArr.push(input);
	}
};

loadInput();

const frag = new Frag({
	canvas,
	fragColor: (x, y) => {
		if (x < 0 || x > 1 || y < 0 || y > 1) {
			return '#000';
		}
		const coord = [ y*D180 - D90, x*D360 - D180 ];
		let sumErr = 0;
		let errCount = 0;
		let color = null;
		for (const lop of lopArr) {
			if (lop.rad !== null) {
				const rad = haversine(coord, lop.latLon);
				const err = Math.abs(lop.rad - rad);
				sumErr += err**2;
				errCount ++;
				if (err <= lop.dif) {
					color = lop.color;
				}
			}
			if (lop.azm !== null) {
				const azm = calcAzimuth(coord, lop.latLon);
				const err = Math.abs(lop.azm - azm);
				sumErr += err**2;
				errCount ++;
				if (err <= lop.dif) {
					color = lop.color;
				}
			}
		}
		if (minErrDif !== 0 && errCount !== 0) {
			const error = Math.sqrt(sumErr/errCount);
			if (error < minErrDif) {
				return minErrColor;
			}
		}
		if (color !== null) {
			return color;
		}
		const col = x*img.width|0;
		const row = (1 - y)*img.height|0;
		return colorPicker.getRgbString(row, col);
	},
});

frag.bindMove();
frag.bindZoom();

textarea.oninput = () => {
	loadInput();
	frag.render();
};

canvas.addEventListener('dblclick', e => {
	const x = e.offsetX;
	const y = e.offsetY;
	const [ nx, ny ] = frag.valueOf(x, y);
	const lat = ny*D180 - D90;
	const lon = nx*D360 - D180;
	document.querySelector('input').value = [ lat, lon ].map(val => val/Math.PI*180);
});
