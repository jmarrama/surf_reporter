var page = require('webpage').create();

var wind_speed;
var wind_dir;
var wind_dir_deg;
var wave_height;
var surfline_rating;

function analyze_data()
{
	console.log("wind speed and dir:");
	console.log(wind_speed +" mph from " +wind_dir + " " + wind_dir_deg);
	console.log("wave height\t"+wave_height+"\tsurfline rating\t" + surfline_rating);

}

function extract_surfline_data(height_str, rating_str)
{
	// first, extract height as the average of the possible range
	var matches = height_str.match(/\d{1,2}/g);
	if (matches[0] && matches[1]) {
		wave_height = (parseInt(matches[0]) + parseInt(matches[1]))/2;
	} else if (matches[0]) {
		wave_height = parseInt(matches[0]);
	} else {
		console.err("Data extraction for surfline wave height failed!");
	}

	if (rating_str.match(/epic/i)) {
		surfline_rating = 3;
	} else if (rating_str.match(/good/i)) {
		surfline_rating = 2;
	} else if (rating_str.match(/fair/i)) {
		surfline_rating = 1;
	} else {
		surfline_rating = 0;
	}
}

function extract_obkc_data(data)
{
	// extract the weather data with regex hack!
	var obkc_regex = /F\s*\|\s*(.*)\s*\((\d*).*@\s*(.{1,5})\smph/;
	var matches = data.match(obkc_regex);
	if (matches) {
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
			extract_surfline_data(report[1], report[0]);
			analyze_data();
		}
		page.close();
		phantom.exit();
	});
});

