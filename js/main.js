import ColorPicker from "./lib/color-picker.js";
import Frag from "./lib/frag.js";
import { parseDegree } from "./lib/parse-degree.js";
import { calcAzimuth, haversine } from "./lib/sphere-math.js";
import { D180, D360, D90, DEG } from "./lib/trig.js";

const canvas = document.querySelector('canvas');
const lopArr = [];

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
	lat=-25.5, lon=-54.5, rad=1, azm=45, color=#07f
`.trim().split('\n').map(line => line.trim()).join('\n');

const textarea = document.querySelector('textarea');
textarea.value = defInput;

const loadInput = () => {
	lopArr.length = 0;
	const lines = textarea.value.split('\n');
	for (let line of lines) {
		line = line.trim();
		if (line === '') continue;
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
	console.log(lopArr);
};

loadInput();

const frag = new Frag({
	canvas,
	fragColor: (x, y) => {
		if (x < 0 || x > 1 || y < 0 || y > 1) {
			return '#000';
		}
		const coord = [ y*D180 - D90, x*D360 - D180 ];
		for (const lop of lopArr) {
			if (lop.rad !== null) {
				const rad = haversine(coord, lop.latLon);
				const err = Math.abs(lop.rad - rad);
				if (err <= lop.dif) {
					return lop.color;
				}
			}
			if (lop.azm !== null) {
				const azm = calcAzimuth(coord, lop.latLon);
				const err = Math.abs(lop.azm - azm);
				if (err <= lop.dif) {
					return lop.color;
				}
			}
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
