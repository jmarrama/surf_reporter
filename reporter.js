var page = require('webpage').create();

var wind_speed;
var wind_dir;
var wind_dir_deg;
var wave_height;
var surfline_rating;

function extract_surfline_data(height_str, rating_str)
{
	// first, extract height as the average of the possible range
	var matches = height_str.match(/\d{1,2}/g);
	if (matches[0] && matches[1]) {
		console.log(matches[0] + "\t" + matches[1]);
		wave_height = (matches[0] + matches[1])/2;
	} else {
		console.err("Data extraction for surfline wave height failed!");
	}
}

function extract_obkc_data(data)
{
	// extract the weather data with regex hack!
	var obkc_regex = /F\s*\|\s*(.*)\s*\((\d*).*@\s*(.{1,5})\smph/;
	var matches = data.match(obkc_regex);
	if (matches) {
		console.log("direction: " + matches[1] + "\t" + matches[2]);
		console.log("speed: " + matches[3]);
		wind_speed = matches[3];
		wind_dir = matches[1];
		wind_dir_deg = matches[2];
	} else {
		console.err("Data extraction failed for ob-kc!");
	}
}

page.open("http://www.ob-kc.com/images/wx2.html", function (status) {

	if (status === 'fail') {
		console.err("Failed fetching ob-kc!");
	} else {
		var data = page.evaluate(function () {
			return document.querySelector('span.style16').innerText;
		});
		extract_obkc_data(data);
	}

	// onto surfline!
	page.open("http://www.surfline.com/surf-report/south-ocean-beach-central-california_4128/", function (status) {
		if (status === 'fail') {
			console.err("Failed fetching surfline!");
		} else {
			var report = page.evaluate(function () {
				return [document.querySelector('#observed-spot-conditions').innerText, document.querySelector('#observed-wave-range').innerText];
			});
			console.log("surfline data: " + report[0] + "\t" + report[1]);
			extract_surfline_data(report[1], report[0]);
		}
		page.close();
		phantom.exit();
	});
});

